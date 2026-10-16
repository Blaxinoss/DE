param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$TargetDatabaseUrl = $env:RESTORE_DATABASE_URL
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql was not found on PATH."
}

$resolvedBackupPath = [IO.Path]::GetFullPath($BackupPath)
if (-not (Test-Path -LiteralPath $resolvedBackupPath -PathType Leaf)) {
  throw "Backup file not found: $resolvedBackupPath"
}

if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
  $TargetDatabaseUrl = Read-Host "Paste the NEW disposable Supabase project connection string"
}

if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
  throw "A target database connection string is required."
}

Write-Warning "This imports the full backup into the target database. Never use the production project as the target."
$confirmation = Read-Host "Type RESTORE to continue"

if ($confirmation -cne "RESTORE") {
  throw "Restore cancelled."
}

$logPath = "$resolvedBackupPath.restore.log"
Write-Host "Restoring the full database backup..."

& psql `
  --dbname $TargetDatabaseUrl `
  --file $resolvedBackupPath `
  2>&1 | Tee-Object -FilePath $logPath

if ($LASTEXITCODE -ne 0) {
  throw "psql failed with exit code $LASTEXITCODE. See $logPath"
}

Write-Host "Restore command completed."
Write-Host "Log: $logPath"
Write-Host "Verify Auth users and application tables in the target Supabase dashboard."
