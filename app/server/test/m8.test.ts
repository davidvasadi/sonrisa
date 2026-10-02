import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createEmailChannel } from '../src/channels/email.js';
import { createLogChannel } from '../src/channels/log.js';
import { createSlackChannel, type OAuthExchange } from '../src/channels/slack.js';
import { saveDestination } from '../src/destinations.js';
import { registerSource } from '../src/ingest.js';
import { seed } from '../src/seed.js';
import { gdacs } from '../src/sources/gdacs.js';
import { freshDb } from './helpers.js';

const ENV = {
  SLACK_CLIENT_ID: '111.222',
  SLACK_CLIENT_SECRET: 'not-a-real-secret',
  SLACK_REDIRECT_URI: 'https://localhost:5173/api/slack/oauth/callback',
};

// A mock oauth.v2.access. Its answer per code is set by each test; every call is recorded.
const exchanges: Record<string, string>[] = [];
let answer: unknown = {};
const exchange: OAuthExchange = async (form) => {
  exchanges.push(form);
  return answer;
};

function start(env: NodeJS.ProcessEnv) {
  const db = freshDb();
  seed(db);
  registerSource(db, gdacs);
  const slack = createSlackChannel(env, async () => ({ status: 200, body: 'ok' }), {
    db,
    save: (userId, config, label) => saveDestination(db, userId, 'slack', config, label),
    exchange,
  });
  const server = createApp(db, { sources: [gdacs], channels: [createEmailChannel(db, {}, null), slack, createLogChannel(() => {})] }).listen(0);
  return { db, server, base: () => `http://localhost:${(server.address() as AddressInfo).port}` };
}

const app = start(ENV);
const plain = start({}); // no Slack app configured
beforeAll(async () => {
  for (const a of [app, plain]) if (!a.server.listening) await new Promise((r) => a.server.once('listening', r));
});
afterAll(() => {
  app.server.close();
  plain.server.close();
});

const get = (base: string, path: string) => fetch(`${base}${path}`, { redirect: 'manual' });

async function beginOAuth(userId = 1): Promise<string> {
  const r = await get(app.base(), `/api/slack/oauth/start?userId=${userId}`);
  expect(r.status).toBe(302);
  return new URL(r.headers.get('location')!).searchParams.get('state')!;
}

describe('Connect Slack: status (D-021)', () => {
  it('without a Slack app the connect button is disabled with a note', async () => {
    const channels = await (await get(plain.base(), '/api/channels')).json();
    const slack = channels.find((c: { id: string }) => c.id === 'slack');
    expect(slack.status.connect.enabled).toBe(false);
    expect(slack.status.connect.note).toMatch(/needs a Slack app/);
    expect((await get(plain.base(), '/api/slack/oauth/start?userId=1')).status).toBe(404);
  });

  it('with a Slack app it is enabled', async () => {
    const channels = await (await get(app.base(), '/api/channels')).json();
    expect(channels.find((c: { id: string }) => c.id === 'slack').status.connect).toEqual({ enabled: true, href: '/api/slack/oauth/start' });
  });
});

