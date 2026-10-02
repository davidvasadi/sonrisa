import type { Router } from 'express';
import nodemailer from 'nodemailer';
import type { Db } from '../db.js';
import { facts, prefix, type DeliveryEvent } from '../message.js';
import { now } from '../time.js';
import type { Channel } from './types.js';

export type Mail = { from: string; to: string; subject: string; text: string; html: string };
export type MailTransport = (mail: Mail) => Promise<void>;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function render(e: DeliveryEvent, to: string, from: string): Mail {
  const subject = `${prefix(e)}${e.title}`;
  const lines = facts(e);
  const text = [e.title, '', ...lines, ...(e.link ? ['', e.link] : [])].join('\n');
  const html =
    `<h2>${escapeHtml(subject)}</h2><p>${lines.map(escapeHtml).join('<br>')}</p>` +
    (e.link ? `<p><a href="${escapeHtml(e.link)}">${escapeHtml(e.link)}</a></p>` : '');
  return { from, to, subject, text, html };
}

// SMTP via nodemailer when SMTP_HOST is set, otherwise the dev outbox (D-010).
// Options from https://nodemailer.com/smtp (stored in raw-responses/nodemailer-docs/smtp.html):
// host, port (default 587, or 465 if secure), secure (TLS from the start), auth { user, pass }.
// A real SMTP send has not been tested (no credentials); see the M7 report.
function smtpTransport(env: NodeJS.ProcessEnv): MailTransport | null {
  if (!env.SMTP_HOST) return null;
  const port = Number(env.SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } : undefined,
  });
  return async (mail) => {
    await transporter.sendMail(mail);
  };
}

export function createEmailChannel(db: Db, env: NodeJS.ProcessEnv, transport: MailTransport | null = smtpTransport(env)): Channel {
  // The dev outbox is owned by this channel, not the core (design F7).
  db.exec(`CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY, event_id INTEGER NOT NULL, to_address TEXT NOT NULL,
    subject TEXT NOT NULL, text TEXT NOT NULL, html TEXT NOT NULL, created_at TEXT NOT NULL)`);
  const insert = db.prepare(
    'INSERT INTO outbox (event_id, to_address, subject, text, html, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const from = env.SMTP_FROM || 'Sonrisa <alerts@example.com>';

  return {
    id: 'email',
    label: 'Email',
    fields: [{ name: 'address', label: 'Email address', secret: false }],
    validate(config) {
      const address = (config as { address?: unknown })?.address;
      if (typeof address !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim())) {
        return { ok: false, error: 'a valid email address is required' };
      }
      return { ok: true, config: { address: address.trim() } };
    },
    mask: (config) => config,
    async send(config, event) {
      const mail = render(event, config.address, from);
      if (transport) await transport(mail);
      else insert.run(event.id, mail.to, mail.subject, mail.text, mail.html, now());
      return { ok: true };
    },
    routes(router: Router) {
      router.get('/api/channels/email/outbox', (_req, res) => {
        res.json(
          db
            .prepare('SELECT id, event_id AS eventId, to_address AS "to", subject, text, created_at AS createdAt FROM outbox ORDER BY id DESC LIMIT 100')
            .all(),
        );
      });
    },
    status: () => ({ available: true, note: transport ? 'SMTP' : 'dev outbox (no SMTP configured)' }),
  };
}
