import { describe, expect, it } from 'vitest';
import { ingestPoll, registerSource } from '../src/ingest.js';
import { bbc } from '../src/sources/bbc.js';
import { parseRss } from '../src/sources/rss.js';
import { unNews } from '../src/sources/un-news.js';
import { count, fixture, freshDb } from './helpers.js';

const world = fixture('bbc/world.rss');
const top = fixture('bbc/top-stories.rss');
const business = fixture('bbc/business.rss');
const shared = 'https://www.bbc.co.uk/news/articles/c6je85jzk9y7o'; // in all three feeds, as #0 and #2

describe('bbc: parse and normalise (real response)', () => {
  it('reads every item of each feed', () => {
    expect(parseRss(world)).toHaveLength(30);
    expect(parseRss(top)).toHaveLength(29);
    expect(parseRss(business)).toHaveLength(52);
  });

  it('maps the first World item exactly as stored', () => {
    const e = bbc.normalise(bbc.parse(world)[0], 'world');
    expect(e).toMatchObject({
      sourceId: 'bbc',
      externalIds: ['https://www.bbc.co.uk/news/articles/c639m98gde00o'], // guid was ...c639m98gde00o#0
      categoryKey: 'world',
      title: "'I was not going to let others die' - pilot of Flydubai flight describes cockpit attack by co-pilot",
      publishedAt: '2026-10-02T09:08:06.000Z',
      link: 'https://www.bbc.co.uk/news/articles/c639m98gde00o', // ?at_medium=RSS&at_campaign=rss removed
      severity: null,
    });
  });

  it('a non-RSS body is an error, so the feed is marked failed', () => {
    expect(() => parseRss('<html><body>blocked</body></html>')).toThrow(/not an RSS document/);
  });
});

describe('bbc: one story in several feeds (D-028, design F1)', () => {
  const setup = () => {
    const db = freshDb();
    registerSource(db, bbc);
    return db;
  };
  const eventFor = (db: ReturnType<typeof freshDb>) =>
    (db.prepare("SELECT event_id FROM event_keys WHERE source_id = 'bbc' AND external_id = ?").get(shared) as { event_id: number })
      .event_id;

  it('same poll: one event linked to every feed it appeared in, though its guid suffix differs (#0 vs #2)', () => {
    const db = setup();
    ingestPoll(db, bbc, [
      { feedKey: 'world', ok: true, items: bbc.parse(world) },
      { feedKey: 'top-stories', ok: true, items: bbc.parse(top) },
      { feedKey: 'business', ok: true, items: bbc.parse(business) },
    ]);
    const cats = db.prepare('SELECT category_id FROM event_categories WHERE event_id = ? ORDER BY 1').all(eventFor(db));
    expect(cats).toEqual([{ category_id: 'bbc:business' }, { category_id: 'bbc:top-stories' }, { category_id: 'bbc:world' }]);
    expect(count(db, "SELECT COUNT(*) n FROM event_keys WHERE external_id LIKE '%c6je85jzk9y7o%'")).toBe(1);
  });

  it('later poll: a new feed for a known story links the category and notifies nobody', () => {
    const db = setup();
    ingestPoll(db, bbc, [{ feedKey: 'world', ok: true, items: bbc.parse(world) }]);
    ingestPoll(db, bbc, [{ feedKey: 'world', ok: true, items: bbc.parse(world) }]); // world now baselined
    const r = ingestPoll(db, bbc, [{ feedKey: 'top-stories', ok: true, items: bbc.parse(top) }]);
    expect(r.newEventIds).toEqual([]); // top-stories' first fetch is its own baseline
    const cats = db.prepare('SELECT category_id FROM event_categories WHERE event_id = ? ORDER BY 1').all(eventFor(db));
    expect(cats).toEqual([{ category_id: 'bbc:top-stories' }, { category_id: 'bbc:world' }]);
  });

  it('a story new in a baselined feed is notified even if a not-yet-baselined feed carries it too', () => {
    const db = setup();
    const worldItems = bbc.parse(world) as { guid: string }[];
    const withoutShared = worldItems.filter((i) => !i.guid.startsWith(shared));
    ingestPoll(db, bbc, [{ feedKey: 'world', ok: true, items: withoutShared }]); // baseline world, without the story
    // The not-yet-baselined feed comes first, so the story is first seen there. Only grouping
    // the whole poll before storing gets this right (mutation check, see R-021).
    const r = ingestPoll(db, bbc, [
      { feedKey: 'top-stories', ok: true, items: bbc.parse(top) }, // first fetch: baseline
      { feedKey: 'world', ok: true, items: worldItems }, // story is new in a baselined feed
    ]);
    expect(r.newEventIds).toHaveLength(1);
    expect(r.newEventIds[0]).toBe(eventFor(db));
  });
});

describe('un-news: parse and normalise (real response)', () => {
  it('reads the gzip-stored health feed after decompression, 30 items', () => {
    expect(unNews.parse(fixture('un-news/topic-health.rss'))).toHaveLength(30);
  });

  it('maps the first climate-change item exactly as stored', () => {
    const e = unNews.normalise(unNews.parse(fixture('un-news/topic-climate-change.rss'))[0], 'topic/climate-change');
    expect(e).toMatchObject({
      externalIds: ['https://news.un.org/en/story/2026/09/1168473'],
      categoryKey: 'topic/climate-change',
      title: 'From energy crisis to energy transition: How renewables are reshaping energy security',
      publishedAt: '2026-09-28T12:00:00.000Z',
      link: 'https://news.un.org/feed/view/en/story/2026/09/1168473',
    });
  });

  it('a story in two topic feeds of one poll is one event with both categories', () => {
    const db = freshDb();
    registerSource(db, unNews);
    ingestPoll(db, unNews, [
      { feedKey: 'topic/humanitarian-aid', ok: true, items: unNews.parse(fixture('un-news/topic-humanitarian-aid.rss')) },
      { feedKey: 'topic/health', ok: true, items: unNews.parse(fixture('un-news/topic-health.rss')) },
    ]);
    expect(count(db, 'SELECT COUNT(*) n FROM events')).toBe(59); // 30 + 30 - 1 shared
    expect(count(db, 'SELECT COUNT(*) n FROM (SELECT event_id FROM event_categories GROUP BY event_id HAVING COUNT(*) = 2)')).toBe(1);
  });
});