describe('Connect Slack: OAuth flow (stored Slack docs)', () => {
  it('start redirects to slack.com authorize with scope, client_id, redirect_uri and a state', async () => {
    const r = await get(app.base(), '/api/slack/oauth/start?userId=1');
    const u = new URL(r.headers.get('location')!);
    expect(`${u.origin}${u.pathname}`).toBe('https://slack.com/oauth/v2/authorize');
    expect(u.searchParams.get('scope')).toBe('incoming-webhook');
    expect(u.searchParams.get('client_id')).toBe('111.222');
    expect(u.searchParams.get('redirect_uri')).toBe(ENV.SLACK_REDIRECT_URI);
    expect(u.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('callback exchanges the code, stores the webhook masked with its channel, and discards the token', async () => {
    const state = await beginOAuth(2);
    answer = {
      ok: true,
      access_token: 'xoxb-test-token-not-real',
      incoming_webhook: { channel: '#alerts', url: 'https://hooks.slack.com/services/TEST/BTEST/fromOAuth' },
    };
    exchanges.length = 0;
    const r = await get(app.base(), `/api/slack/oauth/callback?code=abc&state=${state}`);
    expect(r.headers.get('location')).toBe('https://localhost:5173/#/?slack=connected');
    expect(exchanges).toEqual([{ code: 'abc', client_id: '111.222', client_secret: 'not-a-real-secret', redirect_uri: ENV.SLACK_REDIRECT_URI }]);
    const dest = app.db.prepare("SELECT config, label FROM destinations WHERE user_id = 2 AND channel = 'slack'").get() as { config: string; label: string };
    expect(dest).toEqual({ config: '{"webhookUrl":"https://hooks.slack.com/services/TEST/BTEST/fromOAuth"}', label: '#alerts' });
    // The token is nowhere in the database.
    const dump = JSON.stringify(app.db.prepare('SELECT * FROM destinations').all()) + JSON.stringify(app.db.prepare('SELECT * FROM oauth_states').all());
    expect(dump).not.toContain('xoxb-test-token');
  });

  it('a state is single-use', async () => {
    const state = await beginOAuth();
    answer = { ok: true, incoming_webhook: { url: 'https://hooks.slack.com/services/TEST/BTEST/x' } };
    await get(app.base(), `/api/slack/oauth/callback?code=abc&state=${state}`);
    const again = await get(app.base(), `/api/slack/oauth/callback?code=abc&state=${state}`);
    expect(again.headers.get('location')).toBe('https://localhost:5173/#/?slack=error%3Astate');
  });

  it('an unknown state is refused without calling Slack (forgery)', async () => {
    exchanges.length = 0;
    const r = await get(app.base(), '/api/slack/oauth/callback?code=abc&state=forged');
    expect(r.headers.get('location')).toMatch(/slack=error%3Astate$/);
    expect(exchanges).toEqual([]);
  });

  it('an expired state (over 10 minutes) is refused', async () => {
    const state = await beginOAuth();
    app.db.prepare('UPDATE oauth_states SET created_at = ? WHERE state = ?').run(Date.now() - 11 * 60_000, state);
    const r = await get(app.base(), `/api/slack/oauth/callback?code=abc&state=${state}`);
    expect(r.headers.get('location')).toMatch(/slack=error%3Astate$/);
  });

  it('no code (e.g. the user declined; exact Slack parameters unverified) means not connected', async () => {
    const state = await beginOAuth();
    const r = await get(app.base(), `/api/slack/oauth/callback?error=access_denied&state=${state}`);
    expect(r.headers.get('location')).toMatch(/slack=cancelled$/);
  });

  it('ok: false from Slack is reported with Slack’s error name only', async () => {
    const state = await beginOAuth();
    answer = { ok: false, error: 'invalid_code' };
    const r = await get(app.base(), `/api/slack/oauth/callback?code=old&state=${state}`);
    expect(r.headers.get('location')).toMatch(/slack=error%3Ainvalid_code$/);
  });

  it('a webhook URL from Slack that is not hooks.slack.com is rejected (D-022 applies to OAuth)', async () => {
    const state = await beginOAuth(3);
    answer = { ok: true, incoming_webhook: { url: 'https://hooks.slack.com.evil.test/services/X' } };
    const r = await get(app.base(), `/api/slack/oauth/callback?code=abc&state=${state}`);
    expect(r.headers.get('location')).toMatch(/slack=error%3Awebhook_host$/);
    expect(app.db.prepare("SELECT 1 FROM destinations WHERE user_id = 3 AND channel = 'slack'").get()).toBeUndefined();
  });
});

describe('live updates over SSE (D-004)', () => {
  it('a demo inject reaches an open stream as events.created and delivery.updated', async () => {
    const ac = new AbortController();
    const res = await fetch(`${app.base()}/api/stream`, { signal: ac.signal });
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    const reader = res.body!.getReader();
    let text = '';
    const until = async (pattern: RegExp) => {
      while (!pattern.test(text)) text += new TextDecoder().decode((await reader.read()).value);
    };
    await until(/: connected/);
    await fetch(`${app.base()}/api/users/1/subscriptions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ categoryId: 'gdacs:EQ', channel: 'log' }]),
    });
    await fetch(`${app.base()}/api/admin/inject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId: 'gdacs', categoryKey: 'EQ' }) });
    await until(/event: delivery\.updated/);
    ac.abort();
    expect(text).toMatch(/event: user\.updated\ndata: \{"type":"user\.updated","userId":1\}/);
    expect(text).toMatch(/event: events\.created\ndata: \{"type":"events\.created","sourceId":"gdacs","count":1\}/);
    expect(text).toMatch(/event: delivery\.updated\ndata: \{"type":"delivery\.updated","deliveryId":\d+,"userId":1,"status":"sent"\}/);
  });
});

describe('feed and admin endpoints', () => {
  it('the user feed lists events in subscribed categories, with what was delivered to that user', async () => {
    const feed = await (await get(app.base(), '/api/users/1/feed')).json();
    expect(feed[0]).toMatchObject({ sourceName: 'GDACS', categories: ['Earthquakes'], isDemo: 1, deliveries: [{ channel: 'log', status: 'sent' }] });
    expect(await (await get(app.base(), '/api/users/3/feed')).json()).toEqual([]); // Linus subscribes to nothing
  });

  it('admin users show subscriptions and masked destinations only', async () => {
    const text = await (await get(app.base(), '/api/admin/users')).text();
    expect(text).not.toContain('fromOAuth');
    const grace = JSON.parse(text).find((u: { id: number }) => u.id === 2);
    expect(grace.destinations).toContainEqual({ channel: 'slack', label: '#alerts', config: { webhookUrl: 'https://hooks.slack.com/…/••••Auth' } });
  });

  it('admin events list recent events with their categories', async () => {
    const events = await (await get(app.base(), '/api/admin/events')).json();
    expect(events[0]).toMatchObject({ sourceName: 'GDACS', categories: ['Earthquakes'], isDemo: 1, notify: 1 });
  });
});
