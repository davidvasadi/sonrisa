import express from 'express';
import type { Channel, ChannelConfig } from './channels/types.js';
import type { Db } from './db.js';
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
    db.prepare(
      `INSERT INTO destinations (user_id, channel, config, label) VALUES (?, ?, ?, NULL)
       ON CONFLICT (user_id, channel) DO UPDATE SET config = excluded.config`,
    ).run(Number(req.params.id), channel.id, JSON.stringify(v.config));
    res.json({ channel: channel.id, config: channel.mask(v.config) });
  });

  app.delete('/api/users/:id/destinations/:channel', (req, res) => {
    db.prepare('DELETE FROM destinations WHERE user_id = ? AND channel = ?').run(Number(req.params.id), req.params.channel);
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
    res.status(204).end();
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
