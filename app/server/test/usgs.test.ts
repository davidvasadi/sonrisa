import { describe, expect, it } from 'vitest';
import { ingestPoll, registerSource } from '../src/ingest.js';
import { usgs } from '../src/sources/usgs.js';
import { pollSource } from '../src/worker.js';
import { count, fixture, freshDb } from './helpers.js';

const month = fixture('usgs/significant_month.geojson');
const feed = usgs.feeds[0].key;

describe('usgs: parse and normalise (real response)', () => {
  it('reads all 8 features of significant_month', () => {
    expect(usgs.parse(month)).toHaveLength(8);
  });

  it('an empty feed (significant_day had no events, no bbox) parses to nothing', () => {
    expect(usgs.parse(fixture('usgs/significant_day.geojson'))).toEqual([]);
  });

  it('maps the first feature exactly as stored', () => {
    const e = usgs.normalise(usgs.parse(month)[0], feed);
    expect(e).toMatchObject({
      sourceId: 'usgs',
      externalIds: ['uw714111952', 'ew1790715960', 'us6000tyf3'],
      categoryKey: 'significant',
      title: 'M 4.2 - 6 km WNW of Wauna, Washington',
      occurredAt: '2026-09-29T21:05:56.370Z',
      location: { text: '6 km WNW of Wauna, Washington', lat: 47.4003333333333, lon: -122.722 },
      severity: 'M4.15 ml',
      link: 'https://earthquake.usgs.gov/earthquakes/eventpage/uw714111952',
    });
  });
});

describe('usgs: ingest', () => {
  function setup() {
    const db = freshDb();
    registerSource(db, usgs);
    return db;
  }
  const items = () => usgs.parse(month);

  it('first poll is a baseline: everything stored, nobody to notify (D-027)', () => {
    const db = setup();
    const r = ingestPoll(db, usgs, [{ feedKey: feed, ok: true, items: items() }], '2026-10-02T14:00:00.000Z');
    expect(r.baselineEventIds).toHaveLength(8);
    expect(r.newEventIds).toEqual([]);
    expect(count(db, 'SELECT COUNT(*) n FROM events WHERE notify = 0')).toBe(8);
    expect(db.prepare('SELECT baselined_at, last_success_at, last_error FROM feeds').get()).toEqual({
      baselined_at: '2026-10-02T14:00:00.000Z',
      last_success_at: '2026-10-02T14:00:00.000Z',
      last_error: null,
    });
  });

  it('the same items again create no new events (event dedup)', () => {
    const db = setup();
    ingestPoll(db, usgs, [{ feedKey: feed, ok: true, items: items() }]);
    const r = ingestPoll(db, usgs, [{ feedKey: feed, ok: true, items: items() }]);
    expect(r.knownEvents).toBe(8);
    expect(r.newEventIds).toEqual([]);
    expect(count(db, 'SELECT COUNT(*) n FROM events')).toBe(8);
  });

  it('an item new after the baseline is stored with notify = 1', () => {
    const db = setup();
    const all = items();
    ingestPoll(db, usgs, [{ feedKey: feed, ok: true, items: all.slice(1) }]);
    const r = ingestPoll(db, usgs, [{ feedKey: feed, ok: true, items: all }]);
    expect(r.newEventIds).toHaveLength(1);
    expect(db.prepare('SELECT title, notify FROM events WHERE id = ?').get(r.newEventIds[0])).toEqual({
      title: 'M 4.2 - 6 km WNW of Wauna, Washington',
      notify: 1,
    });
  });

  it('a changed primary id is matched through an alias in properties.ids', () => {
    const db = setup();
    const first = items()[0] as { id: string; properties: { ids: string } };
    ingestPoll(db, usgs, [{ feedKey: feed, ok: true, items: [first] }]);
    // Same quake, now led by another network and with one extra id.
    const later = { ...first, id: 'us6000tyf3', properties: { ...first.properties, ids: ',us6000tyf3,ew1790715960,zz123,' } };
    const r = ingestPoll(db, usgs, [{ feedKey: feed, ok: true, items: [later] }]);
    expect(r.knownEvents).toBe(1);
    expect(count(db, 'SELECT COUNT(*) n FROM events')).toBe(1);
    expect(count(db, "SELECT COUNT(*) n FROM event_keys WHERE external_id = 'zz123'")).toBe(1);
  });

  it('a failed first fetch records the error and does not baseline; the later success does', () => {
    const db = setup();
    ingestPoll(db, usgs, [{ feedKey: feed, ok: false, error: 'HTTP 503' }], '2026-10-02T14:00:00.000Z');
    expect(db.prepare('SELECT baselined_at, last_success_at, last_error FROM feeds').get()).toEqual({
      baselined_at: null,
      last_success_at: null,
      last_error: 'HTTP 503',
    });
    const r = ingestPoll(db, usgs, [{ feedKey: feed, ok: true, items: items() }], '2026-10-02T14:02:00.000Z');
    expect(r.newEventIds).toEqual([]); // still a baseline: it can't flood anyone (design F3)
    expect(r.baselineEventIds).toHaveLength(8);
  });

  it('pollSource fetches the feed URL and ingests it', async () => {
    const db = setup();
    const urls: string[] = [];
    const r = await pollSource(db, usgs, async (url) => {
      urls.push(url);
      return month;
    });
    expect(urls).toEqual(['https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson']);
    expect(r.baselineEventIds).toHaveLength(8);
  });

  it('a body that is not JSON fails the feed, not the poll', async () => {
    const db = setup();
    const r = await pollSource(db, usgs, async () => '<html>maintenance</html>');
    expect(r.feedsFailed).toBe(1);
    expect((db.prepare('SELECT last_error FROM feeds').get() as { last_error: string }).last_error).toMatch(/JSON/);
  });
});
