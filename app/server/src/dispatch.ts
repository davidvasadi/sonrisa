import type { Channel, ChannelConfig } from './channels/types.js';
import type { Db } from './db.js';
import { loadDeliveryEvent } from './message.js';
import { now } from './time.js';

export type DeliveryResult = { id: number; userId: number; channel: string; status: 'sent' | 'failed'; error: string | null };

// Match (design: "Matching and dispatch"): for each new event (notify = 1), every subscription
// to one of its categories that existed when the event was ingested (forward-only, D-027), whose
// user has a destination for that channel. One delivery row per event, user and channel (D-005).
export function match(db: Db, eventIds: number[], channelIds: string[]): number[] {
  const candidates = db.prepare(
    `SELECT DISTINCT s.user_id AS userId, s.channel
     FROM events e
     JOIN event_categories ec ON ec.event_id = e.id
     JOIN subscriptions s ON s.category_id = ec.category_id AND s.created_at <= e.ingested_at
     JOIN destinations d ON d.user_id = s.user_id AND d.channel = s.channel
     WHERE e.id = ? AND e.notify = 1`,
  );
  const insert = db.prepare(
    "INSERT OR IGNORE INTO deliveries (event_id, user_id, channel, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
  );
  const inserted: number[] = [];
  db.transaction(() => {
    for (const eventId of eventIds) {
      for (const c of candidates.all(eventId) as { userId: number; channel: string }[]) {
        if (!channelIds.includes(c.channel)) continue; // a destination for a channel that isn't registered
        const r = insert.run(eventId, c.userId, c.channel, now());
        if (r.changes === 1) inserted.push(Number(r.lastInsertRowid));
      }
    }
  })();
  return inserted;
}

// Replaces every secret config value in a message, so errors never store a webhook URL.
function scrub(text: string, channel: Channel, config: ChannelConfig): string {
  let out = text;
  for (const f of channel.fields) {
    const v = config[f.name];
    if (f.secret && v) out = out.split(v).join(channel.mask(config)[f.name] ?? '[secret]');
  }
  return out;
}

// Dispatch: sends each delivery through its channel. Each one is isolated: a failing or
// throwing channel marks only its own delivery failed (design F8). No retries (D-030).
export async function dispatch(db: Db, channels: Channel[], deliveryIds: number[]): Promise<DeliveryResult[]> {
  const get = db.prepare(
    `SELECT dl.id, dl.event_id AS eventId, dl.user_id AS userId, dl.channel, d.config
     FROM deliveries dl JOIN destinations d ON d.user_id = dl.user_id AND d.channel = dl.channel
     WHERE dl.id = ? AND dl.status = 'pending'`,
  );
  const done = db.prepare('UPDATE deliveries SET status = ?, error = ?, sent_at = ? WHERE id = ?');
  const results: DeliveryResult[] = [];
  for (const id of deliveryIds) {
    const row = get.get(id) as { id: number; eventId: number; userId: number; channel: string; config: string } | undefined;
    if (!row) continue;
    const channel = channels.find((c) => c.id === row.channel);
    const config = JSON.parse(row.config) as ChannelConfig;
    let error: string | null = null;
    try {
      const event = loadDeliveryEvent(db, row.eventId);
      if (!channel) error = `channel "${row.channel}" is not registered`;
      else if (!event) error = `event ${row.eventId} not found`;
      else {
        const r = await channel.send(config, event);
        if (!r.ok) error = r.error;
      }
    } catch (e) {
      error = `send threw: ${(e as Error).message}`;
    }
    if (error && channel) error = scrub(error, channel, config);
    const status = error ? 'failed' : 'sent';
    done.run(status, error, error ? null : now(), row.id);
    results.push({ id: row.id, userId: row.userId, channel: row.channel, status, error });
  }
  return results;
}

export async function deliver(db: Db, channels: Channel[], eventIds: number[]): Promise<DeliveryResult[]> {
  return dispatch(db, channels, match(db, eventIds, channels.map((c) => c.id)));
}

// At startup: a delivery still pending was interrupted between insert and send (design F8).
// It is not resent (D-030), but it becomes visible as failed.
export function failInterrupted(db: Db): number {
  return db
    .prepare("UPDATE deliveries SET status = 'failed', error = 'interrupted before send' WHERE status = 'pending'")
    .run().changes;
}
