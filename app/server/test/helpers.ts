import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../src/db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

// Real responses stored in M3, copied into test/fixtures (see fixtures/README.md).
export const fixture = (name: string): string => fs.readFileSync(path.join(dir, name), 'utf8');

export const freshDb = () => openDb(':memory:');

export function count(db: ReturnType<typeof openDb>, sql: string, ...params: unknown[]): number {
  return (db.prepare(sql).get(...params) as { n: number }).n;
}
