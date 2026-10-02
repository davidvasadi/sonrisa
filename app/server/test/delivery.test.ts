import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEmailChannel } from '../src/channels/email.js';
import { createLogChannel } from '../src/channels/log.js';
import { createSlackChannel, realTransport, validateWebhookUrl, type Transport } from '../src/channels/slack.js';
import type { Channel } from '../src/channels/types.js';
import { deliver, dispatch, failInterrupted, match } from '../src/dispatch.js';
import { ingestPoll, registerSource } from '../src/ingest.js';
import { injectDemo } from '../src/inject.js';
import { loadDeliveryEvent } from '../src/message.js';
import { seed } from '../src/seed.js';
import { bbc } from '../src/sources/bbc.js';
import { gdacs } from '../src/sources/gdacs.js';
import { unNews } from '../src/sources/un-news.js';
import { count, fixture, freshDb } from './helpers.js';

// --- Slack mock receiver (D-023): a real local HTTP server. The slack channel gets a transport
// that sends hooks.slack.com requests here, so the real host check is never relaxed (design F5).
const received: { path: string; body: string }[] = [];
let mock: http.Server;
let mockBase: string;
beforeAll(async () => {
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received.push({ path: req.url ?? '', body });
      if (req.url?.endsWith('/OK')) return void res.writeHead(200).end('ok');
      if (req.url?.endsWith('/GONE')) return void res.writeHead(404).end('no_service');
      if (req.url?.endsWith('/MOVED')) return void res.writeHead(302, { Location: 'http://169.254.169.254/' }).end();
      res.writeHead(500).end('unexpected');
    });
  });
  mock.listen(0);
  await new Promise((r) => mock.once('listening', r));
  mockBase = `http://127.0.0.1:${(mock.address() as AddressInfo).port}`;
});
afterAll(() => mock.close());

const toMock: Transport = async (url, json) => {
  const u = new URL(url);
  const res = await fetch(`${mockBase}${u.pathname}`, { method: 'POST', body: json, redirect: 'manual' });
  return { status: res.status, body: await res.text() };
};

const WEBHOOK_OK = 'https://hooks.slack.com/services/TEST/BTEST/OK';
const WEBHOOK_GONE = 'https://hooks.slack.com/services/TEST/BTEST/GONE';

const channelOf = (t: { db: ReturnType<typeof freshDb> }, deliveryId: number) =>
  (t.db.prepare('SELECT channel FROM deliveries WHERE id = ?').get(deliveryId) as { channel: string }).channel;

// --- A DB with one new GDACS event (DR1018332, notify = 1) after a baseline poll.
function setup() {
  const db = freshDb();
  seed(db); // users 1-3, each with email + log destinations
  registerSource(db, gdacs);
  const logs: string[] = [];
  const channels: Channel[] = [createEmailChannel(db, {}, null), createSlackChannel({}, toMock), createLogChannel((m) => logs.push(m))];
  const subscribe = (userId: number, categoryId: string, channel: string, at = '2026-10-02T13:00:00.000Z') =>
    db.prepare('INSERT INTO subscriptions (user_id, category_id, channel, created_at) VALUES (?, ?, ?, ?)').run(userId, categoryId, channel, at);
  const setSlack = (userId: number, url: string) =>
    db.prepare("INSERT OR REPLACE INTO destinations (user_id, channel, config) VALUES (?, 'slack', ?)").run(userId, JSON.stringify({ webhookUrl: url }));
  const newEvent = () => {
    const items = gdacs.parse(fixture('gdacs/eventlist-default.json'));
    ingestPoll(db, gdacs, [{ feedKey: 'eventlist', ok: true, items: items.slice(1) }], '2026-10-02T14:00:00.000Z'); // baseline
    const r = ingestPoll(db, gdacs, [{ feedKey: 'eventlist', ok: true, items }], '2026-10-02T14:10:00.000Z');
    return r.newEventIds; // [the DR drought event]
  };
  return { db, channels, logs, subscribe, setSlack, newEvent };
}

