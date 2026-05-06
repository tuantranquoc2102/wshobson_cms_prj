#!/usr/bin/env bash
# Local dev cron loop: invokes the scheduled-publish endpoint every 60s.
# Stop with Ctrl-C. Not for production use.
set -u

INTERVAL="${CRON_INTERVAL_SECONDS:-60}"

while true; do
  npm run --silent cron:publish || echo "[cron-loop] publish failed (continuing)"
  sleep "$INTERVAL"
done
