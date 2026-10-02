import express from 'express';
import type { Db } from './db.js';

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

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

  return app;
}