describe('matching', () => {
  it('match: a subscriber to the event category gets it; a subscriber to another category does not', async () => {
    const t = setup();
    t.subscribe(1, 'gdacs:DR', 'email');
    t.subscribe(2, 'gdacs:EQ', 'email');
    const results = await deliver(t.db, t.channels, t.newEvent());
    expect(results).toEqual([{ id: expect.any(Number), userId: 1, channel: 'email', status: 'sent', error: null }]);
    expect(count(t.db, 'SELECT COUNT(*) n FROM outbox WHERE to_address = ?', 'ada@example.com')).toBe(1);
  });

  it('no match: a subscription created after the event was ingested gets nothing (D-027)', async () => {
    const t = setup();
    t.subscribe(1, 'gdacs:DR', 'email', '2026-10-02T14:30:00.000Z');
    expect(await deliver(t.db, t.channels, t.newEvent())).toEqual([]);
  });

  it('no match: baseline events are never delivered', async () => {
    const t = setup();
    t.subscribe(1, 'gdacs:EQ', 'email');
    ingestPoll(t.db, gdacs, [{ feedKey: 'eventlist', ok: true, items: gdacs.parse(fixture('gdacs/eventlist-default.json')) }]);
    const all = (t.db.prepare('SELECT id FROM events').all() as { id: number }[]).map((r) => r.id);
    expect(await deliver(t.db, t.channels, all)).toEqual([]);
  });

  it('no match: a subscription without a destination for that channel', async () => {
    const t = setup();
    t.subscribe(1, 'gdacs:DR', 'slack'); // Ada has no Slack destination
    expect(await deliver(t.db, t.channels, t.newEvent())).toEqual([]);
  });

  it('an event in two subscribed categories is delivered once per channel', async () => {
    const t = setup();
    const [eventId] = t.newEvent();
    t.db.prepare("INSERT INTO event_categories (event_id, category_id) VALUES (?, 'gdacs:FL')").run(eventId);
    t.subscribe(1, 'gdacs:DR', 'email');
    t.subscribe(1, 'gdacs:FL', 'email');
    expect(await deliver(t.db, t.channels, [eventId])).toHaveLength(1);
  });
});

describe('notification dedup (D-005)', () => {
  it('the same event delivered twice gives one delivery', async () => {
    const t = setup();
    t.subscribe(1, 'gdacs:DR', 'email');
    const ids = t.newEvent();
    expect(await deliver(t.db, t.channels, ids)).toHaveLength(1);
    expect(await deliver(t.db, t.channels, ids)).toEqual([]);
    expect(count(t.db, 'SELECT COUNT(*) n FROM deliveries')).toBe(1);
    expect(count(t.db, 'SELECT COUNT(*) n FROM outbox')).toBe(1);
  });
});

