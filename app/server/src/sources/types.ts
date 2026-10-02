import type { NormalisedEvent } from '../events.js';

export type Feed = { key: string; url: string };

// A source module (design: "Source interface"). The core fetches each feed's URL;
// the module only parses the body and normalises items, so tests can run the exact
// parsing code on the stored real responses without network access.
export interface Source {
  id: string;
  name: string;
  pollIntervalMs: number;
  categories: { key: string; label: string }[];
  feeds: Feed[];
  parse(body: string): unknown[];
  normalise(item: unknown, feedKey: string): NormalisedEvent;
}
