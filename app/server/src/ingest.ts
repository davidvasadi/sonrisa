import type { Db } from './db.js';
import type { NormalisedEvent } from './events.js';
import type { Source } from './sources/types.js';
import { now } from './time.js';

export type FeedResult =
  | { feedKey: string; ok: true; items: unknown[] }
  | { feedKey: string; ok: false; error: string };

export type IngestReport = {
  feedsOk: number;
  feedsFailed: number;
  items: number;
  itemErrors: string[];
  newEventIds: number[]; // stored with notify = 1: these go to matching (M7)
  baselineEventIds: number[]; // stored with notify = 0 (D-027)
  knownEvents: number; // already stored; new IDs or categories may have been linked
  unknownCategories: string[];
};

// Writes the source, its declared categories and its feeds. Safe on every start.
export function registerSource(db: Db, source: Source): void {
  db.transaction(() => {
    db.prepare('INSERT INTO sources (id, name) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name').run(
      source.id,
      source.name,
    );
    const cat = db.prepare(
      `INSERT INTO categories (id, source_id, key, label, declared) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT (id) DO UPDATE SET label = excluded.label, declared = 1`,
    );
    for (const c of source.categories) cat.run(`${source.id}:${c.key}`, source.id, c.key, c.label);
    const feed = db.prepare('INSERT OR IGNORE INTO feeds (source_id, feed_key) VALUES (?, ?)');
    for (const f of source.feeds) feed.run(source.id, f.key);
  })();
}

type Group = { event: NormalisedEvent; ids: string[]; categoryKeys: Set<string>; feedKeys: Set<string> };

// One poll's events, grouped so that the same story from several feeds (or with
// overlapping IDs) becomes one group with all its categories (design F1, D-028).
function group(entries: { event: NormalisedEvent; feedKey: string }[]): Group[] {
  const groups: Group[] = [];
  const byId = new Map<string, Group>();
  for (const { event, feedKey } of entries) {
    const hits = [...new Set(event.externalIds.map((id) => byId.get(id)).filter((g): g is Group => !!g))];
    let g: Group;
    if (hits.length === 0) {
      g = { event, ids: [], categoryKeys: new Set(), feedKeys: new Set() };
      groups.push(g);
    } else {
      g = hits[0];
      for (const other of hits.slice(1)) {
        // Two groups joined by this event's IDs: merge them into the first.
        for (const id of other.ids) if (!g.ids.includes(id)) g.ids.push(id);
        other.categoryKeys.forEach((k) => g.categoryKeys.add(k));
        other.feedKeys.forEach((k) => g.feedKeys.add(k));
        groups.splice(groups.indexOf(other), 1);
      }
    }
    for (const id of event.externalIds) if (!g.ids.includes(id)) g.ids.push(id);
    g.categoryKeys.add(event.categoryKey);
    g.feedKeys.add(feedKey);
    for (const id of g.ids) byId.set(id, g);
  }
  return groups;
}

export function ingestPoll(db: Db, source: Source, results: FeedResult[], at: string = now()): IngestReport {
  const report: IngestReport = {
    feedsOk: 0,
    feedsFailed: 0,
    items: 0,
    itemErrors: [],
    newEventIds: [],
    baselineEventIds: [],
    knownEvents: 0,
    unknownCategories: [],
  };

  // Which feeds were baselined before this poll (D-027: per feed, persisted).
  const baselined = new Set(
    (
      db.prepare('SELECT feed_key FROM feeds WHERE source_id = ? AND baselined_at IS NOT NULL').all(source.id) as {
        feed_key: string;
      }[]
    ).map((r) => r.feed_key),
  );

  const entries: { event: NormalisedEvent; feedKey: string }[] = [];
  for (const r of results) {
    if (!r.ok) continue;
    for (const item of r.items) {
      report.items += 1;
      try {
        entries.push({ event: source.normalise(item, r.feedKey), feedKey: r.feedKey });
      } catch (e) {
        report.itemErrors.push(`${r.feedKey}: ${(e as Error).message}`);
      }
    }
  }

  const findKey = db.prepare('SELECT event_id FROM event_keys WHERE source_id = ? AND external_id = ?');
  const insertKey = db.prepare('INSERT OR IGNORE INTO event_keys (source_id, external_id, event_id) VALUES (?, ?, ?)');
  const insertEvent = db.prepare(
    `INSERT INTO events (source_id, title, occurred_at, published_at, location_text, lat, lon, severity, link,
                         is_forecast, is_demo, raw, ingested_at, notify)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
  );
  const findCategory = db.prepare('SELECT id FROM categories WHERE id = ?');
  const insertCategory = db.prepare('INSERT INTO categories (id, source_id, key, label, declared) VALUES (?, ?, ?, ?, 0)');
  const linkCategory = db.prepare('INSERT OR IGNORE INTO event_categories (event_id, category_id) VALUES (?, ?)');
  const feedAttempt = db.prepare(
    'UPDATE feeds SET last_attempt_at = ?, last_success_at = ?, last_error = NULL WHERE source_id = ? AND feed_key = ?',
  );
  const feedFailed = db.prepare('UPDATE feeds SET last_attempt_at = ?, last_error = ? WHERE source_id = ? AND feed_key = ?');
  const setBaselined = db.prepare(
    'UPDATE feeds SET baselined_at = ? WHERE source_id = ? AND feed_key = ? AND baselined_at IS NULL',
  );

  const categoryId = (key: string) => {
    const id = `${source.id}:${key}`;
    if (!findCategory.get(id)) {
      // A value the module didn't declare: store it under its raw code, never drop it.
      insertCategory.run(id, source.id, key, key);
      report.unknownCategories.push(key);
    }
    return id;
  };

  db.transaction(() => {
    for (const r of results) {
      if (r.ok) {
        report.feedsOk += 1;
        feedAttempt.run(at, at, source.id, r.feedKey);
      } else {
        report.feedsFailed += 1;
        feedFailed.run(at, r.error, source.id, r.feedKey);
      }
    }

    for (const g of group(entries)) {
      const known = g.ids
        .map((id) => (findKey.get(source.id, id) as { event_id: number } | undefined)?.event_id)
        .filter((id): id is number => id !== undefined);

      if (known.length > 0) {
        // Already stored (event dedup, D-005). Record new IDs and new categories, notify nobody (D-028).
        const eventId = Math.min(...known);
        for (const id of g.ids) insertKey.run(source.id, id, eventId);
        for (const k of g.categoryKeys) linkCategory.run(eventId, categoryId(k));
        report.knownEvents += 1;
        continue;
      }

      // New to us. Notify only if it came from a feed that was already baselined (D-027).
      const notify = [...g.feedKeys].some((k) => baselined.has(k));
      const e = g.event;
      const isForecast = e.occurredAt !== null && e.occurredAt > at;
      const { lastInsertRowid } = insertEvent.run(
        source.id, e.title, e.occurredAt, e.publishedAt, e.location.text, e.location.lat, e.location.lon,
        e.severity, e.link, isForecast ? 1 : 0, JSON.stringify(e.raw), at, notify ? 1 : 0,
      );
      const eventId = Number(lastInsertRowid);
      for (const id of g.ids) insertKey.run(source.id, id, eventId);
      for (const k of g.categoryKeys) linkCategory.run(eventId, categoryId(k));
      (notify ? report.newEventIds : report.baselineEventIds).push(eventId);
    }

    // A feed's first successful fetch is its baseline (D-027). Failed feeds stay un-baselined.
    for (const r of results) if (r.ok) setBaselined.run(at, source.id, r.feedKey);
  })();

  return report;
}