describe('failures are isolated and stored, no retries (D-030)', () => {
  it('one failing channel does not block the others', async () => {
    const t = setup();
    t.setSlack(1, WEBHOOK_GONE);
    for (const ch of ['email', 'slack', 'log']) t.subscribe(1, 'gdacs:DR', ch);
    const eventIds = t.newEvent();
    const results = await deliver(t.db, t.channels, eventIds);
    const by = Object.fromEntries(results.map((r) => [r.channel, r]));
    expect(by.email.status).toBe('sent');
    expect(by.log.status).toBe('sent');
    expect(by.slack).toMatchObject({ status: 'failed', error: 'HTTP 404: no_service' });
    expect(t.logs).toHaveLength(1);
    // Stored, and never resent: delivering again does nothing.
    expect(t.db.prepare("SELECT status, error FROM deliveries WHERE channel = 'slack'").get()).toEqual({ status: 'failed', error: 'HTTP 404: no_service' });
    expect(await deliver(t.db, t.channels, eventIds)).toEqual([]);
  });

  it('a channel that throws only fails its own delivery', async () => {
    const t = setup();
    const boom: Channel = { ...createLogChannel(() => {}), id: 'boom', send: async () => { throw new Error('kaput'); } };
    t.db.prepare("INSERT INTO destinations (user_id, channel, config) VALUES (1, 'boom', '{}')").run();
    t.subscribe(1, 'gdacs:DR', 'boom');
    t.subscribe(1, 'gdacs:DR', 'email');
    const results = await deliver(t.db, [...t.channels, boom], t.newEvent());
    expect(results.map((r) => [r.channel, r.status, r.error])).toEqual([
      ['boom', 'failed', 'send threw: kaput'],
      ['email', 'sent', null],
    ]);
  });

  it('a delivery left pending by a crash becomes failed at startup (design F8)', async () => {
    const t = setup();
    const [eventId] = t.newEvent();
    t.db.prepare("INSERT INTO deliveries (event_id, user_id, channel, status, created_at) VALUES (?, 1, 'email', 'pending', 'x')").run(eventId);
    expect(failInterrupted(t.db)).toBe(1);
    expect(t.db.prepare('SELECT status, error FROM deliveries').get()).toEqual({ status: 'failed', error: 'interrupted: outcome unknown, it may have been delivered' });
  });

  it('a destination removed between matching and sending fails its delivery instead of leaving it pending', async () => {
    const t = setup();
    t.subscribe(1, 'gdacs:DR', 'email');
    t.subscribe(1, 'gdacs:DR', 'log');
    const ids = match(t.db, t.newEvent(), t.channels.map((c) => c.id));
    t.db.prepare("DELETE FROM destinations WHERE user_id = 1 AND channel = 'email'").run();
    const results = await dispatch(t.db, t.channels, ids);
    expect(results.map((r) => [r.channel, r.status, r.error])).toEqual([
      ['email', 'failed', 'destination removed before send'],
      ['log', 'sent', null],
    ]);
    expect(count(t.db, "SELECT COUNT(*) n FROM deliveries WHERE status = 'pending'")).toBe(0);
  });

  it('a config that masking cannot handle fails only its own delivery, and the error text is hidden', async () => {
    const t = setup();
    t.db.prepare("INSERT INTO destinations (user_id, channel, config) VALUES (1, 'slack', ?)").run(JSON.stringify({ webhookUrl: 5 }));
    t.subscribe(1, 'gdacs:DR', 'slack');
    t.subscribe(1, 'gdacs:DR', 'log');
    // The bad delivery goes first: before the fix, its throw stopped the one after it.
    const ids = match(t.db, t.newEvent(), t.channels.map((c) => c.id));
    const slackFirst = [...ids].sort((a, b) => Number(channelOf(t, b) === 'slack') - Number(channelOf(t, a) === 'slack'));
    const results = await dispatch(t.db, t.channels, slackFirst);
    expect(results.map((r) => [r.channel, r.status, r.error])).toEqual([
      ['slack', 'failed', 'error text hidden: it could not be masked'],
      ['log', 'sent', null],
    ]);
    expect(count(t.db, "SELECT COUNT(*) n FROM deliveries WHERE status = 'pending'")).toBe(0);
  });

  it('a destination config that is not JSON fails only its own delivery, without storing the config', async () => {
    const t = setup();
    t.db.prepare("UPDATE destinations SET config = 'secret-not-json' WHERE user_id = 1 AND channel = 'email'").run();
    t.subscribe(1, 'gdacs:DR', 'email');
    t.subscribe(1, 'gdacs:DR', 'log');
    const results = await deliver(t.db, t.channels, t.newEvent());
    expect(results.map((r) => [r.channel, r.status, r.error])).toEqual([
      ['email', 'failed', 'destination config is not valid JSON'],
      ['log', 'sent', null],
    ]);
  });
});

