import { httpLink, toIso, type NormalisedEvent } from '../events.js';
import type { Source } from './types.js';

// USGS significant earthquakes, past day (D-025). Field paths checked against
// process/03-research/raw-responses/usgs/significant_month.geojson (same feed family).
// An empty feed has "features": [] and no "bbox" (significant_day.geojson).
type Feature = {
  id: string;
  properties: {
    mag: number | null;
    magType: string | null;
    place: string | null;
    time: number;
    url: string;
    ids: string;
    title: string;
  };
  geometry: { type: string; coordinates: [number, number, number] } | null;
};

export const usgs: Source = {
  id: 'usgs',
  name: 'USGS Earthquakes',
  pollIntervalMs: 2 * 60_000,
  categories: [{ key: 'significant', label: 'Significant earthquakes' }],
  feeds: [
    { key: 'significant_day', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson' },
  ],

  parse(body) {
    const data = JSON.parse(body) as { features?: unknown[] };
    return Array.isArray(data.features) ? data.features : [];
  },

  normalise(item): NormalisedEvent {
    const f = item as Feature;
    const p = f.properties;
    // properties.ids looks like ",ew1790715960,uw714111952,us6000tyf3,"; id comes first.
    const aliases = p.ids.split(',').filter((s) => s.length > 0);
    const externalIds = [f.id, ...aliases.filter((s) => s !== f.id)];
    const point = f.geometry?.type === 'Point' ? f.geometry.coordinates : null;
    return {
      sourceId: 'usgs',
      externalIds,
      categoryKey: 'significant',
      title: p.title,
      occurredAt: toIso(p.time),
      publishedAt: toIso(p.time),
      location: { text: p.place, lat: point ? point[1] : null, lon: point ? point[0] : null },
      severity: p.mag === null ? null : `M${p.mag} ${p.magType ?? ''}`.trim(),
      link: httpLink(p.url),
      raw: item,
    };
  },
};
