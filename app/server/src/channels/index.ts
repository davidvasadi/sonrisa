import { createEmailChannel } from './email.js';
import { createLogChannel } from './log.js';
import { createSlackChannel } from './slack.js';
import { saveDestination } from '../destinations.js';
import type { Channel, ChannelDeps } from './types.js';

// The channel registry (D-029): one line per channel. Adding a channel is its module plus one line here.
export function createChannels({ db, env, log }: ChannelDeps): Channel[] {
  return [
    createEmailChannel(db, env),
    createSlackChannel(env, undefined, { db, save: (userId, config, label) => saveDestination(db, userId, 'slack', config, label) }),
    createLogChannel(log),
  ];
}
