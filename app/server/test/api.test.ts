import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';

let server: Server;
let base: string;

beforeAll(async () => {
  const db = openDb(':memory:');
  seed(db);
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
});
