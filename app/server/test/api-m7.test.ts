import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createEmailChannel } from '../src/channels/email.js';
import { createLogChannel } from '../src/channels/log.js';
import { createSlackChannel } from '../src/channels/slack.js';
import { registerSource } from '../src/ingest.js';
import { seed } from '../src/seed.js';
import { gdacs } from '../src/sources/gdacs.js';
import { freshDb } from './helpers.js';

const db = freshDb();
let server: Server;
let base: string;
const WEBHOOK = 'https://hooks.slack.com/services/TEST/BTEST/abcdWXYZ';

beforeAll(async () => {
  seed(db);
  registerSource(db, gdacs);
  const channels = [createEmailChannel(db, {}, null), createSlackChannel({}, async () => ({ status: 200, body: 'ok' })), createLogChannel(() => {})];
  server = createApp(db, { sources: [gdacs], channels }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const send = (method: string, path: string, body?: unknown) =>
  fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

describe('destinations API', () => {
  it('rejects a look-alike Slack host with 400', async () => {
    const r = await send('PUT', '/api/users/1/destinations/slack', { config: { webhookUrl: 'https://hooks.slack.com.evil.test/services/X' } });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/only https:\/\/hooks\.slack\.com/);
  });

  it('stores a valid webhook but only ever returns it masked', async () => {
    const r = await send('PUT', '/api/users/1/destinations/slack', { config: { webhookUrl: WEBHOOK } });
    expect(r.status).toBe(200);
    const put = await r.text();
    const list = await (await send('GET', '/api/users/1/destinations')).text();
    for (const body of [put, list]) {
      expect(body).not.toContain('TEST/BTEST'); // no part of the path
      expect(body).not.toContain(WEBHOOK);
    }
    expect(JSON.parse(list)).toContainEqual({ channel: 'slack', label: null, config: { webhookUrl: 'https://hooks.slack.com/…/••••WXYZ' } });
  });

  it('lists the channels with their form fields', async () => {
    const body = await (await send('GET', '/api/channels')).json();
    expect(body.map((c: { id: string }) => c.id)).toEqual(['email', 'slack', 'log']);
    expect(body[1].fields).toEqual([{ name: 'webhookUrl', label: 'Slack webhook URL', secret: true }]);
  });
});

describe('subscriptions API', () => {
  it('replaces the set; a kept pair keeps its created_at (forward-only cut-off, D-027)', async () => {
    await send('PUT', '/api/users/2/subscriptions', [{ categoryId: 'gdacs:EQ', channel: 'email' }]);
    const [first] = await (await send('GET', '/api/users/2/subscriptions')).json();
    await new Promise((r) => setTimeout(r, 5));
    await send('PUT', '/api/users/2/subscriptions', [
      { categoryId: 'gdacs:EQ', channel: 'email' },
      { categoryId: 'gdacs:TC', channel: 'log' },
    ]);
    const now = await (await send('GET', '/api/users/2/subscriptions')).json();
    expect(now).toHaveLength(2);
    expect(now.find((s: { categoryId: string }) => s.categoryId === 'gdacs:EQ').createdAt).toBe(first.createdAt);
  });

  it('rejects an unknown category or channel', async () => {
    expect((await send('PUT', '/api/users/2/subscriptions', [{ categoryId: 'gdacs:XX', channel: 'email' }])).status).toBe(400);
    expect((await send('PUT', '/api/users/2/subscriptions', [{ categoryId: 'gdacs:EQ', channel: 'fax' }])).status).toBe(400);
  });
});

describe('inject API', () => {
  it('runs the pipeline and returns the deliveries', async () => {
    await send('PUT', '/api/users/3/subscriptions', [{ categoryId: 'gdacs:VO', channel: 'log' }]);
    const r = await (await send('POST', '/api/admin/inject', { sourceId: 'gdacs', categoryKey: 'VO' })).json();
    expect(r.deliveries).toEqual([{ id: expect.any(Number), userId: 3, channel: 'log', status: 'sent', error: null }]);
    const deliveries = await (await send('GET', '/api/admin/deliveries')).json();
    expect(deliveries[0]).toMatchObject({ eventId: r.eventId, userName: 'Linus', channel: 'log', status: 'sent', isDemo: 1 });
  });

  it('400 for an unknown source', async () => {
    expect((await send('POST', '/api/admin/inject', { sourceId: 'nope', categoryKey: 'VO' })).status).toBe(400);
  });
});
