import { randomBytes } from 'node:crypto';
import type { Router } from 'express';
import type { Db } from '../db.js';
import { facts, prefix, type DeliveryEvent } from '../message.js';
import type { Channel, ChannelConfig, SendResult } from './types.js';

// Slack incoming webhooks (D-007, D-021, D-022). Behaviour from the stored Slack docs:
// - success is HTTP 200 with body "ok" (incoming-webhooks.html)
// - escape only & < > in text (formatting-message-text.html: "Escaping text")
// - links are <url|text> (formatting-message-text.html: "Links")

// The only host a webhook may point to (D-022). A constant: no env or config can change it (design F5).
const ALLOWED_HOST = 'hooks.slack.com';

export type HttpResponse = { status: number; body: string };
// Performs the POST. Tests pass one that sends to a local mock receiver (D-023).
export type Transport = (url: string, json: string) => Promise<HttpResponse>;

export const realTransport: Transport = async (url, json) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json,
    redirect: 'manual', // a redirect could lead to another host (SSRF): never follow it
    signal: AbortSignal.timeout(10_000),
  });
  return { status: res.status, body: await res.text() };
};

export function validateWebhookUrl(value: unknown): { ok: true; url: string } | { ok: false; error: string } {
  if (typeof value !== 'string') return { ok: false, error: 'webhook URL is required' };
  let u: URL;
  try {
    u = new URL(value.trim());
  } catch {
    return { ok: false, error: 'not a valid URL' };
  }
  // Exact host only, never the path: Slack's own example has no /services/ (R-014).
  if (u.protocol !== 'https:' || u.hostname !== ALLOWED_HOST || u.port !== '' || u.username || u.password) {
    return { ok: false, error: `only https://${ALLOWED_HOST}/... webhook URLs are accepted` };
  }
  return { ok: true, url: u.toString() };
}

export function maskWebhookUrl(url: string): string {
  return `https://${ALLOWED_HOST}/…/••••${url.slice(-4)}`;
}

const escapeSlack = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function render(e: DeliveryEvent): string {
  const title = escapeSlack(`${prefix(e)}${e.title}`);
  // In <url|text> a "|" or ">" in the URL would end the link early, so encode them.
  const head = e.link ? `*<${e.link.replace(/\|/g, '%7C').replace(/>/g, '%3E')}|${title}>*` : `*${title}*`;
  return [head, ...facts(e).map(escapeSlack)].join('\n');
}

// --- Connect Slack (OAuth, D-007, D-021). Every step from the stored docs:
// raw-responses/slack-docs/installing-with-oauth.html and incoming-webhooks.html.
//  1. redirect to https://slack.com/oauth/v2/authorize with scope=incoming-webhook, client_id,
//     redirect_uri and state;
//  2. Slack sends the browser back to redirect_uri with code and state; the code "expires after
//     ten minutes"; a state that doesn't match means "consider the authorization a forgery";
//  3. exchange the code at https://slack.com/api/oauth.v2.access. The doc's example is
//     `curl -F code=… -F client_id=… -F client_secret=…`, a multipart form, so we send FormData,
//     with the same redirect_uri as in step 1 ("must send that same field with the same value");
//  4. the response's incoming_webhook.url is the webhook (incoming-webhooks.html).
// Not in the docs (unverified): what Slack sends when the user declines. Any callback without a
// code is treated as "not connected".
export type OAuthExchange = (form: Record<string, string>) => Promise<unknown>;

const realExchange: OAuthExchange = async (form) => {
  const body = new FormData();
  for (const [k, v] of Object.entries(form)) body.append(k, v);
  const res = await fetch('https://slack.com/api/oauth.v2.access', { method: 'POST', body, signal: AbortSignal.timeout(10_000) });
  return res.json();
};

export type SlackOAuthDeps = {
  db: Db;
  save: (userId: number, config: ChannelConfig, label: string | null) => void;
  exchange?: OAuthExchange;
};

const STATE_TTL_MS = 10 * 60_000;

function oauthConfig(env: NodeJS.ProcessEnv) {
  const { SLACK_CLIENT_ID: clientId, SLACK_CLIENT_SECRET: clientSecret, SLACK_REDIRECT_URI: redirectUri } = env;
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}