describe('secrets never reach a stored error (design F14)', () => {
  const SECRET_URL = 'https://hooks.slack.com/services/TSECRET/BSECRET/abcdWXYZ';
  const stored = (t: ReturnType<typeof setup>) => (t.db.prepare("SELECT error FROM deliveries WHERE channel = 'slack'").get() as { error: string }).error;

  it('slack: a transport error that contains the webhook URL is stored masked', async () => {
    const t = setup();
    const throwing: Transport = async (url) => {
      throw new Error(`connect ECONNREFUSED for ${url}`);
    };
    const channels = [...t.channels.filter((c) => c.id !== 'slack'), createSlackChannel({}, throwing)];
    t.setSlack(1, SECRET_URL);
    t.subscribe(1, 'gdacs:DR', 'slack');
    const [r] = await deliver(t.db, channels, t.newEvent());
    expect(r.status).toBe('failed');
    expect(stored(t)).toBe('connect ECONNREFUSED for https://hooks.slack.com/…/••••WXYZ');
    expect(stored(t)).not.toContain('TSECRET');
  });

  it('slack: a response body that echoes the webhook URL is stored masked', async () => {
    const t = setup();
    const echo: Transport = async (url) => ({ status: 400, body: `invalid url ${url}` });
    const channels = [...t.channels.filter((c) => c.id !== 'slack'), createSlackChannel({}, echo)];
    t.setSlack(1, SECRET_URL);
    t.subscribe(1, 'gdacs:DR', 'slack');
    await deliver(t.db, channels, t.newEvent());
    expect(stored(t)).toBe('HTTP 400: invalid url https://hooks.slack.com/…/••••WXYZ');
  });

  it('slack send itself masks the URL, before dispatch scrubs anything (two layers)', async () => {
    const t = setup();
    const event = loadDeliveryEvent(t.db, t.newEvent()[0])!;
    const throwing = createSlackChannel({}, async (url) => {
      throw new Error(`failed: ${url}`);
    });
    const echo = createSlackChannel({}, async (url) => ({ status: 500, body: url }));
    expect(await throwing.send({ webhookUrl: SECRET_URL }, event)).toEqual({ ok: false, error: 'failed: https://hooks.slack.com/…/••••WXYZ' });
    expect(await echo.send({ webhookUrl: SECRET_URL }, event)).toEqual({ ok: false, error: 'HTTP 500: https://hooks.slack.com/…/••••WXYZ' });
  });

  it('dispatch: any channel error containing a secret field value is masked by the channel', async () => {
    const t = setup();
    // A channel that leaks its secret in the error text, and throws it too: dispatch must scrub both.
    const leaky = (mode: 'return' | 'throw'): Channel => ({
      ...createLogChannel(() => {}),
      id: `leaky-${mode}`,
      fields: [{ name: 'token', label: 'Token', secret: true }],
      mask: () => ({ token: '••••' }),
      send: async (config) => {
        if (mode === 'throw') throw new Error(`bad token ${config.token}`);
        return { ok: false, error: `bad token ${config.token}` };
      },
    });
    for (const mode of ['return', 'throw'] as const) {
      t.db.prepare('INSERT INTO destinations (user_id, channel, config) VALUES (1, ?, ?)').run(`leaky-${mode}`, JSON.stringify({ token: 's3cr3t' }));
      t.subscribe(1, 'gdacs:DR', `leaky-${mode}`);
    }
    const results = await deliver(t.db, [...t.channels, leaky('return'), leaky('throw')], t.newEvent());
    expect(results.map((r) => r.error)).toEqual(['bad token ••••', 'send threw: bad token ••••']);
    expect(count(t.db, "SELECT COUNT(*) n FROM deliveries WHERE error LIKE '%s3cr3t%'")).toBe(0);
  });
});

describe('slack (mock receiver)', () => {
  it('posts the rendered message; Slack-escaped title, <url|text> link', async () => {
    const t = setup();
    t.setSlack(1, WEBHOOK_OK);
    t.subscribe(1, 'gdacs:DR', 'slack');
    const [eventId] = t.newEvent();
    t.db.prepare("UPDATE events SET title = 'Floods & <storms>' WHERE id = ?").run(eventId);
    received.length = 0;
    const [r] = await deliver(t.db, t.channels, [eventId]);
    expect(r.status).toBe('sent');
    expect(received).toHaveLength(1);
    expect(received[0].path).toBe('/services/TEST/BTEST/OK');
    const text = JSON.parse(received[0].body).text as string;
    expect(text.split('\n')[0]).toBe('*<https://www.gdacs.org/report.aspx?eventid=1018332&amp;episodeid=24&amp;eventtype=DR|Floods &amp; &lt;storms&gt;>*');
  });

  it('a redirect is refused, not followed (SSRF)', async () => {
    const t = setup();
    t.setSlack(1, 'https://hooks.slack.com/services/TEST/BTEST/MOVED');
    t.subscribe(1, 'gdacs:DR', 'slack');
    received.length = 0;
    const [r] = await deliver(t.db, t.channels, t.newEvent());
    expect(r).toMatchObject({ status: 'failed', error: 'redirect refused (HTTP 302)' });
    expect(received.map((x) => x.path)).toEqual(['/services/TEST/BTEST/MOVED']); // nothing else was called
  });
});

