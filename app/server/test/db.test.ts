import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';
import { now } from '../src/time.js';

function dbWithEvent() {
  const db = openDb(':memory:');
  seed(db);
  db.prepare("INSERT INTO sources (id, name) VALUES ('usgs', 'USGS')").run();
  const { lastInsertRowid } = db
    .prepare("INSERT INTO events (source_id, title, ingested_at, notify) VALUES ('usgs', 'M 6.1', ?, 1)")
    .run(now());
  return { db, eventId: Number(lastInsertRowid) };
}

describe('schema', () => {
  it('creates every core table', () => {
    const db = openDb(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name);
    expect(tables).toEqual([
      'categories', 'deliveries', 'destinations', 'event_categories', 'event_keys',
      'events', 'feeds', 'sources', 'subscriptions', 'users',
    ]);
  });

  it('event dedup: the same external ID twice for one source is rejected', () => {
    const { db, eventId } = dbWithEvent();
    const insertKey = db.prepare('INSERT INTO event_keys (source_id, external_id, event_id) VALUES (?, ?, ?)');
    insertKey.run('usgs', 'us6000tyf3', eventId);
    expect(() => insertKey.run('usgs', 'us6000tyf3', eventId)).toThrow(/UNIQUE constraint failed/);
    // The same ID from another source is a different event.
    db.prepare("INSERT INTO sources (id, name) VALUES ('gdacs', 'GDACS')").run();
    expect(() => insertKey.run('gdacs', 'us6000tyf3', eventId)).not.toThrow();
  });

  it('notification dedup: one delivery per event, user and channel', () => {
    const { db, eventId } = dbWithEvent();
    const insert = db.prepare(
      "INSERT OR IGNORE INTO deliveries (event_id, user_id, channel, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
    );
    expect(insert.run(eventId, 1, 'email', now()).changes).toBe(1);
    expect(insert.run(eventId, 1, 'email', now()).changes).toBe(0);
    expect(insert.run(eventId, 1, 'log', now()).changes).toBe(1);
    expect(insert.run(eventId, 2, 'email', now()).changes).toBe(1);
  });

  it('rejects an unknown delivery status', () => {
    const { db, eventId } = dbWithEvent();
    expect(() =>
      db
        .prepare("INSERT INTO deliveries (event_id, user_id, channel, status, created_at) VALUES (?, 1, 'email', 'retrying', ?)")
        .run(eventId, now()),
    ).toThrow(/CHECK constraint failed/);
  });
});

describe('seed', () => {
  it('creates 3 demo users with email and log destinations, and is safe to run twice', () => {
    const db = openDb(':memory:');
    seed(db);
    seed(db);
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 3 });
    const rows = db.prepare('SELECT user_id, channel, config FROM destinations ORDER BY user_id, channel').all();
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({ user_id: 1, channel: 'email', config: '{"address":"ada@example.com"}' });
    expect(rows[1]).toEqual({ user_id: 1, channel: 'log', config: '{}' });
  });
});

describe('time', () => {
  it('writes ISO 8601 UTC timestamps that sort correctly as strings', () => {
    const t = now();
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
