import { httpLink, toIso, type NormalisedEvent } from '../events.js';
import type { Source } from './types.js';

// GDACS default event list: Orange and Red alerts only (D-025). Field paths checked
// against process/03-research/raw-responses/gdacs/eventlist-default.json.
type Feature = {
  properties: {
    eventtype: string;
    eventid: number;
    name: string;
    fromdate: string; // no time zone in the response: read as UTC (unverified)
    datemodified: string; // same
    alertlevel: string;
    country: string | null;
    url: { report?: string };
    severitydata?: { severitytext?: string };
  };
  geometry: { type: string; coordinates: [number, number] } | null;
};

// "2026-08-09T01:00:00" has no zone; we append Z (assumed UTC, unverified).
const utc = (s: string | null | undefined) => (s ? toIso(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`) : null);
// Names and countries end in ", " in the real data.
const tidy = (s: string | null | undefined) => (s ?? '').replace(/[\s,]+$/, '').replace(/\s+/g, ' ') || null;

export const gdacs: Source = {
  id: 'gdacs',
  name: 'GDACS',
  pollIntervalMs: 10 * 60_000,
  categories: [
    { key: 'EQ', label: 'Earthquakes' },
    { key: 'TC', label: 'Tropical cyclones' },
    { key: 'FL', label: 'Floods' },
    { key: 'VO', label: 'Volcanoes' },
    { key: 'DR', label: 'Droughts' },
    { key: 'WF', label: 'Wildfires' },
  ],
  feeds: [{ key: 'eventlist', url: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH' }],

  parse(body) {
    const data = JSON.parse(body) as { features?: unknown[] };
    return Array.isArray(data.features) ? data.features : [];
  },

  normalise(item): NormalisedEvent {
    const { properties: p, geometry } = item as Feature;
    const point = geometry?.type === 'Point' ? geometry.coordinates : null;
    const severity = [p.alertlevel, p.severitydata?.severitytext].filter(Boolean).join(': ');
    return {
      sourceId: 'gdacs',
      // Same shape as the RSS guid (e.g. FL1104169). A new episodeid is an update, not a new event.
      externalIds: [`${p.eventtype}${p.eventid}`],
      categoryKey: p.eventtype,
      title: tidy(p.name) ?? `${p.eventtype} ${p.eventid}`,
      occurredAt: utc(p.fromdate),
      publishedAt: utc(p.datemodified),
      location: { text: tidy(p.country), lat: point ? point[1] : null, lon: point ? point[0] : null },
      severity: severity || null,
      link: httpLink(p.url?.report),
      raw: item,
    };
  },
};
