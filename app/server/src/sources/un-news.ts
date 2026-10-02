import { httpLink, toIso, type NormalisedEvent } from '../events.js';
import { parseRss, type RssItem } from './rss.js';
import type { Source } from './types.js';

// UN News topic and region feeds (D-025). The slugs below are the ones verified in M3
// (each stored with 30 items). The directory page returns 403, so the list may be incomplete.
const feeds = [
  { key: 'topic/climate-change', label: 'Climate change' },
  { key: 'topic/humanitarian-aid', label: 'Humanitarian aid' },
  { key: 'topic/peace-and-security', label: 'Peace and security' },
  { key: 'topic/economic-development', label: 'Economic development' },
  { key: 'topic/health', label: 'Health' },
  { key: 'topic/human-rights', label: 'Human rights' },
  { key: 'topic/women', label: 'Women' },
  { key: 'topic/law-and-crime-prevention', label: 'Law and crime prevention' },
  { key: 'topic/migrants-and-refugees', label: 'Migrants and refugees' },
  { key: 'topic/un-affairs', label: 'UN affairs' },
  { key: 'topic/sdgs', label: 'SDGs' },
  { key: 'topic/culture-and-education', label: 'Culture and education' },
  { key: 'region/africa', label: 'Africa' },
  { key: 'region/americas', label: 'Americas' },
  { key: 'region/asia-pacific', label: 'Asia Pacific' },
  { key: 'region/middle-east', label: 'Middle East' },
  { key: 'region/europe', label: 'Europe' },
];

export const unNews: Source = {
  id: 'un-news',
  name: 'UN News',
  pollIntervalMs: 15 * 60_000,
  categories: feeds.map(({ key, label }) => ({ key, label })),
  feeds: feeds.map(({ key }) => ({ key, url: `https://news.un.org/feed/subscribe/en/news/${key}/feed/rss.xml` })),

  parse: parseRss,

  normalise(item, feedKey): NormalisedEvent {
    const i = item as RssItem;
    const id = i.guid ?? i.link;
    if (!id) throw new Error('item has neither guid nor link');
    return {
      sourceId: 'un-news',
      externalIds: [id],
      categoryKey: feedKey,
      title: i.title,
      occurredAt: null,
      publishedAt: toIso(i.pubDate), // always 12:00:00: UN News gives the date only
      location: { text: null, lat: null, lon: null },
      severity: null,
      link: httpLink(i.link),
      raw: item,
    };
  },
};
