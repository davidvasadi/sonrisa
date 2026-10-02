import { EventEmitter } from 'node:events';

// Change notifications for live views (D-004). The SSE route forwards them to browsers,
// which refetch what changed over REST.
export type Change =
  | { type: 'events.created'; sourceId: string; count: number }
  | { type: 'source.updated'; sourceId: string }
  | { type: 'delivery.updated'; deliveryId: number; userId: number; status: string }
  | { type: 'user.updated'; userId: number };

const emitter = new EventEmitter();
emitter.setMaxListeners(100); // one listener per open browser tab

export const bus = {
  emit: (c: Change) => void emitter.emit('change', c),
  on: (fn: (c: Change) => void) => void emitter.on('change', fn),
  off: (fn: (c: Change) => void) => void emitter.off('change', fn),
};
