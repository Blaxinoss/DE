param(
  [string]$DatabaseUrl = $env:SUPABASE_DB_URL,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$managedSchemas = "information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault"
$dataExcludedSchemas = "information_schema|pg_*|graphql|graphql_public|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault|etl|extensions|pgbouncer|realtime|supabase_migrations|_analytics|_realtime|_supavisor"
$reservedRoles = "anon|authenticated|authenticator|cli_login_.*|dashboard_user|pgbouncer|postgres|service_role|supabase_.*|pgsodium_keyholder|pgsodium_keyiduser|pgsodium_keymaker|pgtle_admin"
$internalAclSchemas = "information_schema|pg_[^`"]*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_[^`"]*|_timescaledb_[^`"]*|topology|vault"
$utf8WithoutBom = [Text.UTF8Encoding]::new($false)

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found on PATH."
  }
}

function Assert-LastCommand([string]$Step) {
  if ($LASTEXITCODE -ne 0) {
    throw "$Step failed with exit code $LASTEXITCODE."
  }
}

function Write-FilteredRoles([string]$InputPath, [string]$OutputPath) {
  $reader = [IO.File]::OpenText($InputPath)
  $writer = [IO.StreamWriter]::new($OutputPath, $false, $utf8WithoutBom)
  $previousLine = $null

  try {
    while (($line = $reader.ReadLine()) -ne $null) {
      if ($line -match '^\\(un)?restrict ' -or $line -match '^--') { continue }
      if ($line -match "^CREATE ROLE `"($reservedRoles)`"") { continue }
      if ($line -match "^ALTER ROLE `"($reservedRoles)`"") { continue }
      if ($line -match "^GRANT `".*`" TO `"($reservedRoles)`"") { continue }
      if ($line -match "^(GRANT|REVOKE) SET ON PARAMETER .+ TO `"($reservedRoles)`"") { continue }

      $line = $line -replace ' (NOSUPERUSER|NOREPLICATION)', ''
      if ($line -eq $previousLine) { continue }

      $writer.WriteLine($line)
      $previousLine = $line
    }

    $writer.WriteLine("RESET ALL;")
  }
  finally {
    $reader.Dispose()
    $writer.Dispose()
  }
}

function Write-CompatibleSchema([string]$InputPath, [string]$OutputPath) {
  $reader = [IO.File]::OpenText($InputPath)
  $writer = [IO.StreamWriter]::new($OutputPath, $false, $utf8WithoutBom)

  try {
    while (($line = $reader.ReadLine()) -ne $null) {
      if ($line -match '^\\(un)?restrict ') { continue }
      if ($line -eq 'SET transaction_timeout = 0;') { continue }
      if ($line -match '^CREATE PUBLICATION "supabase_realtime') { continue }
      if ($line -match '^ALTER PUBLICATION "supabase_realtime_') { continue }
      if ($line -match '^CREATE EVENT TRIGGER ') { continue }
      if ($line -match '^\s+WHEN TAG IN ') { continue }
      if ($line -match '^\s+EXECUTE FUNCTION ') { continue }
      if ($line -match '^ALTER EVENT TRIGGER ') { continue }
      if ($line -match '^COMMENT ON EXTENSION ') { continue }
      if ($line -match '^ALTER FOREIGN DATA WRAPPER .+ OWNER TO ') { continue }
      if ($line -match '^ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"') { continue }
      if ($line -match "^(GRANT|REVOKE) .+ ON .+ `"($internalAclSchemas)`"\.") { continue }
      if ($line -match '^GRANT ALL ON FOREIGN DATA WRAPPER .+ TO "postgres" WITH GRANT OPTION') { continue }

      $line = $line -replace '^CREATE SCHEMA "', 'CREATE SCHEMA IF NOT EXISTS "'
      $line = $line -replace '^CREATE TABLE "', 'CREATE TABLE IF NOT EXISTS "'
      $line = $line -replace '^CREATE SEQUENCE "', 'CREATE SEQUENCE IF NOT EXISTS "'
      $line = $line -replace '^CREATE VIEW "', 'CREATE OR REPLACE VIEW "'
      $line = $line -replace '^CREATE FUNCTION "', 'CREATE OR REPLACE FUNCTION "'
      $line = $line -replace '^CREATE TRIGGER "', 'CREATE OR REPLACE TRIGGER "'

      $writer.WriteLine($line)
    }
  }
  finally {
    $reader.Dispose()
    $writer.Dispose()
  }
}

Require-Command "pg_dump"
Require-Command "pg_dumpall"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  $DatabaseUrl = Read-Host "Paste the SOURCE Supabase Session pooler PostgreSQL URI"
}

if ($DatabaseUrl -notmatch '^postgres(ql)?://') {
  throw "Use the PostgreSQL Session pooler URI from Supabase Connect."
}

$backupRoot = [IO.Path]::GetFullPath($OutputDirectory)
$backupDirectory = Join-Path $backupRoot ((Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

$rolesFile = Join-Path $backupDirectory "roles.sql"
$schemaFile = Join-Path $backupDirectory "schema.sql"
$dataFile = Join-Path $backupDirectory "data.sql"
$historySchemaFile = Join-Path $backupDirectory "history_schema.sql"
$historyDataFile = Join-Path $backupDirectory "history_data.sql"
$rawRolesFile = Join-Path $backupDirectory "roles.raw.sql"
$rawSchemaFile = Join-Path $backupDirectory "schema.raw.sql"
$rawHistorySchemaFile = Join-Path $backupDirectory "history_schema.raw.sql"

$previousSslMode = $env:PGSSLMODE
$env:PGSSLMODE = "require"

try {
  Write-Host "1/5 Dumping custom roles..."
  & pg_dumpall `
    --dbname $DatabaseUrl `
    --roles-only `
    --role "postgres" `
    --quote-all-identifiers `
    --no-role-passwords `
    --no-comments `
    --file $rawRolesFile
  Assert-LastCommand "Roles dump"
  Write-FilteredRoles $rawRolesFile $rolesFile

  Write-Host "2/5 Dumping application schema..."
  & pg_dump `
    --dbname $DatabaseUrl `
    --schema-only `
    --quote-all-identifiers `
    --role "postgres" `
    --exclude-schema $managedSchemas `
    --no-owner `
    --no-subscriptions `
    --no-publications `
    --file $rawSchemaFile
  Assert-LastCommand "Schema dump"
  Write-CompatibleSchema $rawSchemaFile $schemaFile

  Write-Host "3/5 Dumping application, Auth, and Storage data..."
  & pg_dump `
    --dbname $DatabaseUrl `
    --data-only `
    --quote-all-identifiers `
    --role "postgres" `
    --exclude-schema $dataExcludedSchemas `
    --exclude-table "auth.schema_migrations" `
    --exclude-table "storage.migrations" `
    --exclude-table "supabase_functions.migrations" `
    --exclude-table "storage.buckets_vectors" `
    --exclude-table "storage.vector_indexes" `
    --schema "*" `
    --no-owner `
    --no-privileges `
    --no-subscriptions `
    --file $dataFile
  Assert-LastCommand "Data dump"

  Write-Host "4/5 Dumping migration-history schema..."
  & pg_dump `
    --dbname $DatabaseUrl `
    --schema-only `
    --schema "supabase_migrations" `
    --quote-all-identifiers `
    --role "postgres" `
    --no-owner `
    --no-privileges `
    --file $rawHistorySchemaFile
  Assert-LastCommand "Migration-history schema dump"
  Write-CompatibleSchema $rawHistorySchemaFile $historySchemaFile

  Write-Host "5/5 Dumping migration-history data..."
  & pg_dump `
    --dbname $DatabaseUrl `
    --data-only `
    --schema "supabase_migrations" `
    --quote-all-identifiers `
    --role "postgres" `
    --no-owner `
    --no-privileges `
    --file $historyDataFile
  Assert-LastCommand "Migration-history data dump"

  Remove-Item -LiteralPath $rawRolesFile, $rawSchemaFile, $rawHistorySchemaFile -Force

  Write-Host "Backup created successfully:"
  Write-Host $backupDirectory
  Write-Host "It includes application data, Auth users, Storage metadata, and migration history."
  Write-Warning "Storage object files and Supabase project settings are not stored inside PostgreSQL."
}
finally {
  if ($null -eq $previousSslMode) {
    Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
  }
  else {
    $env:PGSSLMODE = $previousSslMode
  }
}