describe('the real Slack transport', () => {
  it('does not follow a redirect: it returns the 3xx (the channel then fails the delivery)', async () => {
    received.length = 0;
    const r = await realTransport(`${mockBase}/services/TEST/BTEST/MOVED`, '{}');
    expect(r.status).toBe(302);
    expect(received).toHaveLength(1); // 169.254.169.254 was never requested
  });
});

describe('look-alike Slack hosts are rejected (D-022)', () => {
  it.each([
    'https://hooks.slack.com.evil.test/services/TEST/BTEST/OK',
    'https://evil.test/hooks.slack.com/services/TEST/BTEST/OK',
    'http://hooks.slack.com/services/TEST/BTEST/OK',
    'https://hooks.slack.com:8443/services/TEST/BTEST/OK',
    'https://user:pw@hooks.slack.com/services/TEST/BTEST/OK',
    'https://hooks.slack-gov.com/services/TEST/BTEST/OK',
    'not a url',
  ])('rejects %s', (url) => {
    expect(validateWebhookUrl(url).ok).toBe(false);
  });

  it('accepts https://hooks.slack.com/... with or without /services/ (Slack example, R-014)', () => {
    expect(validateWebhookUrl(WEBHOOK_OK).ok).toBe(true);
    expect(validateWebhookUrl('https://hooks.slack.com/TEST/BTEST/X').ok).toBe(true);
  });

  it('a look-alike that got into the database is rejected again before sending', async () => {
    const t = setup();
    t.setSlack(1, 'https://hooks.slack.com.evil.test/services/TEST/BTEST/OK');
    t.subscribe(1, 'gdacs:DR', 'slack');
    received.length = 0;
    const [r] = await deliver(t.db, t.channels, t.newEvent());
    expect(r.status).toBe('failed');
    expect(r.error).toMatch(/only https:\/\/hooks\.slack\.com/);
    expect(received).toEqual([]);
  });
});

