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

  return app;
}
