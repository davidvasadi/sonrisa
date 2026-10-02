import type { Router } from 'express';
import type { Db } from '../db.js';
import type { DeliveryEvent } from '../message.js';

export type ChannelConfig = Record<string, string>;
export type SendResult = { ok: true } | { ok: false; error: string };

// A delivery channel (design: "Channel interface", D-001). The core never names a channel.
export interface Channel {
  id: string;
  label: string;
  fields: { name: string; label: string; secret: boolean }[]; // the UI renders the destination form from this
  validate(config: unknown): { ok: true; config: ChannelConfig } | { ok: false; error: string };
  mask(config: ChannelConfig): ChannelConfig; // what the API, UI and logs may show
  send(config: ChannelConfig, event: DeliveryEvent): Promise<SendResult>;
  routes?(router: Router): void; // channel-owned HTTP routes, e.g. the email outbox (design F7)
  status?(): ChannelStatus;
}

// A channel may offer a "connect" flow (e.g. Slack OAuth). The UI renders a generic button from
// this and never names the channel. Disabled, with a note, when the channel isn't configured (D-021).
export type ChannelStatus = {
  available: boolean;
  note?: string;
  connect?: { enabled: boolean; href: string; note?: string };
};

export type ChannelDeps = { db: Db; env: NodeJS.ProcessEnv; log: (msg: string) => void };
