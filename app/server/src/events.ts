// The common event format (design: "Common event format", D-017).
export type NormalisedEvent = {
  sourceId: string;
  externalIds: string[]; // first = primary; all are used for dedup (USGS lists several)
  categoryKey: string; // source-specific, e.g. 'significant', 'TC', 'world', 'topic/health'
  title: string;
  occurredAt: string | null; // ISO 8601 UTC
  publishedAt: string | null; // ISO 8601 UTC
  location: { text: string | null; lat: number | null; lon: number | null };
  severity: string | null; // display only, never used for filtering (D-018)
  link: string | null; // http(s) only
  raw: unknown;
};

export function httpLink(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// Turns any date the sources use into ISO 8601 UTC, or null if it can't be parsed.
export function toIso(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
