import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';
import { ingestPoll, registerSource } from '../src/ingest.js';
import { gdacs } from '../src/sources/gdacs.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const db = openDb(':memory:');
  seed(db);
  registerSource(db, gdacs);
  ingestPoll(db, gdacs, [{ feedKey: 'eventlist', ok: false, error: 'HTTP 503' }], '2026-10-02T14:00:00.000Z');
  server = createApp(db).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe('API', () => {
  it('GET /api/health', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('GET /api/users returns the seeded demo users, without destinations', async () => {
    const res = await fetch(`${base}/api/users`);
    expect(await res.json()).toEqual([
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
      { id: 3, name: 'Linus' },
    ]);
  });

  it('GET /api/categories groups the declared categories by source', async () => {
    const body = await (await fetch(`${base}/api/categories`)).json();
    expect(body).toHaveLength(1);
    expect(body[0].sourceName).toBe('GDACS');
    expect(body[0].categories.map((c: { key: string }) => c.key)).toEqual(['EQ', 'TC', 'FL', 'VO', 'DR', 'WF']);
  });

  it('GET /api/admin/feeds shows freshness and the last error per feed', async () => {
    expect(await (await fetch(`${base}/api/admin/feeds`)).json()).toEqual([
      {
        sourceId: 'gdacs',
        feedKey: 'eventlist',
        baselinedAt: null,
        lastAttemptAt: '2026-10-02T14:00:00.000Z',
        lastSuccessAt: null,
        lastError: 'HTTP 503',
      },
    ]);
  });
});
