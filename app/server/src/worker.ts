import { bus } from './bus.js';
import type { Channel } from './channels/types.js';
import type { Db } from './db.js';
import { deliver } from './dispatch.js';
import { ingestPoll, registerSource, type FeedResult, type IngestReport } from './ingest.js';
import type { Source } from './sources/types.js';

export type FetchText = (url: string) => Promise<string>;

const USER_AGENT = 'sonrisa/0.1 (local demo alerting app)';

export const fetchText: FetchText = async (url) => {
  // Node's fetch decompresses gzip itself (UN News sends gzip unasked, see data-sources.md).
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

// One poll: fetch and parse every feed of the source, then ingest them as one batch (design F1).
export async function pollSource(db: Db, source: Source, fetch: FetchText = fetchText): Promise<IngestReport> {
  const results: FeedResult[] = [];
  for (const feed of source.feeds) {
    try {
      results.push({ feedKey: feed.key, ok: true, items: source.parse(await fetch(feed.url)) });
    } catch (e) {
      results.push({ feedKey: feed.key, ok: false, error: (e as Error).message });
    }
  }
  return ingestPoll(db, source, results);
}

export function summary(source: Source, r: IngestReport): string {
  return (
    `poll ${source.id}: feeds ${r.feedsOk} ok / ${r.feedsFailed} failed, items ${r.items}, ` +
    `new ${r.newEventIds.length}, baseline ${r.baselineEventIds.length}, known ${r.knownEvents}` +
    (r.itemErrors.length ? `, item errors ${r.itemErrors.length}` : '') +
    (r.unknownCategories.length ? `, new categories ${r.unknownCategories.join(',')}` : '')
  );
}

// The worker runs inside the API process (design: one process, one SQLite writer).
// One timer per source; a source is never polled twice at the same time.
export function startWorker(
  db: Db,
  sources: Source[],
  {
    channels = [],
    fetch = fetchText,
    log = console.log,
  }: { channels?: Channel[]; fetch?: FetchText; log?: (msg: string) => void } = {},
): { stop: () => void } {
  const timers: NodeJS.Timeout[] = [];
  for (const source of sources) {
    registerSource(db, source);
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        const report = await pollSource(db, source, fetch);
        log(summary(source, report));
        bus.emit({ type: 'source.updated', sourceId: source.id });
        const created = report.newEventIds.length + report.baselineEventIds.length;
        if (created) bus.emit({ type: 'events.created', sourceId: source.id, count: created });
        // New events (notify = 1) go straight to matching and delivery.
        const results = await deliver(db, channels, report.newEventIds);
        if (results.length) {
          const failed = results.filter((r) => r.status === 'failed').length;
          log(`deliver ${source.id}: ${results.length} deliveries, ${results.length - failed} sent, ${failed} failed`);
        }
      } catch (e) {
        log(`poll ${source.id}: crashed: ${(e as Error).message}`);
      } finally {
        running = false;
      }
    };
    void run();
    timers.push(setInterval(run, source.pollIntervalMs));
  }
  log(`worker: started, ${sources.length} source(s): ${sources.map((s) => s.id).join(', ') || 'none'}`);
  return {
    stop: () => {
      timers.forEach(clearInterval);
      log('worker: stopped');
    },
  };
}
