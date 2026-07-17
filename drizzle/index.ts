import { createClient, ResultSet } from '@libsql/client';
import { ExtractTablesWithRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';

import * as schema from './schema';

// Setup sqlite database connection
const client = createClient({
  url: process.env.DATABASE_URL ?? 'file:sqlite.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
export const db = drizzle(client, { schema });

// Export Transaction type to be used in repositories
export type Transaction = SQLiteTransaction<
  'async',
  ResultSet,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
