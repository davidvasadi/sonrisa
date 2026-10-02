import type { Db } from './db.js';

// The worker runs inside the API process (design: one Node process, one SQLite writer).
// M5 skeleton: no sources yet. M6 adds the poller (one timer per source).
export function startWorker(_db: Db, log: (msg: string) => void = console.log): { stop: () => void } {
  log('worker: started, 0 sources registered (sources come in M6)');
  return { stop: () => log('worker: stopped') };
}