function oauthRoutes(router: Router, env: NodeJS.ProcessEnv, deps: SlackOAuthDeps) {
  const { db, save, exchange = realExchange } = deps;
  db.exec('CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at INTEGER NOT NULL)');

  // After the callback, send the browser back to the app's user view on the same origin as the redirect URI.
  const back = (result: string) => {
    const cfg = oauthConfig(env);
    const origin = cfg ? new URL(cfg.redirectUri).origin : '';
    return `${origin}/#/?slack=${encodeURIComponent(result)}`;
  };

  router.get('/api/slack/oauth/start', (req, res) => {
    const cfg = oauthConfig(env);
    if (!cfg) return void res.status(404).json({ error: 'Slack app not configured' });
    const userId = Number(req.query.userId);
    if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId)) return void res.status(400).json({ error: 'unknown user' });
    const state = randomBytes(24).toString('base64url');
    db.prepare('DELETE FROM oauth_states WHERE created_at < ?').run(Date.now() - STATE_TTL_MS);
    db.prepare('INSERT INTO oauth_states (state, user_id, created_at) VALUES (?, ?, ?)').run(state, userId, Date.now());
    const url = new URL('https://slack.com/oauth/v2/authorize');
    url.searchParams.set('scope', 'incoming-webhook');
    url.searchParams.set('client_id', cfg.clientId);
    url.searchParams.set('redirect_uri', cfg.redirectUri);
    url.searchParams.set('state', state);
    res.redirect(302, url.toString());
  });

  router.get('/api/slack/oauth/callback', async (req, res) => {
    const cfg = oauthConfig(env);
    if (!cfg) return void res.status(404).json({ error: 'Slack app not configured' });
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const row = db.prepare('SELECT user_id AS userId, created_at AS createdAt FROM oauth_states WHERE state = ?').get(state) as
      | { userId: number; createdAt: number }
      | undefined;
    db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state); // a state is single-use
    if (!row || Date.now() - row.createdAt > STATE_TTL_MS) return void res.redirect(302, back('error:state'));
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) return void res.redirect(302, back('cancelled'));
    try {
      // The response also holds an access_token. It is never stored, logged or returned (design F14).
      const r = (await exchange({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirectUri })) as {
        ok?: boolean;
        error?: string;
        incoming_webhook?: { url?: string; channel?: string };
      };
      if (!r?.ok) return void res.redirect(302, back(`error:${String(r?.error ?? 'unknown').slice(0, 60)}`));
      const v = validateWebhookUrl(r.incoming_webhook?.url); // D-022 applies to OAuth too
      if (!v.ok) return void res.redirect(302, back('error:webhook_host'));
      save(row.userId, { webhookUrl: v.url }, r.incoming_webhook?.channel ?? null);
      res.redirect(302, back('connected'));
    } catch {
      res.redirect(302, back('error:exchange_failed'));
    }
  });
}

export function createSlackChannel(env: NodeJS.ProcessEnv, transport: Transport = realTransport, oauth?: SlackOAuthDeps): Channel {
  const hide = (text: string, url: string) => text.split(url).join(maskWebhookUrl(url));
  return {
    id: 'slack',
    label: 'Slack',
    fields: [{ name: 'webhookUrl', label: 'Slack webhook URL', secret: true }],
    validate(config) {
      const r = validateWebhookUrl((config as { webhookUrl?: unknown })?.webhookUrl);
      return r.ok ? { ok: true, config: { webhookUrl: r.url } } : r;
    },
    mask: (config) => ({ ...config, webhookUrl: config.webhookUrl ? maskWebhookUrl(config.webhookUrl) : '' }),
    async send(config, event): Promise<SendResult> {
      const url = config.webhookUrl;
      const check = validateWebhookUrl(url); // again before every send (D-022)
      if (!check.ok) return { ok: false, error: check.error };
      try {
        const res = await transport(check.url, JSON.stringify({ text: render(event) }));
        if (res.status === 200 && res.body.trim() === 'ok') return { ok: true };
        if (res.status >= 300 && res.status < 400) return { ok: false, error: `redirect refused (HTTP ${res.status})` };
        // The body is the bare error name in the one real case seen (R-025); keep the text anyway.
        return { ok: false, error: hide(`HTTP ${res.status}: ${res.body.slice(0, 200)}`, url) };
      } catch (e) {
        return { ok: false, error: hide((e as Error).message, url) };
      }
    },
    routes: oauth ? (router) => oauthRoutes(router, env, oauth) : undefined,
    status: () => {
      const configured = oauth !== undefined && oauthConfig(env) !== null;
      return {
        available: true,
        note: configured ? 'Slack app configured' : 'Slack app not configured: paste a hooks.slack.com webhook URL',
        connect: {
          enabled: configured,
          href: '/api/slack/oauth/start',
          note: configured
            ? undefined
            : 'Connect Slack needs a Slack app (SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI). Paste a webhook instead.',
        },
      };
    },
  };
}
