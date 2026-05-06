# Local dev cron loop: invokes the scheduled-publish endpoint every 60s.
# Stop with Ctrl-C. Not for production use.

$ErrorActionPreference = 'Continue'
$interval = if ($env:CRON_INTERVAL_SECONDS) { [int]$env:CRON_INTERVAL_SECONDS } else { 60 }

while ($true) {
    npm run --silent cron:publish
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[cron-loop] publish failed (continuing)"
    }
    Start-Sleep -Seconds $interval
}
