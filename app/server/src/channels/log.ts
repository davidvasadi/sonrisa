import { prefix } from '../message.js';
import type { Channel } from './types.js';

// The stub channel (D-019): proves a new channel is one module plus one registry line.
export function createLogChannel(log: (msg: string) => void): Channel {
  return {
    id: 'log',
    label: 'Log (stub)',
    fields: [],
    validate: () => ({ ok: true, config: {} }),
    mask: (config) => config,
    async send(_config, event) {
      log(`[log channel] ${prefix(event)}${event.title} (${event.sourceName}, event ${event.id})`);
      return { ok: true };
    },
  };
}
