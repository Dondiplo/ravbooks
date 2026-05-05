#!/usr/bin/env node
/**
 * Starts an embedded PostgreSQL server for local development/testing.
 * Data persists in ./data/db between runs.
 * Listens on port 5433 to avoid conflicting with any system postgres.
 *
 * Usage:
 *   node scripts/start-db.mjs           # start (and keep running)
 *   node scripts/start-db.mjs --init    # first-time: init + start + create DB
 */

import EmbeddedPostgres from 'embedded-postgres';
import { fileURLToPath } from 'url';
import path from 'path';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const pg = new EmbeddedPostgres({
  databaseDir: path.join(root, 'data', 'db'),
  port: 5433,
  user: 'postgres',
  password: 'postgres',
  persistent: true,
  onLog: (msg) => console.log('[postgres]', msg),
  onError: (msg) => console.error('[postgres]', msg),
});

const isInit = process.argv.includes('--init');

import { existsSync } from 'fs';

const dataDir = path.join(root, 'data', 'db');
const alreadyInitialised = existsSync(path.join(dataDir, 'PG_VERSION'));

console.log('Starting embedded PostgreSQL on port 5433…');

if (!alreadyInitialised) {
  await pg.initialise();
}
await pg.start();

if (isInit) {
  console.log('Creating database accounting_db…');
  try {
    await pg.createDatabase('accounting_db');
    console.log('Database created.');
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log('Database already exists, skipping.');
    } else {
      throw e;
    }
  }

  console.log('Running Prisma migrations…');
  execSync('yarn workspace @accounting/backend prisma migrate dev --name init --skip-seed', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/accounting_db?schema=public' },
  });

  console.log('Seeding database…');
  execSync('yarn db:seed', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/accounting_db?schema=public' },
  });

  console.log('\n✓ Database ready. Demo credentials in README.md');
}

console.log('PostgreSQL running on port 5433. Press Ctrl+C to stop.');

// Keep the process alive
process.stdin.resume();
