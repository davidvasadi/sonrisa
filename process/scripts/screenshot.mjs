#!/usr/bin/env node
// Screenshot evidence for the process record, using headless Chrome over the DevTools protocol.
// Unlike `chrome --screenshot`, which captures at the load event and so races the app's API
// requests, this waits until given text is on the page.
//
// Usage (Node 22+, app running on :5173):
//   node process/scripts/screenshot.mjs <url> <out.png> <text to wait for> [more text...]
//   node process/scripts/screenshot.mjs --live <url> <out.png>
//       --live: load the page, wait for "Live feed", inject a demo event through the API,
//       and wait until the page shows it without a reload (proves SSE live updates).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const live = args[0] === '--live';
if (live) args.shift();
const [url, out, ...waitFor] = args;
if (!url || !out) {
  console.error('usage: screenshot.mjs [--live] <url> <out.png> [text...]');
  process.exit(2);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sonrisa-shot-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {
  stdio: ['ignore', 'ignore', 'pipe'],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  // Chrome prints "DevTools listening on ws://..." to stderr.
  const browserWs = await new Promise((resolve, reject) => {
    let buf = '';
    chrome.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    setTimeout(() => reject(new Error('Chrome did not start')), 15_000);
  });
  const port = new URL(browserWs).port;
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      pending.set(n, resolve);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const text = async () => (await send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true })).result?.result?.value ?? '';
  const waitText = async (needles, ms = 30_000) => {
    const start = Date.now();
    for (;;) {
      const t = await text();
      if (needles.every((n) => t.includes(n))) return Date.now() - start;
      if (Date.now() - start > ms) throw new Error(`timed out waiting for: ${needles.filter((n) => !t.includes(n)).join(', ')}`);
      await sleep(250);
    }
  };

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });

  if (live) {
    await waitText(['Live feed', 'Email']);
    const before = (await text()).split('Demo').length - 1;
    const r = await (await fetch(new URL('/api/admin/inject', url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: 'gdacs', categoryKey: 'VO' }),
    })).json();
    const t0 = Date.now();
    for (;;) {
      const t = await text();
      if (t.split('Demo').length - 1 > before && t.includes('Krakatau')) break;
      if (Date.now() - t0 > 15_000) throw new Error('the injected event did not appear without a reload');
      await sleep(100);
    }
    console.log(`live: injected event ${r.eventId} appeared on the open page after ${Date.now() - t0} ms, no reload`);
  } else if (waitFor.length) {
    console.log(`waited ${await waitText(waitFor)} ms for: ${waitFor.join(', ')}`);
  }

  const { result } = await send('Page.getLayoutMetrics');
  const height = Math.ceil(result.cssContentSize.height);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log(`wrote ${out} (1280x${height})`);
  ws.close();
} finally {
  // Wait for Chrome to exit before deleting its profile; it writes files while shutting down.
  const exited = new Promise((r) => chrome.once('exit', r));
  chrome.kill();
  await Promise.race([exited, sleep(5_000)]);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {
    // A leftover temp profile is harmless.
  }
}
