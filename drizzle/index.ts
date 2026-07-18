import { ExtractTablesWithRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres',
});
export const db = drizzle(pool, { schema });

// Export Transaction type to be used in repositories
export type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
