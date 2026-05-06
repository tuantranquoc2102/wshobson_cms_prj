/**
 * Local cron worker — POSTs to the scheduled-publish endpoint with the
 * shared `x-cron-secret` header. Run via `npm run cron:publish` or from a
 * scheduler of your choice (cron, Task Scheduler, OS launchd).
 */
async function main(): Promise<void> {
  const url =
    process.env.CRON_TARGET_URL ??
    'http://localhost:3000/api/cron/publish-scheduled';
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('CRON_SECRET must be set in the environment.');
    process.exit(1);
  }
  const start = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-cron-secret': secret, 'content-type': 'application/json' },
  });
  const text = await res.text();
  const ms = Date.now() - start;
  console.log(`POST ${url} → ${res.status} (${ms}ms): ${text}`);
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
