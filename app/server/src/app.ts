import express from 'express';
import type { Channel, ChannelConfig } from './channels/types.js';
import type { Db } from './db.js';
import { bus, type Change } from './bus.js';
import { saveDestination } from './destinations.js';
import { injectDemo } from './inject.js';
import type { Source } from './sources/types.js';
import { now } from './time.js';

export function createApp(db: Db, { sources = [], channels = [] }: { sources?: Source[]; channels?: Channel[] } = {}) {
  const app = express();
  app.use(express.json());
  const channelById = (id: string) => channels.find((c) => c.id === id);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/users', (_req, res) => {
    res.json(db.prepare('SELECT id, name FROM users ORDER BY id').all());
  });

  // Categories grouped by source (D-013): the list users pick from. Built from data, not UI code.
  app.get('/api/categories', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT s.id AS sourceId, s.name AS sourceName, c.id, c.key, c.label, c.declared
         FROM categories c JOIN sources s ON s.id = c.source_id ORDER BY s.rowid, c.rowid`,
      )
      .all() as { sourceId: string; sourceName: string; id: string; key: string; label: string; declared: number }[];
    const bySource = new Map<string, { sourceId: string; sourceName: string; categories: object[] }>();
    for (const r of rows) {
      if (!bySource.has(r.sourceId)) bySource.set(r.sourceId, { sourceId: r.sourceId, sourceName: r.sourceName, categories: [] });
      bySource.get(r.sourceId)!.categories.push({ id: r.id, key: r.key, label: r.label, declared: r.declared === 1 });
    }
    res.json([...bySource.values()]);
  });

  // Channels and the fields their destination forms need (the UI renders forms from `fields`).
  app.get('/api/channels', (_req, res) => {
    res.json(channels.map((c) => ({ id: c.id, label: c.label, fields: c.fields, status: c.status?.() ?? { available: true } })));
  });

  // Destinations, always masked (security: webhook URLs are secrets).
  app.get('/api/users/:id/destinations', (req, res) => {
    const rows = db.prepare('SELECT channel, config, label FROM destinations WHERE user_id = ?').all(Number(req.params.id)) as {
      channel: string;
      config: string;
      label: string | null;
    }[];
    res.json(
      rows.map((r) => {
        const c = channelById(r.channel);
        const config = JSON.parse(r.config) as ChannelConfig;
        return { channel: r.channel, label: r.label, config: c ? c.mask(config) : {} };
      }),
    );
  });

  app.put('/api/users/:id/destinations/:channel', (req, res) => {
    const channel = channelById(req.params.channel);
    if (!channel) return void res.status(404).json({ error: 'unknown channel' });
    const v = channel.validate(req.body?.config ?? {});
    if (!v.ok) return void res.status(400).json({ error: v.error });
    saveDestination(db, Number(req.params.id), channel.id, v.config, null);
    res.json({ channel: channel.id, config: channel.mask(v.config) });
  });

  app.delete('/api/users/:id/destinations/:channel', (req, res) => {
    db.prepare('DELETE FROM destinations WHERE user_id = ? AND channel = ?').run(Number(req.params.id), req.params.channel);
    bus.emit({ type: 'user.updated', userId: Number(req.params.id) });
    res.status(204).end();
  });

  // Subscriptions: category × channel (D-013). PUT replaces the whole set; pairs that stay keep
  // their created_at, so re-saving doesn't move the forward-only cut-off (D-027).
  app.get('/api/users/:id/subscriptions', (req, res) => {
    res.json(
      db
        .prepare('SELECT category_id AS categoryId, channel, created_at AS createdAt FROM subscriptions WHERE user_id = ? ORDER BY 1, 2')
        .all(Number(req.params.id)),
    );
  });

  app.put('/api/users/:id/subscriptions', (req, res) => {
    const userId = Number(req.params.id);
    const wanted = req.body as { categoryId: string; channel: string }[];
    if (!Array.isArray(wanted)) return void res.status(400).json({ error: 'expected an array of { categoryId, channel }' });
    for (const w of wanted) {
      if (!channelById(w?.channel)) return void res.status(400).json({ error: `unknown channel "${w?.channel}"` });
      if (!db.prepare('SELECT 1 FROM categories WHERE id = ?').get(w.categoryId)) {
        return void res.status(400).json({ error: `unknown category "${w.categoryId}"` });
      }
    }
    db.transaction(() => {
      const keep = new Set(wanted.map((w) => `${w.categoryId}\u0000${w.channel}`));
      const existing = db.prepare('SELECT category_id, channel FROM subscriptions WHERE user_id = ?').all(userId) as {
        category_id: string;
        channel: string;
      }[];
      const del = db.prepare('DELETE FROM subscriptions WHERE user_id = ? AND category_id = ? AND channel = ?');
      for (const e of existing) if (!keep.has(`${e.category_id}\u0000${e.channel}`)) del.run(userId, e.category_id, e.channel);
      const ins = db.prepare('INSERT OR IGNORE INTO subscriptions (user_id, category_id, channel, created_at) VALUES (?, ?, ?, ?)');
      for (const w of wanted) ins.run(userId, w.categoryId, w.channel, now());
    })();
    bus.emit({ type: 'user.updated', userId });
    res.status(204).end();
  });

  // The user's live feed: recent events in any category they subscribe to, with what was delivered to them.
  const eventCols = `e.id, s.name AS sourceName, e.title, e.link, e.severity, e.location_text AS locationText,
    e.occurred_at AS occurredAt, e.published_at AS publishedAt, e.ingested_at AS ingestedAt,
    e.is_demo AS isDemo, e.is_forecast AS isForecast, e.notify,
    (SELECT json_group_array(c.label) FROM event_categories ec JOIN categories c ON c.id = ec.category_id WHERE ec.event_id = e.id) AS categories`;
  const parse = (rows: Record<string, unknown>[]): Record<string, unknown>[] => rows.map((r) => ({ ...r, categories: JSON.parse(String(r.categories)) }));

  app.get('/api/users/:id/feed', (req, res) => {
    const userId = Number(req.params.id);
    const rows = db
      .prepare(
        `SELECT ${eventCols},
           (SELECT json_group_array(json_object('channel', d.channel, 'status', d.status))
              FROM deliveries d WHERE d.event_id = e.id AND d.user_id = ?) AS deliveries
         FROM events e JOIN sources s ON s.id = e.source_id
         WHERE e.id IN (SELECT ec.event_id FROM event_categories ec
                        JOIN subscriptions sub ON sub.category_id = ec.category_id WHERE sub.user_id = ?)
         ORDER BY e.ingested_at DESC, e.id DESC LIMIT 50`,
      )
      .all(userId, userId) as Record<string, unknown>[];
    res.json(parse(rows).map((r) => ({ ...r, deliveries: JSON.parse(String(r.deliveries)) })));
  });

  // Admin: every user with subscriptions and masked destinations (design S1, plan M8).
  app.get('/api/admin/users', (_req, res) => {
    const users = db.prepare('SELECT id, name FROM users ORDER BY id').all() as { id: number; name: string }[];
    res.json(
      users.map((u) => ({
        ...u,
        subscriptions: db.prepare('SELECT category_id AS categoryId, channel FROM subscriptions WHERE user_id = ? ORDER BY 1, 2').all(u.id),
        destinations: (db.prepare('SELECT channel, config, label FROM destinations WHERE user_id = ?').all(u.id) as {
          channel: string;
          config: string;
          label: string | null;
        }[]).map((d) => {
          const c = channelById(d.channel);
          return { channel: d.channel, label: d.label, config: c ? c.mask(JSON.parse(d.config) as ChannelConfig) : {} };
        }),
      })),
    );
  });

  app.get('/api/admin/events', (_req, res) => {
    res.json(parse(db.prepare(`SELECT ${eventCols} FROM events e JOIN sources s ON s.id = e.source_id ORDER BY e.id DESC LIMIT 100`).all() as Record<string, unknown>[]));
  });

  // Live updates (D-004): Server-Sent Events. Each message says what changed; the browser refetches.
  app.get('/api/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    const send = (c: Change) => res.write(`event: ${c.type}\ndata: ${JSON.stringify(c)}\n\n`);
    bus.on(send);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      bus.off(send);
      clearInterval(ping);
    });
  });

  // Freshness per feed (D-014, design F13), for the admin view.
  app.get('/api/admin/feeds', (_req, res) => {
    res.json(
      db
        .prepare(
          `SELECT source_id AS sourceId, feed_key AS feedKey, baselined_at AS baselinedAt,
                  last_attempt_at AS lastAttemptAt, last_success_at AS lastSuccessAt, last_error AS lastError
           FROM feeds ORDER BY source_id, feed_key`,
        )
        .all(),
    );
  });

  // Recent deliveries, failures included (D-006).
  app.get('/api/admin/deliveries', (_req, res) => {
    res.json(
      db
        .prepare(
          `SELECT dl.id, dl.event_id AS eventId, e.title, e.is_demo AS isDemo, u.name AS userName, dl.channel,
                  dl.status, dl.error, dl.created_at AS createdAt, dl.sent_at AS sentAt
           FROM deliveries dl JOIN events e ON e.id = dl.event_id JOIN users u ON u.id = dl.user_id
           ORDER BY dl.id DESC LIMIT 100`,
        )
        .all(),
    );
  });

  // Demo inject through the whole pipeline (D-017).
  app.post('/api/admin/inject', async (req, res) => {
    try {
      res.json(await injectDemo(db, sources, channels, String(req.body?.sourceId), String(req.body?.categoryKey)));
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Channel-owned routes (design F7), e.g. the email outbox.
  const router = express.Router();
  for (const c of channels) c.routes?.(router);
  app.use(router);

  return app;
}
