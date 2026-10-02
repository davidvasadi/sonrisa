#!/usr/bin/env node
// Export this project's Claude Code sessions to Markdown.
//
// Usage:
//   node process/scripts/export-transcripts.mjs          export all sessions
//   node process/scripts/export-transcripts.mjs --check  verify the export leaks nothing
//
// Reads   ~/.claude/projects/<project-dir>/*.jsonl  (one file per session)
// Writes  process/07-prompts/transcripts/sessions/<date>-<session-id>.md
//
// Kept:     the author's prompts (user entries with origin.kind === "human"),
//           and the assistant's text replies.
// Dropped:  thinking blocks, tool calls, tool results, attachments, subagent
//           (sidechain) entries, and harness tags inside prompts
//           (<system-reminder>, <ide_opened_file>, <ide_selection>, ...).
// Unwrapped: <pasted_content> tags are removed, their text is kept, because
//           the text is the author's prompt.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const projectDir = path.join(os.homedir(), '.claude', 'projects', repoRoot.replace(/[^A-Za-z0-9]/g, '-'));
const outDir = path.join(repoRoot, 'process', '07-prompts', 'transcripts', 'sessions');

// Harness tags whose whole content is dropped.
const DROP_TAGS = [
  'system-reminder',
  'ide_opened_file',
  'ide_selection',
  'ide_diagnostics',
  'local-command-stdout',
  'local-command-stderr',
  'local-command-caveat',
  'command-message',
];
// Harness tags that are removed but whose content is kept.
const UNWRAP_TAGS = ['pasted_content'];

function cleanPrompt(text) {
  let out = text;
  for (const tag of DROP_TAGS) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'g'), '');
  }
  // Slash commands: <command-name>/x</command-name><command-args>y</command-args> → "/x y"
  out = out.replace(/<command-name>([\s\S]*?)<\/command-name>/g, '$1');
  out = out.replace(/<command-args>([\s\S]*?)<\/command-args>/g, ' $1');
  for (const tag of UNWRAP_TAGS) {
    out = out.replace(new RegExp(`</?${tag}\\b[^>]*>`, 'g'), '');
  }
  return out.trim();
}

function readEntries(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function isHumanPrompt(e) {
  return e.type === 'user' && !e.isSidechain && !e.isMeta && e.origin?.kind === 'human';
}

function blocks(e) {
  const c = e.message?.content;
  if (typeof c === 'string') return [{ type: 'text', text: c }];
  return Array.isArray(c) ? c : [];
}

// Returns [{ role: 'user' | 'assistant', text, timestamp }] in order,
// with consecutive assistant text merged into one reply.
function extractTurns(entries) {
  const turns = [];
  for (const e of entries) {
    if (e.isSidechain) continue;
    if (isHumanPrompt(e)) {
      const text = cleanPrompt(
        blocks(e)
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n\n'),
      );
      if (text) turns.push({ role: 'user', text, timestamp: e.timestamp });
    } else if (e.type === 'assistant') {
      const text = blocks(e)
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n\n')
        .trim();
      if (!text) continue;
      const last = turns[turns.length - 1];
      if (last?.role === 'assistant') last.text += `\n\n${text}`;
      else turns.push({ role: 'assistant', text, timestamp: e.timestamp });
    }
  }
  return turns;
}

function toMarkdown(sessionId, turns) {
  const start = turns[0]?.timestamp ?? 'unknown';
  const lines = [
    `# Session ${sessionId}`,
    '',
    `Exported from Claude Code by \`process/scripts/export-transcripts.mjs\`. Started ${start}.`,
    'Contains the author\'s prompts and the assistant\'s text replies only: no thinking, tool calls, tool output or system reminders.',
    '',
  ];
  let n = 0;
  for (const t of turns) {
    if (t.role === 'user') {
      n += 1;
      lines.push('---', '', `## Prompt ${n} — ${t.timestamp}`, '', t.text, '');
    } else {
      lines.push('### Reply', '', t.text, '');
    }
  }
  return lines.join('\n');
}

function sessionFiles() {
  if (!fs.existsSync(projectDir)) {
    console.error(`No Claude Code project directory at ${projectDir}`);
    process.exit(1);
  }
  return fs
    .readdirSync(projectDir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(projectDir, f));
}

function outPath(sessionId, turns) {
  const date = (turns[0]?.timestamp ?? '').slice(0, 10) || 'undated';
  return path.join(outDir, `${date}-${sessionId}.md`);
}

function exportAll() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of sessionFiles()) {
    const sessionId = path.basename(file, '.jsonl');
    const turns = extractTurns(readEntries(file));
    if (turns.length === 0) continue;
    const target = outPath(sessionId, turns);
    fs.writeFileSync(target, toMarkdown(sessionId, turns));
    const prompts = turns.filter((t) => t.role === 'user').length;
    console.log(`${path.relative(repoRoot, target)}: ${prompts} prompts, ${turns.length - prompts} replies`);
  }
}