describe('demo inject goes through the whole pipeline (D-017)', () => {
  it('normalise → store (is_demo) → match → dispatch, to every subscribed channel', async () => {
    const t = setup();
    t.setSlack(1, WEBHOOK_OK);
    for (const ch of ['email', 'slack', 'log']) t.subscribe(1, 'gdacs:TC', ch);
    const r = await injectDemo(t.db, [gdacs], t.channels, 'gdacs', 'TC');
    expect(r.deliveries.map((d) => [d.channel, d.status])).toEqual([
      ['email', 'sent'],
      ['log', 'sent'],
      ['slack', 'sent'],
    ]);
    expect(t.db.prepare('SELECT is_demo, notify FROM events WHERE id = ?').get(r.eventId)).toEqual({ is_demo: 1, notify: 1 });
    expect(t.db.prepare('SELECT category_id FROM event_categories WHERE event_id = ?').all(r.eventId)).toEqual([{ category_id: 'gdacs:TC' }]);
    // The TC demo is a real stored tropical cyclone, not another event type relabelled (R-026).
    expect((t.db.prepare('SELECT subject FROM outbox').get() as { subject: string }).subject).toMatch(/^\[DEMO\] .*[Cc]yclone/);
  });

  it('injecting twice creates two events and delivers twice (design F2)', async () => {
    const t = setup();
    t.subscribe(1, 'gdacs:TC', 'email');
    const a = await injectDemo(t.db, [gdacs], t.channels, 'gdacs', 'TC');
    const b = await injectDemo(t.db, [gdacs], t.channels, 'gdacs', 'TC');
    expect(a.eventId).not.toBe(b.eventId);
    expect(count(t.db, "SELECT COUNT(*) n FROM deliveries WHERE status = 'sent'")).toBe(2);
  });

  // The injected item must belong to the category that was picked, not be another item relabelled (R-026, R-031).
  it.each(bbc.categories.map((c) => c.key))('BBC "%s": the injected story is a real item from that section\'s own feed', async (key) => {
    const t = setup();
    registerSource(t.db, bbc);
    const { eventId } = await injectDemo(t.db, [bbc], t.channels, 'bbc', key);
    expect(t.db.prepare('SELECT category_id FROM event_categories WHERE event_id = ?').all(eventId)).toEqual([{ category_id: `bbc:${key}` }]);
    const raw = JSON.parse((t.db.prepare('SELECT raw FROM events WHERE id = ?').get(eventId) as { raw: string }).raw) as { guid: string };
    const sectionFeed = bbc.parse(fixture(`bbc/${key}.rss`)) as { guid: string }[];
    expect(sectionFeed.map((i) => i.guid)).toContain(raw.guid);
  });

  it.each(unNews.categories.map((c) => c.key))('UN News "%s": the injected story is a real item from that feed', async (key) => {
    const t = setup();
    registerSource(t.db, unNews);
    const { eventId } = await injectDemo(t.db, [unNews], t.channels, 'un-news', key);
    expect(t.db.prepare('SELECT category_id FROM event_categories WHERE event_id = ?').all(eventId)).toEqual([{ category_id: `un-news:${key}` }]);
    const raw = JSON.parse((t.db.prepare('SELECT raw FROM events WHERE id = ?').get(eventId) as { raw: string }).raw) as { guid: string };
    const feed = unNews.parse(fixture(`un-news/${key.replace('/', '-')}.rss`)) as { guid: string }[];
    expect(feed.map((i) => i.guid)).toContain(raw.guid);
  });

  it.each(gdacs.categories.map((c) => c.key))('GDACS "%s": the injected event has the category and event type picked', async (key) => {
    const t = setup();
    const { eventId } = await injectDemo(t.db, [gdacs], t.channels, 'gdacs', key);
    expect(t.db.prepare('SELECT category_id FROM event_categories WHERE event_id = ?').all(eventId)).toEqual([{ category_id: `gdacs:${key}` }]);
    const raw = JSON.parse((t.db.prepare('SELECT raw FROM events WHERE id = ?').get(eventId) as { raw: string }).raw);
    expect(raw.properties.eventtype).toBe(key);
  });

  it('rejects an unknown category', async () => {
    const t = setup();
    await expect(injectDemo(t.db, [gdacs], t.channels, 'gdacs', 'XX')).rejects.toThrow(/unknown category/);
  });
});

describe('email', () => {
  it('without SMTP writes to the outbox; HTML is escaped', async () => {
    const t = setup();
    t.subscribe(1, 'gdacs:DR', 'email');
    const [eventId] = t.newEvent();
    t.db.prepare("UPDATE events SET title = '<script>x</script>' WHERE id = ?").run(eventId);
    await deliver(t.db, t.channels, [eventId]);
    const html = (t.db.prepare('SELECT html FROM outbox').get() as { html: string }).html;
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('with a transport (SMTP) sends through it instead of the outbox', async () => {
    const db = freshDb();
    seed(db);
    registerSource(db, gdacs);
    const sent: { to: string; subject: string }[] = [];
    const email = createEmailChannel(db, { SMTP_FROM: 'Test <t@example.com>' }, async (m) => void sent.push(m));
    db.prepare("INSERT INTO subscriptions VALUES (1, 'gdacs:TC', 'email', '2026-01-01T00:00:00.000Z')").run();
    await injectDemo(db, [gdacs], [email], 'gdacs', 'TC');
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ada@example.com');
    expect(count(db, 'SELECT COUNT(*) n FROM outbox')).toBe(0);
  });

  it('a title with line breaks cannot add a header: CR and LF are removed from the subject', async () => {
    const t = setup();
    t.subscribe(1, 'gdacs:DR', 'email');
    const [eventId] = t.newEvent();
    t.db.prepare('UPDATE events SET title = ? WHERE id = ?').run('Floods\r\nBcc: victim@example.com\nX: y', eventId);
    await deliver(t.db, t.channels, [eventId]);
    const { subject } = t.db.prepare('SELECT subject FROM outbox').get() as { subject: string };
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain('Floods Bcc: victim@example.com X: y');
  });
});
