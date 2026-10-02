import { XMLParser } from 'fast-xml-parser';

export type RssItem = { title: string; link: string | null; guid: string | null; pubDate: string | null };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (_name, jpath) => jpath === 'rss.channel.item',
});

// <guid isPermaLink="false">x</guid> parses to { '#text': 'x', '@_isPermaLink': 'false' }.
const text = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object') return text((v as Record<string, unknown>)['#text']);
  const s = String(v).trim();
  return s.length ? s : null;
};

// Parses an RSS 2.0 body into plain items. Shared by the BBC and UN News modules.
export function parseRss(body: string): RssItem[] {
  const doc = parser.parse(body) as { rss?: { channel?: { item?: unknown[] } } };
  const items = doc.rss?.channel?.item;
  if (!Array.isArray(items)) {
    if (!doc.rss) throw new Error('not an RSS document');
    return [];
  }
  return items.map((raw) => {
    const i = raw as Record<string, unknown>;
    return { title: text(i.title) ?? '', link: text(i.link), guid: text(i.guid), pubDate: text(i.pubDate) };
  });
}
