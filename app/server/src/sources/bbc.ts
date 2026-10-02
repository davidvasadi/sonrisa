import { httpLink, toIso, type NormalisedEvent } from '../events.js';
import { parseRss, type RssItem } from './rss.js';
import type { Source } from './types.js';

// BBC News section feeds (D-025, D-031). Field paths checked against the stored
// feeds in process/03-research/raw-responses/bbc/.
const sections = [
  { key: 'top-stories', label: 'Top stories', path: 'rss.xml' },
  { key: 'world', label: 'World', path: 'world/rss.xml' },
  { key: 'business', label: 'Business', path: 'business/rss.xml' },
  { key: 'politics', label: 'Politics', path: 'politics/rss.xml' },
  { key: 'science_and_environment', label: 'Science & environment', path: 'science_and_environment/rss.xml' },
  { key: 'technology', label: 'Technology', path: 'technology/rss.xml' },
  { key: 'health', label: 'Health', path: 'health/rss.xml' },
];

// The guid's "#n" suffix differs for the same article between feeds and even within
// one feed (#0 in business, #2 in world; #1 and #3 both in business). The article URL
// without it is the stable ID (found in M6, see R-020).
const articleId = (guid: string) => guid.split('#')[0];

// BBC links carry ?at_medium=RSS&at_campaign=rss; drop those two parameters.
function cleanLink(link: string | null): string | null {
  const ok = httpLink(link);
  if (!ok) return null;
  const u = new URL(ok);
  u.searchParams.delete('at_medium');
  u.searchParams.delete('at_campaign');
  return u.toString();
}

export const bbc: Source = {
  id: 'bbc',
  name: 'BBC News',
  pollIntervalMs: 5 * 60_000,
  categories: sections.map(({ key, label }) => ({ key, label })),
  feeds: sections.map(({ key, path }) => ({ key, url: `https://feeds.bbci.co.uk/news/${path}` })),

  parse: parseRss,

  normalise(item, feedKey): NormalisedEvent {
    const i = item as RssItem;
    const id = i.guid ?? i.link;
    if (!id) throw new Error('item has neither guid nor link');
    return {
      sourceId: 'bbc',
      externalIds: [articleId(id)],
      categoryKey: feedKey,
      title: i.title,
      occurredAt: null,
      publishedAt: toIso(i.pubDate),
      location: { text: null, lat: null, lon: null },
      severity: null,
      link: cleanLink(i.link),
      raw: item,
    };
  },
};