// Leak check: everything that was meant to be dropped must not appear in the export.
function check() {
  let failures = 0;
  const fail = (msg) => {
    failures += 1;
    console.log(`LEAK  ${msg}`);
  };
  for (const file of sessionFiles()) {
    const sessionId = path.basename(file, '.jsonl');
    const entries = readEntries(file);
    const turns = extractTurns(entries);
    if (turns.length === 0) continue;
    const target = outPath(sessionId, turns);
    if (!fs.existsSync(target)) {
      fail(`${sessionId}: not exported yet, run without --check first`);
      continue;
    }
    const md = fs.readFileSync(target, 'utf8');

    // 1. No harness tags.
    for (const tag of [...DROP_TAGS, ...UNWRAP_TAGS, 'command-name', 'command-args']) {
      if (md.includes(`<${tag}`)) fail(`${sessionId}: tag <${tag}> present`);
    }

    // 2. No fragment of any dropped block. A fragment is a 60-char slice from
    //    the middle of the block, so short generic strings don't false-alarm.
    const counts = { thinking: 0, tool_use: 0, tool_result: 0, attachment: 0, sidechain: 0 };
    const probe = (kind, text) => {
      const s = (text ?? '').replace(/\s+/g, ' ').trim();
      if (s.length < 80) return;
      counts[kind] += 1;
      const mid = Math.floor(s.length / 2);
      const frag = s.slice(mid - 30, mid + 30);
      if (md.replace(/\s+/g, ' ').includes(frag)) fail(`${sessionId}: ${kind} fragment found: "${frag}"`);
    };
    for (const e of entries) {
      if (e.isSidechain) {
        for (const b of blocks(e)) probe('sidechain', b.text ?? b.thinking);
        continue;
      }
      if (e.type === 'attachment') probe('attachment', JSON.stringify(e.attachment));
      for (const b of blocks(e)) {
        if (b.type === 'thinking') probe('thinking', b.thinking);
        if (b.type === 'tool_use') probe('tool_use', JSON.stringify(b.input));
        if (b.type === 'tool_result') {
          const c = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
          probe('tool_result', c);
        }
      }
    }

    // 3. No dropped harness text from prompts.
    for (const e of entries.filter(isHumanPrompt)) {
      for (const b of blocks(e)) {
        for (const tag of DROP_TAGS) {
          for (const m of (b.text ?? '').matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))) {
            const inner = m[1].trim();
            if (inner.length >= 20 && md.includes(inner)) fail(`${sessionId}: <${tag}> content found`);
          }
        }
      }
    }

    // 4. Every prompt and reply made it in.
    const prompts = turns.filter((t) => t.role === 'user');
    const missing = turns.filter((t) => !md.includes(t.text));
    if (missing.length) fail(`${sessionId}: ${missing.length} turn(s) missing from export`);

    console.log(
      `${path.relative(repoRoot, target)}: ${prompts.length} prompts, ${turns.length - prompts.length} replies; ` +
        `probed ${counts.thinking} thinking, ${counts.tool_use} tool calls, ${counts.tool_result} tool results, ` +
        `${counts.attachment} attachments, ${counts.sidechain} sidechain blocks`,
    );
  }
  console.log(failures ? `FAIL: ${failures} leak(s)` : 'OK: no leaks found');
  process.exit(failures ? 1 : 0);
}

if (process.argv.includes('--check')) check();
else exportAll();
