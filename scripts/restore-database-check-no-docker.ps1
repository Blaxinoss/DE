param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDirectory,
  [string]$TargetDatabaseUrl = $env:RESTORE_DATABASE_URL
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql was not found on PATH."
}

$backupPath = [IO.Path]::GetFullPath($BackupDirectory)
$requiredFiles = @(
  "roles.sql",
  "schema.sql",
  "data.sql",
  "history_schema.sql",
  "history_data.sql"
)

foreach ($fileName in $requiredFiles) {
  $filePath = Join-Path $backupPath $fileName
  if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
    throw "Backup file is missing: $filePath"
  }
}

if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
  $TargetDatabaseUrl = Read-Host "Paste the NEW disposable Supabase Session pooler PostgreSQL URI"
}

if ($TargetDatabaseUrl -notmatch '^postgres(ql)?://') {
  throw "Use the PostgreSQL Session pooler URI from the new Supabase project."
}

Write-Warning "This writes to the target database. Use a new disposable Supabase project, never production."
$confirmation = Read-Host "Type RESTORE-TEST to continue"
if ($confirmation -cne "RESTORE-TEST") {
  throw "Restore cancelled."
}

$previousSslMode = $env:PGSSLMODE
$env:PGSSLMODE = "require"

try {
  Write-Host "Restoring roles, application schema, Auth users, Storage metadata, and application data..."
  $mainRestoreArguments = @(
    "--no-psqlrc",
    "--single-transaction",
    "--variable", "ON_ERROR_STOP=1",
    "--file", (Join-Path $backupPath "roles.sql"),
    "--file", (Join-Path $backupPath "schema.sql"),
    "--command", "SET session_replication_role = replica;",
    "--file", (Join-Path $backupPath "data.sql"),
    "--dbname", $TargetDatabaseUrl
  )
  & psql @mainRestoreArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Main restore failed with exit code $LASTEXITCODE. The transaction was rolled back."
  }

  Write-Host "Restoring Supabase migration history..."
  $historyRestoreArguments = @(
    "--no-psqlrc",
    "--single-transaction",
    "--variable", "ON_ERROR_STOP=1",
    "--file", (Join-Path $backupPath "history_schema.sql"),
    "--file", (Join-Path $backupPath "history_data.sql"),
    "--dbname", $TargetDatabaseUrl
  )
  & psql @historyRestoreArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Migration-history restore failed with exit code $LASTEXITCODE."
  }

  Write-Host "Restore completed successfully."
  Write-Host "Verify users in Authentication > Users and run the app against the disposable project."
}
finally {
  if ($null -eq $previousSslMode) {
    Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
  }
  else {
    $env:PGSSLMODE = $previousSslMode
  }
}
