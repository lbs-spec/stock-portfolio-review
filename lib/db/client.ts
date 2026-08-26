import type { D1Database } from '@cloudflare/workers-types';

export function getDB(env?: { DB?: D1Database }): D1Database {
  const db = env?.DB ?? (process.env as unknown as { DB?: D1Database }).DB;
  if (!db) {
    throw new Error('D1 database binding "DB" is not available');
  }
  return db;
}
