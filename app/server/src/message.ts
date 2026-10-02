import type { Db } from './db.js';

// What a channel gets to render: one stored event, with its source and category labels.
export type DeliveryEvent = {
  id: number;
  sourceName: string;
  categories: string[];
  title: string;
  link: string | null;
  severity: string | null;
  locationText: string | null;
  occurredAt: string | null;
  publishedAt: string | null;
  isDemo: boolean;
  isForecast: boolean;
};

export function loadDeliveryEvent(db: Db, eventId: number): DeliveryEvent | null {
  const e = db
    .prepare(
      `SELECT e.id, s.name AS sourceName, e.title, e.link, e.severity, e.location_text AS locationText,
              e.occurred_at AS occurredAt, e.published_at AS publishedAt, e.is_demo AS isDemo, e.is_forecast AS isForecast
       FROM events e JOIN sources s ON s.id = e.source_id WHERE e.id = ?`,
    )
    .get(eventId) as (Omit<DeliveryEvent, 'categories' | 'isDemo' | 'isForecast'> & { isDemo: number; isForecast: number }) | undefined;
  if (!e) return null;
  const categories = (
    db
      .prepare('SELECT c.label FROM event_categories ec JOIN categories c ON c.id = ec.category_id WHERE ec.event_id = ? ORDER BY c.rowid')
      .all(eventId) as { label: string }[]
  ).map((r) => r.label);
  return { ...e, categories, isDemo: e.isDemo === 1, isForecast: e.isForecast === 1 };
}

// One line of plain-text facts, shared by the channels.
export function facts(e: DeliveryEvent): string[] {
  return [
    `${e.sourceName} · ${e.categories.join(', ')}`,
    e.severity ? `Severity: ${e.severity}` : null,
    e.locationText ? `Location: ${e.locationText}` : null,
    e.occurredAt ? `${e.isForecast ? 'Expected' : 'Occurred'}: ${e.occurredAt}` : e.publishedAt ? `Published: ${e.publishedAt}` : null,
  ].filter((l): l is string => l !== null);
}

export const prefix = (e: DeliveryEvent) => `${e.isDemo ? '[DEMO] ' : ''}${e.isForecast ? '[FORECAST] ' : ''}`;
