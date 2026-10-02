import { afterEach, describe, expect, it } from 'vitest';
import { createLogChannel } from '../src/channels/log.js';
import { registerSource } from '../src/ingest.js';
import { seed } from '../src/seed.js';
import type { Source } from '../src/sources/types.js';
import { usgs } from '../src/sources/usgs.js';
import { startWorker, type FetchText } from '../src/worker.js';
import { count, fixture, freshDb } from './helpers.js';

// The worker is the only path from a real poll to matching and dispatch. These tests run it with
// a short interval, a fake fetch and the real ingest, match and dispatch code.
const month = fixture('usgs/significant_month.geojson');
const all = JSON.parse(month) as { features: unknown[] };
const withoutFirst = JSON.stringify({ ...all, features: all.features.slice(1) });
const fast: Source = { ...usgs, pollIntervalMs: 20 };

async function until(check: () => boolean, ms = 2000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

let stop: (() => void) | undefined;
afterEach(() => stop?.());

function setup() {
  const db = freshDb();
  seed(db); // users 1-3, each with a log destination
  registerSource(db, fast); // the worker does this too; here so the test can subscribe first
  const logs: string[] = [];
  const sent: string[] = [];
  return { db, logs, sent, channels: [createLogChannel((m) => sent.push(m))] };
}

describe('worker: poll → match → dispatch', () => {
  it('delivers an event that is new after the baseline, and nothing from the baseline itself', async () => {
    const t = setup();
    let calls = 0;
    const fetch: FetchText = async () => (++calls === 1 ? withoutFirst : month);
    t.db.prepare("INSERT INTO subscriptions (user_id, category_id, channel, created_at) VALUES (1, 'usgs:significant', 'log', '2026-01-01T00:00:00.000Z')").run();
    stop = startWorker(t.db, [fast], { channels: t.channels, fetch, log: (m) => t.logs.push(m) }).stop;

    await until(() => t.logs.some((l) => l.startsWith('deliver usgs:')));
    await until(() => calls >= 4); // a few more polls of the same feed
    stop();

    expect(t.logs.find((l) => l.startsWith('poll usgs:'))).toMatch(/new 0, baseline 7/);
    expect(t.logs.filter((l) => l.startsWith('deliver usgs:'))).toEqual(['deliver usgs: 1 deliveries, 1 sent, 0 failed']);
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0]).toContain('M 4.2 - 6 km WNW of Wauna, Washington');
    expect(count(t.db, "SELECT COUNT(*) n FROM deliveries WHERE status = 'sent'")).toBe(1);
  });

  it('never polls a source twice at the same time', async () => {
    const t = setup();
    let calls = 0;
    let release!: () => void;
    const fetch: FetchText = () => {
      calls += 1;
      return new Promise((resolve) => (release = () => resolve(month)));
    };
    stop = startWorker(t.db, [fast], { channels: t.channels, fetch, log: (m) => t.logs.push(m) }).stop;
    await new Promise((r) => setTimeout(r, 150)); // about 7 intervals while the first fetch hangs
    expect(calls).toBe(1);
    release();
    await until(() => calls >= 2); // once it finishes, the next interval polls again
  });

  it('a failed fetch is logged, and the next poll still runs', async () => {
    const t = setup();
    let calls = 0;
    const fetch: FetchText = async () => {
      calls += 1;
      if (calls === 1) throw new Error('network down');
      return month;
    };
    stop = startWorker(t.db, [fast], { channels: t.channels, fetch, log: (m) => t.logs.push(m) }).stop;
    await until(() => t.logs.some((l) => /poll usgs: feeds 1 ok/.test(l)));
    expect(t.logs.find((l) => l.startsWith('poll usgs:'))).toMatch(/feeds 0 ok \/ 1 failed/);
    expect(t.db.prepare('SELECT baselined_at IS NOT NULL AS b FROM feeds').get()).toEqual({ b: 1 });
  });
});
