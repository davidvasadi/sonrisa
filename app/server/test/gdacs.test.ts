import { describe, expect, it } from 'vitest';
import { ingestPoll, registerSource } from '../src/ingest.js';
import { gdacs } from '../src/sources/gdacs.js';
import { count, fixture, freshDb } from './helpers.js';

const list = fixture('gdacs/eventlist-default.json');

describe('gdacs: parse and normalise (real response)', () => {
  it('reads all 88 features', () => {
    expect(gdacs.parse(list)).toHaveLength(88);
  });

  it('maps the first feature exactly as stored', () => {
    const e = gdacs.normalise(gdacs.parse(list)[0], 'eventlist');
    expect(e).toMatchObject({
      externalIds: ['DR1018332'],
      categoryKey: 'DR',
      occurredAt: '2025-12-21T00:00:00.000Z',
      publishedAt: '2026-10-02T07:08:01.000Z',
      location: { lat: 48.764, lon: 13.696 },
      severity: 'Orange: Medium impact for agricultural drought in 1759971 km2',
      link: 'https://www.gdacs.org/report.aspx?eventid=1018332&episodeid=24&eventtype=DR',
    });
    expect(e.title.startsWith('Drought in Austria, Bosnia and Herzegovina')).toBe(true);
    expect(e.title.endsWith('Ukraine')).toBe(true); // trailing ", " trimmed
  });

  it('every event type in the response is a declared category', () => {
    const declared = new Set(gdacs.categories.map((c) => c.key));
    const seen = new Set(gdacs.parse(list).map((i) => gdacs.normalise(i, 'eventlist').categoryKey));
    expect([...seen].filter((k) => !declared.has(k))).toEqual([]);
  });
});

describe('gdacs: ingest', () => {
  it('stores each event once with its eventtype as category', () => {
    const db = freshDb();
    registerSource(db, gdacs);
    const items = gdacs.parse(list);
    ingestPoll(db, gdacs, [{ feedKey: 'eventlist', ok: true, items }]);
    expect(count(db, 'SELECT COUNT(*) n FROM events')).toBe(88);
    expect(count(db, "SELECT COUNT(*) n FROM event_categories WHERE category_id = 'gdacs:EQ'")).toBe(23);
  });

  it('a new episode of a known event is not a new event', () => {
    const db = freshDb();
    registerSource(db, gdacs);
    const first = gdacs.parse(list)[0] as { properties: Record<string, unknown> };
    ingestPoll(db, gdacs, [{ feedKey: 'eventlist', ok: true, items: [first] }]);
    const next = { ...first, properties: { ...first.properties, episodeid: 25 } };
    const r = ingestPoll(db, gdacs, [{ feedKey: 'eventlist', ok: true, items: [next] }]);
    expect(r.knownEvents).toBe(1);
    expect(r.newEventIds).toEqual([]);
  });

  it('an event that starts after ingest time is marked as a forecast', () => {
    const db = freshDb();
    registerSource(db, gdacs);
    const items = gdacs.parse(list).slice(0, 1); // fromdate 2025-12-21
    ingestPoll(db, gdacs, [{ feedKey: 'eventlist', ok: true, items }], '2025-12-01T00:00:00.000Z');
    expect(count(db, 'SELECT COUNT(*) n FROM events WHERE is_forecast = 1')).toBe(1);
  });

  it('an undeclared event type gets an auto-created category, not dropped', () => {
    const db = freshDb();
    registerSource(db, gdacs);
    const first = gdacs.parse(list)[0] as { properties: Record<string, unknown> };
    const odd = { ...first, properties: { ...first.properties, eventtype: 'TS', eventid: 1 } };
    const r = ingestPoll(db, gdacs, [{ feedKey: 'eventlist', ok: true, items: [odd] }]);
    expect(r.unknownCategories).toEqual(['TS']);
    expect(db.prepare("SELECT label, declared FROM categories WHERE id = 'gdacs:TS'").get()).toEqual({ label: 'TS', declared: 0 });
  });
});
