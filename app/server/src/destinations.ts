import { bus } from './bus.js';
import type { ChannelConfig } from './channels/types.js';
import type { Db } from './db.js';

// One way to store a destination, used by the API (paste) and by channel-owned flows (Slack OAuth).
export function saveDestination(db: Db, userId: number, channel: string, config: ChannelConfig, label: string | null): void {
  db.prepare(
    `INSERT INTO destinations (user_id, channel, config, label) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, channel) DO UPDATE SET config = excluded.config, label = excluded.label`,
  ).run(userId, channel, JSON.stringify(config), label);
  bus.emit({ type: 'user.updated', userId });
}
