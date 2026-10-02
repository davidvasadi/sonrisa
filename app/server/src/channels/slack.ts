import { facts, prefix, type DeliveryEvent } from '../message.js';
import type { Channel, SendResult } from './types.js';

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

export function createSlackChannel(env: NodeJS.ProcessEnv, transport: Transport = realTransport): Channel {
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
        // Whether the body is exactly Slack's error name is unverified, so keep the text (design F9).
        return { ok: false, error: hide(`HTTP ${res.status}: ${res.body.slice(0, 200)}`, url) };
      } catch (e) {
        return { ok: false, error: hide((e as Error).message, url) };
      }
    },
    // The Connect Slack button (OAuth) comes in M8. Until then: paste a webhook.
    status: () =>
      env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET && env.SLACK_REDIRECT_URI
        ? { available: true, note: 'Slack app configured' }
        : { available: true, note: 'Slack app not configured: paste a hooks.slack.com webhook URL' },
  };
}
