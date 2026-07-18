/**
 * Drops the app-owned tables so `db:reset` can rebuild them from scratch. The
 * workflow world keeps its own `graphile_worker` schema in the same database —
 * this only touches the tables Drizzle owns, so a reset never disturbs
 * in-flight workflow state.
 */
import { Pool } from 'pg';

const APP_TABLES = [
  'transcript_chunks',
  'frames',
  'headlines',
  'stories',
  'transcripts',
  'runs',
  'broadcasts',
  '__drizzle_migrations',
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres',
});

try {
  for (const table of APP_TABLES) {
    await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
  }
  // The transcript_chunks table needs the pgvector type to exist before the
  // schema tool (push or migrate) recreates it.
  await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
  console.log(`Dropped ${APP_TABLES.length} app tables.`);
} finally {
  await pool.end();
}
