import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bus } from './bus.js';
import type { Channel } from './channels/types.js';
import type { Db } from './db.js';
import { deliver, type DeliveryResult } from './dispatch.js';
import { ingestDemo } from './ingest.js';
import type { Source } from './sources/types.js';

const demoDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sources', 'demo');

// Demo inject (D-006, D-017): a stored real item goes through the source's own normalise,
// then store → match → dispatch like any polled event. Nothing is written to deliveries directly.
export async function injectDemo(
  db: Db,
  sources: Source[],
  channels: Channel[],
  sourceId: string,
  categoryKey: string,
): Promise<{ eventId: number; deliveries: DeliveryResult[] }> {
  const source = sources.find((s) => s.id === sourceId);
  if (!source) throw new Error(`unknown source "${sourceId}"`);
  if (!source.categories.some((c) => c.key === categoryKey)) throw new Error(`unknown category "${categoryKey}" for ${sourceId}`);

  // One stored item per source, or one per category where the content differs by category
  // (GDACS: one real item per event type, so a "Tropical cyclones" demo is a real cyclone, R-026).
  const demo = JSON.parse(fs.readFileSync(path.join(demoDir, `${source.id}.json`), 'utf8')) as {
    item?: unknown;
    items?: Record<string, unknown>;
  };
  const item = demo.items?.[categoryKey] ?? demo.item;
  if (item === undefined) throw new Error(`no demo item for ${sourceId}:${categoryKey}`);
  const event = source.normalise(item, categoryKey);
  // Replace every external ID with one fresh ID (design F2), and use the chosen category.
  const demoEvent = { ...event, externalIds: [`demo-${randomUUID()}`], categoryKey };
  const report = ingestDemo(db, source, demoEvent);
  const eventId = report.newEventIds[0];
  bus.emit({ type: 'events.created', sourceId: source.id, count: 1 });
  return { eventId, deliveries: await deliver(db, channels, [eventId]) };
}
