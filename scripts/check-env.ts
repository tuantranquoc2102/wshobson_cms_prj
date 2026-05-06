/**
 * Validates required environment variables before `next dev` boots. Wired
 * into the `predev` npm hook so missing config fails fast with a readable
 * message instead of producing confusing runtime errors later.
 *
 * Usage:
 *   npm run check:env
 *   (or implicitly via `npm run dev`)
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface EnvRule {
  readonly name: string;
  readonly minLength?: number;
  readonly description: string;
}

const REQUIRED: readonly EnvRule[] = [
  {
    name: 'DATABASE_URL',
    description: 'Postgres connection string (see .env.example).',
  },
  {
    name: 'JWT_ACCESS_SECRET',
    minLength: 32,
    description: 'HS256 access-token secret. Generate: openssl rand -hex 32',
  },
  {
    name: 'CRON_SECRET',
    description: 'Shared secret for the scheduled-publish cron endpoint.',
  },
];

/**
 * Parse a minimal subset of dotenv syntax. We avoid pulling in a runtime
 * dependency just for this check — Next.js itself will load .env later.
 */
function loadDotenv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  const raw = readFileSync(path, 'utf8');
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function main(): void {
  const dotenv = loadDotenv(resolve(process.cwd(), '.env'));
  const merged: Record<string, string | undefined> = { ...dotenv, ...process.env };
  const errors: string[] = [];

  for (const rule of REQUIRED) {
    const value = merged[rule.name];
    if (!value || value.length === 0) {
      errors.push(`  - ${rule.name} is missing. ${rule.description}`);
      continue;
    }
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(
        `  - ${rule.name} must be at least ${rule.minLength} characters (got ${value.length}). ${rule.description}`,
      );
    }
  }

  if (errors.length > 0) {
    console.error('Environment check failed:');
    for (const err of errors) console.error(err);
    console.error(
      '\nCopy .env.example to .env and fill the missing values, then re-run.',
    );
    process.exit(1);
  }

  console.log('Environment check passed.');
}

main();
