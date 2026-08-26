import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const schemaSQL = readFileSync(
  join(process.cwd(), 'lib', 'db', 'migrations', '0001_init.sql'),
  'utf-8'
);
