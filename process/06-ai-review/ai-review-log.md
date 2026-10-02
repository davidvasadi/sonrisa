# AI Review Log

What the AI produced, how I checked it, and what I accepted, corrected or rejected.

## Template

```
## R-NNN: <short title>

- Date:
- Prompt / session: link to entry in ../07-prompts/session-log.md
- What the AI produced:
- How I checked it: (ran it, read it, tested it, compared with docs or raw API data, ...)
- What I found:
- Verdict: accepted | corrected | rejected
- What changed as a result:
- Related decision: D-NNN (if any)
```

## Entries

## R-001: P-001 transcript was not verbatim

- Date: 2026-10-02
- Prompt / session: [P-001](../07-prompts/session-log.md#p-001-repository-setup), fixed in [P-002](../07-prompts/session-log.md#p-002-fix-p-001-transcript)
- What the AI produced: A transcript of the first prompt, with the session log saying it was "verbatim". The middle of the prompt (the full task text) had been replaced with the placeholder `[full task text — see 01-brief/brief.md]`, justified in a note as avoiding repetition.
- How I checked it: Opened the transcript and compared it with what I had actually sent.
- What I found: The claim "verbatim" was false. The AI decided on its own to shorten the record, which conflicts with the submission requirement "all prompts used during the process". The note in the file disclosed the shortcut, but the session log entry did not.
- Verdict: corrected
- What changed as a result: The transcript now contains the complete prompt as sent. Going forward, transcripts are stored exactly as sent, with no abbreviation, even where content duplicates another file.
- Related decision: none

## R-002: Brief analysis compared with author decisions

- Date: 2026-10-02
- Prompt / session: [P-003](../07-prompts/session-log.md#p-003-brief-analysis) (analysis), reviewed in [P-005](../07-prompts/session-log.md#p-005-author-decisions)
- What the AI produced: [brief-analysis.md](../03-research/brief-analysis.md), with 12 default assumptions, 13 gaps, 8 risks and a proposed interpretation, written before seeing my decisions.
- How I checked it: Made my own decisions independently, then had the AI compare the two and state where it disagreed.
- What I found:
  - Agreed: channels as delivery adapters (A10), dedup (gap 2), verifying sources against real calls (risk 2), a dev email inbox (A9).
  - Overridden: per-user filters (A1/A7) replaced by on/off topics. Minimal auth (A12) replaced by no auth. Admin control actions (A11) replaced by "see everything + inject demo event". Polling-only (A2) extended with push. Webhook-only Slack (A9) extended with OAuth.
  - Added by me, not in the analysis: live UI, zero-config run, stack choice.
  - Deferred: most of the gaps and the remaining risk mitigations (see [D-012](../05-decisions/decision-log.md#d-012-defer-remaining-extras-to-later)).
  - Pushback the AI raised, still open: system thresholds now carry the whole definition of "important" (Q1), whether a keyless market source exists (Q2), user identity without auth (Q3), minimal source-staleness monitoring.
- Verdict: corrected
- What changed as a result: Assumptions and decisions D-001 to D-012 recorded. The analysis file is kept unchanged as the AI's baseline.
- Related decision: D-001 to D-012
- Follow-up ([P-006](../07-prompts/session-log.md#p-006-decision-revisions)): The AI's Q1 objection led the author to replace the fixed topics with categories taken from the sources (D-013 supersedes D-002). Source freshness moved into scope (D-014). Q2 and Q3 were resolved (D-016, D-015). The remaining AI recommendations were accepted (D-017). The AI-drafted "Why" texts were reviewed and confirmed by the author.

## R-003: Severity floor for "important" rejected

- Date: 2026-10-02
- Prompt / session: proposed by the AI after [P-006](../07-prompts/session-log.md#p-006-decision-revisions), rejected in [P-007](../07-prompts/session-log.md#p-007-close-q1)
- What the AI produced: A recommendation to keep Q1 open and give each source a system-level minimum level (e.g. minimum severity), to be set during research.
- How I checked it: Weighed it against D-013. If users pick categories, a hidden system threshold on top second-guesses the source, and the threshold values would be arbitrary.
- What I found: The floor adds a layer of filtering the system has to justify, while the same goal is reached by choosing better sources.
- Verdict: rejected
- What changed as a result: D-018 (no filter; source choice controls volume). Q1 closed. The research checklist now measures publishing volume per category instead of looking for severity fields.
- Related decision: D-018

## R-004: Transcript export leak check tested with planted leaks

- Date: 2026-10-02
- Prompt / session: [P-012](../07-prompts/session-log.md#p-012-code-reviewer-agent-milestone-done-skill-transcript-export)
- What the AI produced: `export-transcripts.mjs` and a `--check` mode that looks for harness tags, fragments of thinking, tool calls, tool results and attachments, and missing turns in the export.
- How I checked it:
  1. Inspected the real session JSONL format before writing the parser, rather than assuming it.
  2. Ran the export and the check: OK.
  3. Questioned "probed 1 thinking" out of 28 thinking blocks. The session file stores thinking as empty text with a signature, except one block, so there was nothing else to leak.
  4. Planted leaks in the export and confirmed the check fails: thinking text (FAIL), a `<system-reminder>` tag (FAIL), a real tool result (FAIL), a deleted reply (FAIL). A clean re-export passes.
  5. Independent `grep` for harness tags, tool markers, the paste id, the home path and email addresses.
- What I found:
  - The AI's first tool-output test was invalid. It planted brief text, which legitimately appears in prompt 1, and Read output carries line-number prefixes. So "OK" there proved nothing. It was replaced with a planted real tool result, which the check caught.
  - The grep found the author's git email in one assistant reply. This is not a harness leak: it is the assistant's own reply text.
- Verdict: accepted, after correcting the invalid test
- What changed as a result: The check is reproducible (`--check`) and part of `/milestone-done`.
- Related decision: none

## R-005: Skill flag contradicted the y/n rule

- Date: 2026-10-02
- Prompt / session: [P-012](../07-prompts/session-log.md#p-012-code-reviewer-agent-milestone-done-skill-transcript-export), fixed in [P-013](../07-prompts/session-log.md#p-013-skill-invocation-flag-and-email-redaction)
- What the AI produced: The `/milestone-done` skill with `disable-model-invocation: true`, so that the AI could not start it on its own.
- How I checked it: Read the skill against the CLAUDE.md rule: the AI asks "Run /milestone-done now? (y/n)" and runs it after a yes.
- What I found: The flag stops the AI from invoking the skill at all, including after a yes. The y/n flow in CLAUDE.md could never work. The AI had enforced "don't run without yes" twice, once in a way that broke the rule's purpose, and had not noticed that the two contradicted each other.
- Verdict: corrected
- What changed as a result: Flag removed. The CLAUDE.md rule alone governs when the skill runs.
- Related decision: none

## R-006: Leak check false positives after the session grew

- Date: 2026-10-02
- Prompt / session: [P-013](../07-prompts/session-log.md#p-013-skill-invocation-flag-and-email-redaction)
- What the AI produced: The `--check` from R-004, which failed on a clean export once the session included discussion of the export itself.
- How I checked it: Read the two reported leaks, not just the FAIL count.
- What I found: Both were false positives. A reply mentioned `<system-reminder>` by name. A tool output that read the transcript echoed prompt 1, which is legitimately in the export. The check treated any match as a leak.
- Verdict: corrected
- What changed as a result: A fragment only counts as a leak if it is not in allowed text. Allowed text is built from the raw prompt and reply blocks, not from the extractor's output, so an extractor bug can't whitelist its own leak. Tags are counted beyond those the replies themselves contain. Re-tested against six planted cases: clean, thinking text, a harness tag in a prompt, a real tool result, an email address, a deleted reply. Each behaved as expected. The planted tool result also contained the author's email, which the new email check caught.
- Related decision: none

## R-007: Fresh-session review of the process docs

- Date: 2026-10-02
- Prompt / session: [P-015](../07-prompts/session-log.md#p-015-review-rules-and-decisions-for-contradictions), acted on in [P-016](../07-prompts/session-log.md#p-016-doc-fixes-and-slack-decisions)
- What the AI produced: In a new session with no memory of writing the docs, a summary of CLAUDE.md and the process docs, with 7 contradictions or errors and 3 undecided gaps.
- How I checked it: Read each finding against the files it cited, and decided each one myself.
- What I found: All 10 held up:
  1. The decision-log intro named the wrong prompts for D-018 to D-020.
  2. CLAUDE.md required a raw response even for APIs that can't be called without credentials, while the reviewer agent accepted docs.
  3. "Slack is optional" (D-007) contradicted Slack as a must-have (D-020).
  4. There was no defined way to test Slack in M7.
  5. The /milestone-done question was asked after every task, not every milestone.
  6. The plan's scope included the superseded D-002.
  7. The brief analysis read as current.

  Gaps: cross-source dedup, SSRF through pasted webhooks, and the disaster disclaimer.

  For items 3 and 4 I went further than the AI suggested: the Connect Slack button became a must-have, not just a wording fix, and Slack is tested with a mock plus one real send.
- Verdict: accepted
- What changed as a result: Wording fixed across CLAUDE.md, the plan, the assumptions, the decision log, the brief analysis and the reviewer agent. D-021 to D-023 were added. Cross-source dedup went to Later, and the disclaimer went into the README.
- Related decision: D-021, D-022, D-023

## R-008: Prompt numbering taken from memory

- Date: 2026-10-02
- Prompt / session: [P-016](../07-prompts/session-log.md#p-016-doc-fixes-and-slack-decisions)
- What the AI produced: Decision-log and assumption references to P-014 and P-015 for the new prompts, numbered from the last entry in the session log.
- How I checked it: /milestone-done step 5 takes prompts from the exported session, not from memory. The export showed a bare "n" at the end of the previous session that had never been logged.
- What I found: The numbers were off by one. The unlogged "n" is P-014, so the new prompts are P-015 and P-016.
- Verdict: corrected
- What changed as a result: References renumbered, and P-014 logged. This confirms the skill's rule of taking prompts from the export.
- Related decision: none

## R-009: Transcript export was stale at commit time

- Date: 2026-10-02
- Prompt / session: [P-016](../07-prompts/session-log.md#p-016-doc-fixes-and-slack-decisions), fixed in [P-017](../07-prompts/session-log.md#p-017-review-entries-and-slack-button)
- What the AI produced: The /milestone-done skill, which exports transcripts in step 4 and commits in step 8.
- How I checked it: Re-ran `--check` before the commit.
- What I found: It failed with "1 turn(s) missing from export". This was not a content leak: the AI's reply text written after step 4 wasn't in the export yet. A re-export passed (`OK: no leaks found`). Without a re-run, a stale export would have been committed.
- Verdict: corrected
- What changed as a result: Step 8 of the skill now re-exports and re-checks right before committing.
- Related decision: none

## R-010: Leak check raced the session file

- Date: 2026-10-02
- Prompt / session: [P-017](../07-prompts/session-log.md#p-017-review-entries-and-slack-button), fixed in [P-018](../07-prompts/session-log.md#p-018-leak-check-retry-and-m3-data-source-research)
- What the AI produced: `export-transcripts.mjs --check`, run right after an export.
- How I checked it: Read the failure instead of trusting a re-run. The export and check ran in the same command, so R-009's staleness (work done after step 4) could not explain it.
- What I found: "1 turn(s) missing from export" right after a fresh export, and a pass on the next run. The likely cause is that Claude Code was still writing the assistant's latest reply to the session file when the export read it. This is unconfirmed: we don't control when the harness writes.
- Verdict: corrected
- What changed as a result: When the *only* failures are missing turns, `--check` waits 2 s, re-exports and checks once more. Any other failure, such as a leaked fragment or an email address, is never retried. Tested with four cases: a clean export (it hit the race on its own, retried, OK), a stale export with the last reply cut (retried, OK), a planted email (FAIL, no retry), and a planted email plus a stale export (FAIL, no retry).
- Related decision: none

## R-011: UN News feeds wrongly reported as empty

- Date: 2026-10-02
- Prompt / session: [P-018](../07-prompts/session-log.md#p-018-leak-check-retry-and-m3-data-source-research)
- What the AI produced: A finding, stated to the author mid-task, that UN News returns HTTP 200 with zero items for slugs that don't exist (health, culture-and-education, americas), "so a 200 doesn't prove a category exists".
- How I checked it: The analysis script later failed to parse one stored UN body. Its first bytes were `1f 8b` (gzip) and its headers showed `content-encoding: gzip`, although curl had not asked for compression.
- What I found: The "empty" feeds were gzip-compressed. The AI had counted `<item` in compressed bytes. After decompression each feed had 30 items. The claimed server behaviour didn't exist; it came from the AI's own measurement error.
- Verdict: corrected
- What changed as a result: The finding was withdrawn and stated as wrong in [data-sources.md](../03-research/data-sources.md) (surprise 9). The analysis script decompresses gzip bodies, and the fetch script documents it. The file named `topic-health-EMPTY.rss` was renamed.
- Related decision: none

## R-012: Research doc claimed more than the stored evidence

- Date: 2026-10-02
- Prompt / session: [P-018](../07-prompts/session-log.md#p-018-leak-check-retry-and-m3-data-source-research)
- What the AI produced: A first version of [data-sources.md](../03-research/data-sources.md) saying "every number below comes from that output" and listing UN topic and region feeds and NPR IDs as "verified".
- How I checked it: Re-read each number and claim in the doc against [sample-analysis.txt](../03-research/sample-analysis.txt) and the files in `raw-responses/`.
- What I found: The GDACS 365-day breakdown came from an ad-hoc command, not from the analysis script. Twelve UN feeds and four NPR IDs had been checked live, but their responses weren't stored. That breaks the CLAUDE.md rule that claims need a stored response. Re-fetching changed three numbers in the doc (UN overlap 32/138 to 131/369, NPR overlap 8/41 to 16/63, NPR Business 5 to 6 in 24 h).
- Verdict: corrected
- What changed as a result: The missing feeds were added to the fetch script and stored. The 30/90/365-day GDACS windows were added to the analysis script. The doc was updated to the regenerated numbers.
- Related decision: none

## R-013: Independent review of the M4 design

- Date: 2026-10-02
- Prompt / session: review run in [P-021](../07-prompts/session-log.md#p-021-design-decisions-and-independent-review), handled in [P-022](../07-prompts/session-log.md#p-022-design-review-calls)
- What the AI produced: The M4 [design](../04-design/design.md), written by the main AI session. It was then reviewed by the read-only `code-reviewer` agent with fresh context, which reported 15 findings (2 high, 7 medium, 6 low) and 3 unverified suspicions. The report was shown to the author as is.
- How I checked it:
  1. The main session checked every finding against the doc and the stored files before the author decided: the line numbers, the USGS `properties.ids` of the first `significant_month` feature, the nine Slack error names in the stored webhook doc, and the five gzip UN files on disk.
  2. The author then decided each one.
- What I found:
  - **None of the 15 findings was wrong.**
  - One example in F7 was overstated. "Slack not connected" can be generic per channel; the outbox and `oauth_states` points stood.
  - The two high findings were real design bugs:
    - **F1:** stories in several feeds of the same poll would still reach only one feed's subscribers, despite D-028.
    - **F2:** a second demo inject of the same USGS item would collide on its alias IDs and silently do nothing.

| # | Finding | Call | What changed in the design |
| --- | --- | --- | --- |
| F1 | Multi-feed story in one poll not linked to all categories (high) | fix | Ingest works on a whole poll: items carry their feed, events are grouped by shared ID, all categories are linked, then Match runs |
| F2 | Second demo inject collides on USGS alias IDs (high) | fix | Inject replaces **all** external IDs with one `demo-<uuid>` |
| F3 | Baseline undefined for multi-feed sources; persistence unclear | fix | New `feeds` table; baseline per feed, persisted as `baselined_at` |
| F4 | No email or log destinations, so M7 fails | fix | Email gets an `address` field; channels without fields get an on/off switch; seed data creates both destinations; `users.email` removed |
| F5 | No mechanism for the mock receiver vs the exact host check | fix | Host is a constant; tests inject a transport through the constructor; no env or config can change the host |
| F6 | Test plan misses D-027, D-028, D-022 and D-017 cases | fix | Test table extended with all named cases |
| F7 | Doc claimed channels never need core DB, API or UI changes, but `outbox` and `oauth_states` are channel-specific | fix (doc made honest) | A channel may own its own table and admin panel; adding one is an addition, not a core change; no plugin system |
| F8 | `pending` deliveries lost if `send` throws or the process stops | fix | A throw counts as `failed`; leftover `pending` rows become `failed` ("interrupted before send") at startup |
| F9 | Slack error list incomplete; body format unverified | **won't fix**: no retries (D-030) | `retryable` flag dropped; the raw error text is stored, masked; body format marked *unverified* |
| F10 | Timestamp formats could break forward-only string comparison | fix | One ISO 8601 UTC helper; SQLite `datetime('now')` never used |
| F11 | Demo marker has no field | fix | `events.is_demo` |
| F12 | Inject and tests read gzip or overwritable raw files at runtime | fix | Small uncompressed fixtures in `app/`; the app never reads `raw-responses/` |
| F13 | Freshness per source hides one dead feed | fix | Freshness per feed in `feeds`, shown in the admin view |
| F14 | OAuth `access_token` could be logged or stored | fix | Token discarded; raw response never logged; only Slack's `error` kept |
| F15 | "Stub uses only its own file" listed as a test that can't fail | fix | Test row removed; the evidence is the commit diff that adds the stub |
| S1 | Admin overview doesn't show users (plan M8) | add | Overview returns users with subscriptions and masked destinations |
| S2 | Slack denial not handled | handle simply | Callback without `code` → "Slack not connected"; checked in the real test (D-023). *Correction (M9, R-033): never checked for real; cancelling is untested* |
| S3 | GDACS `datemodified` time zone | mark | Marked *assumed UTC, unverified* |

- Verdict: corrected
- What changed as a result: The design was updated as in the table. D-030 was reworded: no `retryable` flag. The review caught two bugs that would have reached code, which confirms the plan's decision to have a reviewer with fresh context.
- Related decision: D-022, D-023, D-027, D-028, D-030

## R-014: OAuth webhook assumption checked against Slack's stored docs

- Date: 2026-10-02
- Prompt / session: [P-020](../07-prompts/session-log.md#p-020-remove-slack-example-token-write-the-m4-design)
- What the AI produced: D-007 and D-017 assumed that Slack OAuth with the `incoming-webhook` scope returns a webhook URL, so both Slack paths end in one stored webhook.
- How I checked it: Before designing the flow, the AI searched the stored OAuth guide ([installing-with-oauth.html](../03-research/raw-responses/slack-docs/installing-with-oauth.html)) for `incoming_webhook`.
- What I found:
  - The OAuth guide never mentions it. The `incoming_webhook` object (`channel`, `channel_id`, `configuration_url`, `url`) is documented only on the stored webhook page ([incoming-webhooks.html](../03-research/raw-responses/slack-docs/incoming-webhooks.html)).
  - Slack's own example `url` there is `https://hooks.slack.com/TXXXXX/…`, without `/services/`.
- Verdict: accepted. The assumption held, but its evidence was on a different page than expected.
- What changed as a result: The design cites the webhook page for the OAuth response fields. Webhook validation checks the exact host only, never the path.
- Related decision: D-007, D-017, D-022

## R-015: Slack example token in a stored raw response

- Date: 2026-10-02
- Prompt / session: found in [P-019](../07-prompts/session-log.md#p-019-m3-source-decisions) (M3 close), fixed in [P-020](../07-prompts/session-log.md#p-020-remove-slack-example-token-write-the-m4-design)
- What the AI produced: The M3 commit, with Slack's OAuth doc page stored byte for byte. The page includes a realistic-looking sample bot token in an example response.
- How I checked it: The M3 secrets scan flagged token patterns. The AI traced every match to Slack's published docs and warned that GitHub secret scanning could still block the push.
- What I found: It wasn't a credential, but leaving it would likely have blocked the first push. The commit had not been pushed yet.
- Verdict: corrected
- What changed as a result:
  - The one token string was replaced with `[example token removed]`, and the edit is noted in the file's `.meta.txt`.
  - The M3 commit was amended (`3d087bf`).
  - `git log --all -S` and `git grep` over all reachable commits find no copy.
  - Obvious placeholders (`xoxb-1234-abcdefgh`, `xoxp-XXXX…`) were left as fetched.
- Related decision: none

## R-016: better-sqlite3 13 still runs node-gyp

- Date: 2026-10-02
- Prompt / session: [P-025](../07-prompts/session-log.md#p-025-node-22-and-template)
- What the AI produced: D-032 and Q6 saying that `better-sqlite3` 13 "has no install script, so nothing is compiled. A clean install on Node 22 created no `build/` folder."
- How I checked it: During /milestone-done, a clean install in a fresh copy of the files to be committed, then a reinstall of that one package with `--foreground-scripts`, and a reading of its `binding.gyp` and `lib/binding.js`.
- What I found:
  - The lockfile has `hasInstallScript: true`. npm adds `node-gyp rebuild` automatically because the package contains a `binding.gyp`.
  - That file is deliberately a no-op when a prebuilt binary exists (`prebuild_exists`): it finished in 660 ms and wrote only stamp files, and the library loaded its bundled binary. So nothing is compiled, but node-gyp still runs and needs Python and `make`.
  - The AI's earlier observation (no `build/` folder in the working copy) was real, but it didn't support the general claim. The clean install showed otherwise.
- Verdict: corrected
- What changed as a result: D-032 and Q6 were rewritten. The README says install may need Python and `make`. Whether `npm install` fails on a machine without them is marked *unverified*.
- Related decision: D-032

## R-017: Node 20 version check caught three incompatible packages and a native build

- Date: 2026-10-02
- Prompt / session: [P-024](../07-prompts/session-log.md#p-024-approve-m4-entries-build-the-m5-skeleton)
- What the AI produced: The M5 dependency choices for Node 20.19.
- How I checked it: Before installing, the AI read every package's `engines` field on npm. After `npm install --foreground-scripts`, it read the install log and listed `better-sqlite3`'s release assets per Node ABI (this machine's `process.versions.modules` is 115).
- What I found:
  - The newest `better-sqlite3` (13), `vitest` (5) and `concurrently` (10) require Node 22, so they would not have worked on 20.19.
  - `better-sqlite3` 12.11.1 has prebuilt binaries only for ABIs 127, 137, 141 and 147, not for Node 20's ABI 115. The log showed "No prebuilt binaries found" and a node-gyp compile, which works only with build tools installed.
  - `node:sqlite` is not available in Node 20 (`ERR_UNKNOWN_BUILTIN_MODULE`).
- Verdict: accepted
- What changed as a result: Pinned to Node-20 versions at first, then D-032 (Node 22) made the pins unnecessary. Q6 closed.
- Related decision: D-032

## R-018: First clean-copy check ran in the wrong folder

- Date: 2026-10-02
- Prompt / session: [P-025](../07-prompts/session-log.md#p-025-node-22-and-template) (/milestone-done for M5)
- What the AI produced: A "fresh clone" check reporting a clean install and "Tests 8 passed (8)".
- How I checked it: Read the whole output, not just the result. The listing of the copy was empty, and `app/server/data` contained `sonrisa.db`, which a fresh copy can't have.
- What I found: Copying the deleted `app/.gitkeep` failed, which ended the `&&` chain before `cd`. The install and tests ran in the working folder, so the "pass" said nothing about a fresh clone.
- Verdict: corrected
- What changed as a result: The check was redone, skipping deleted files and printing and checking the working folder, file count, and the absence of `node_modules` and the database before installing. The valid run passed, and it is the run that exposed R-016.
- Related decision: none

## R-019: Mutation check of the dedup tests

- Date: 2026-10-02
- Prompt / session: [P-024](../07-prompts/session-log.md#p-024-approve-m4-entries-build-the-m5-skeleton)
- What the AI produced: Schema tests for event dedup (`event_keys` primary key) and notification dedup (`deliveries` unique key).
- How I checked it: Removed both constraints from `schema.sql`, ran the tests, then restored the file.
- What I found: Exactly the two dedup tests failed (`Tests 2 failed | 6 passed (8)`); with the schema restored all 8 passed. The tests exercise the constraints, not a copy of them.
- Verdict: accepted
- What changed as a result: Nothing in the code. This kind of check is to be repeated for the M6/M7 dedup and matching logic.
- Related decision: D-005

## R-020: BBC GUID suffix is not stable

- Date: 2026-10-02
- Prompt / session: [P-026](../07-prompts/session-log.md#p-026-close-m5-build-m6-ingestion)
- What the AI produced:
  - In M3, [data-sources.md](../03-research/data-sources.md) said 8 of 278 BBC GUIDs appear in more than one feed, and flagged the `#0` suffix as a possible risk (*unverified*).
  - The M4 design used the full `guid` as the BBC external ID.
- How I checked it: While writing the multi-feed test in M6, the AI found that the one GUID shared by two fixtures ended in `#2`, not `#0`. It then compared article URLs with the suffix removed, across all stored BBC feeds.
- What I found:
  - The suffix differs for the same article between feeds (`#0` in business, `#2` in world). One article appears twice in one feed, as `#1` and `#3`.
  - By article URL, **34** BBC articles appear more than once. The M3 count of 8 compared full GUIDs, so it was too low.
  - Deduplicating on the full GUID would have delivered those stories twice.
- Verdict: corrected
- What changed as a result: The BBC external ID is the article URL without `#n`. A test uses the real `#0` vs `#2` case. The design mapping and data-sources item 8 are corrected. A mutation that keeps the suffix makes 4 tests fail.
- Related decision: D-005, D-028

## R-021: Order-dependent multi-feed test missed a mutation

- Date: 2026-10-02
- Prompt / session: [P-026](../07-prompts/session-log.md#p-026-close-m5-build-m6-ingestion)
- What the AI produced: Ingest tests for one story in several feeds, including "a story new in a baselined feed is notified even if a not-yet-baselined feed carries it too".
- How I checked it: Mutation checks. The AI removed the within-poll grouping (every item became its own group) and ran the suite.
- What I found:
  - All 34 tests still passed. Without grouping, the second copy of a story finds the first one in the database inside the same transaction, so the categories still got linked.
  - Grouping only matters when a story is first seen in a not-yet-baselined feed. The test listed the baselined feed first, so it couldn't tell.
  - The other two mutations (baseline ignored; BBC suffix kept) were caught, by 5 and 4 failing tests.
- Verdict: corrected
- What changed as a result: The test now lists the not-yet-baselined feed first, and the grouping mutation fails it. The lesson: a passing test is only evidence if a broken implementation makes it fail.
- Related decision: D-027, D-028

## R-022: Segfault when inspecting the database on Node 20

- Date: 2026-10-02
- Prompt / session: [P-026](../07-prompts/session-log.md#p-026-close-m5-build-m6-ingestion)
- What the AI produced: An ad-hoc `node -e` script to inspect the real-run database, run in a shell that was still on the global Node 20.
- How I checked it: Read the exit code instead of the partial output: 139 (segfault).
- What I found:
  - `better-sqlite3` 13 (which needs Node 22) was loaded by Node 20. It crashed instead of failing with a clear error.
  - The app was not affected: `npm` scripts ran on Node 22 via `nvm use`. Re-run on Node 22, the same check worked.
  - The risk is real for anyone who opens the database with the wrong Node: a crash, not a helpful message.
- Verdict: corrected (the check was re-run correctly)
- What changed as a result: Every later database check runs after `nvm use`. Root `engines` already says `>=22.12.0`. *Not done:* a runtime guard that exits with a clear message on Node < 22. That would be cheap; it is for the author to decide.
- Related decision: D-032

## R-023: M7 mutation checks and the redirect gap

- Date: 2026-10-02
- Prompt / session: [P-027](../07-prompts/session-log.md#p-027-close-m6-start-m7)
- What the AI produced: The M7 matching and delivery code, plus 25 delivery tests that all passed on their first run.
- How I checked it: A first run that passes everything is no evidence by itself, so the AI broke each guarantee in turn, ran the suite and restored the code. It also re-read what each Slack test actually exercised.
- What I found:
  - **All 9 mutations were caught:**
    - forward-only cut-off removed;
    - notify flag ignored;
    - delivery unique key removed;
    - no isolation (a throw escapes dispatch);
    - host check by substring;
    - no re-check before send;
    - real transport follows redirects;
    - demo keeps real IDs;
    - email HTML not escaped.
  - **One gap, found before the mutation run.** The redirect test used the *test* transport, which itself sets `redirect: 'manual'`. So it proved the channel fails a 3xx, but not that the *real* transport refuses to follow one.
- Verdict: corrected
- What changed as a result:
  - The real transport is exported and tested directly against the mock receiver. The mock's redirect target (`169.254.169.254`) is shown never to be requested, and the "follows redirects" mutation fails that test.
  - Also cleaned up: a convoluted assertion now uses a plain event ID.
- Related decision: D-005, D-022, D-027, D-030

## R-024: nodemailer doc URLs returned 404

- Date: 2026-10-02
- Prompt / session: [P-027](../07-prompts/session-log.md#p-027-close-m6-start-m7)
- What the AI produced: Fetch-script entries for `https://nodemailer.com/smtp/` and `/message/`, URLs written from memory.
- How I checked it: The fetch script records the HTTP status of every saved file.
- What I found: Both returned **404**; the site has moved its pages. The real paths, read from the homepage links, are `/smtp` and `/message` with no trailing slash. The 404 bodies were deleted and the pages re-fetched (200).
- Verdict: corrected
- What changed as a result: The SMTP options (`host`, `port` defaulting to 587 or 465 if `secure`, `secure`, `auth`) and message fields (`from`, `to`, `subject`, `text`, `html`) now come from the stored pages, as CLAUDE.md requires for things that can't be called without credentials. A real SMTP send remains *unverified*, and the README says so.
- Related decision: D-010

## R-025: Real Slack error body is the error name

- Date: 2026-10-02
- Prompt / session: [P-027](../07-prompts/session-log.md#p-027-close-m6-start-m7)
- What the AI produced: The design marked as *unverified* whether a failed webhook's response body is exactly Slack's error name (design F9), so the code stores the raw text.
- How I checked it: In the real run, a delivery to Slack's own documentation placeholder webhook (`T00000000/B00000000/X…`) on the real `hooks.slack.com`. The response was then saved with its headers in [slack-webhook/](../03-research/raw-responses/slack-webhook/).
- What I found: `HTTP 404` with body `no_team`, the bare error name from the doc's list. The other channels in the same inject were sent, and the full URL never appeared in the API or the log.
- Verdict: accepted
- What changed as a result: This is one real data point for the error format; other errors are still unverified. A successful real post is still to be shown in the author's M8 test (D-023).
- Related decision: D-022, D-023

## R-026: Demo content did not match the chosen category

- Date: 2026-10-02
- Prompt / session: found in [P-027](../07-prompts/session-log.md#p-027-close-m6-start-m7), fixed in [P-028](../07-prompts/session-log.md#p-028-close-m7-start-m8)
- What the AI produced: Demo inject with one stored item per source, relabelled with the chosen category.
- How I checked it: Read the real-run output, not just the statuses.
- What I found: Injecting GDACS "Tropical cyclones" delivered a drought story labelled "GDACS · Tropical cyclones". Every status was `sent`, but the demo would mislead whoever watched it.
- Verdict: corrected
- What changed as a result:
  - GDACS demo data holds the first real item of each of the six event types from the stored response.
  - Inject picks the item for the chosen category.
  - A test checks every type's raw `eventtype`.
  - BBC and UN News still used one item, relabelled with the chosen section. Not fixed at first: the author asked for GDACS only.
  - **Follow-up ([P-031](../07-prompts/session-log.md#p-031-bbc-demo-per-section)):** after the real Slack test showed a World story labelled "Business" (R-031), BBC got the same fix. Its demo data now holds the first real item of each of the seven stored section feeds.
  - **Test:** a per-category test, for every BBC section and every GDACS type, checks that the injected event carries exactly the picked category, and that its item really belongs there (the BBC `guid` is in that section's own stored feed; the GDACS `eventtype` matches).
  - **Mutation check:** making inject use the first stored item again fails 12 of these tests. The two that still pass are the first category of each source, whose first item is already correct.
  - **UN News ([P-032](../07-prompts/session-log.md#p-032-un-news-demo-per-feed)):** the same fix. One real item per stored feed (17), with the same per-feed test. The 14 UN feeds the tests lacked were added as fixtures; five of them were stored gzip-compressed and are decompressed for the fixtures.
  - **Mutation check:** relabelling fails 15 of the 17 UN tests (27 in total with BBC and GDACS).
    - Climate change still passes because it is the first feed.
    - Economic development still passes because the first climate story is genuinely also in the stored economic-development feed; UN News files one story under several topics (M3: 131 of 369 GUIDs).
    - The test checks real membership, so in real data it can pass for more than one feed. That is accepted.
  - No demo item is relabelled any more.
- Related decision: D-017

## R-027: Real Slack keys briefly in .env.example

- Date: 2026-10-02
- Prompt / session: [P-030](../07-prompts/session-log.md#p-030-real-slack-test-close-m8)
- What happened: While setting up the real Slack test, the author first put the real Slack client ID and secret into `.env.example`, the committed template, instead of `.env`. This was the author's own mistake, not AI output.
- How I checked it: The author caught it before any commit, moved the keys to `.env` and restored `.env.example`. The AI then verified this without printing any value:
  - `git diff HEAD -- .env.example` changed no lines, and every value is empty;
  - `.env` is git-ignored (`.gitignore:9`), not tracked and not staged;
  - a script took the values from `.env` and searched every working-tree file, the whole git history (`git log --all -S`) and the Claude Code session logs that feed the transcript export.
- What I found: The client ID and secret appear nowhere. The only match is the redirect URI (`https://localhost:5173/...`), which is public and appears in the README and tests on purpose.
- Verdict: accepted (no leak)
- What changed as a result: The README says keys go in `.env` only, never in `.env.example`. The secrets scan at every /milestone-done also checks that no `.env` is staged.
- Related decision: D-009

## R-028: Chrome screenshots raced the app

- Date: 2026-10-02
- Prompt / session: [P-029](../07-prompts/session-log.md#p-029-continue)
- What the AI produced: Screenshots taken with `chrome --headless --screenshot`, and a first conclusion that the user view's settings were stuck on "Loading…".
- How I checked it:
  1. Called the endpoints directly: all 200 within milliseconds. No JS errors in the browser console.
  2. Tried to count the browser's open connections: none, because Chrome had already exited.
  3. Compared captures: the result changed from run to run.
- What I found:
  - `--screenshot` captures at the page's load event, before the app's API requests finish; `--timeout` only applies when the load event never comes. The "stuck" sections were a measurement artefact.
  - With `--virtual-time-budget`, Chrome hung instead, because the open SSE connection never lets the network go idle.
- Verdict: corrected
- What changed as a result: [screenshot.mjs](../scripts/screenshot.mjs) drives Chrome over the DevTools protocol and waits for real page text before capturing. With `--live` it injects an event while the page stays open and waits for it to appear without a reload.
- Related decision: D-004

## R-029: Feed hid the settings and showed ingest times

- Date: 2026-10-02
- Prompt / session: [P-029](../07-prompts/session-log.md#p-029-continue)
- What the AI produced: The first M8 user view: the live feed first (50 items), then subscriptions and channels. Each event showed `ingestedAt`.
- How I checked it: Looked at the first full-page screenshot, not just whether the page rendered.
- What I found:
  - The feed pushed "My alerts" and "Channels", including the Connect Slack button, far down the page.
  - Every first-poll item showed the same 17:42 timestamp, because it was the time *we* stored it.
- Verdict: corrected
- What changed as a result: Settings come first, and the feed scrolls inside a fixed height. Events show `occurredAt`, then `publishedAt`, and only then the ingest time; forecasts say "expected". The sections also now show their load errors instead of rendering nothing.
- Related decision: none

## R-030: SSE through the Vite proxy verified

- Date: 2026-10-02
- Prompt / session: [P-029](../07-prompts/session-log.md#p-029-continue)
- What the AI produced: Live updates over SSE through the Vite dev proxy. The design had marked proxy buffering as *unverified*.
- How I checked it:
  1. Held a `curl -N` stream open through `:5173`, made changes, and timestamped each line.
  2. In headless Chrome, injected a demo event while the page stayed open.
  3. Re-ran the stream check over HTTPS.
- What I found:
  - Every message arrived within about 300 ms of the change that caused it, in order: `user.updated`, `events.created`, then one `delivery.updated` per channel. So it is not buffered.
  - The browser showed the injected event 4 ms after the inject call returned, with no reload.
  - The stream also works over HTTPS (`: connected`).
- Verdict: accepted
- What changed as a result: The design's unverified point is closed. The stream sends `X-Accel-Buffering: no` and a ping every 25 s.
- Related decision: D-004

## R-031: Real Slack test, Q5 answered

- Date: 2026-10-02
- Prompt / session: [P-030](../07-prompts/session-log.md#p-030-real-slack-test-close-m8)
- What the AI produced: Connect Slack built only from the stored docs, tested only against a mock token endpoint. Q5 (does Slack accept a localhost redirect?) was still open.
- How I checked it: The author created a free workspace and a Slack app, ran `HTTPS=1 npm run dev` and connected through the button. The author then subscribed Ada to BBC Business on Slack and injected a demo. The AI looked at both screenshots.
- What I found:
  - Slack accepted `https://localhost:5173/api/slack/oauth/callback`. The OAuth webhook was stored with the label `#new-channel` and shown masked. The delivery is `sent`, and the message from the "Sonrisa" app appears in the channel ([message](../08-screenshots/m8-slack-real-message.png), [admin](../08-screenshots/m8-admin-slack-sent.png)).
  - Also visible: the BBC demo is a World story labelled "Business". That is the BBC/UN relabelling left open in R-026.
  - Not tested: cancelling on Slack's approval page.
- Verdict: accepted
- What changed as a result: Q5 is closed and D-023 is done. The README says `https://localhost` works. Cancel stays *unverified*.
- Related decision: D-007, D-021, D-023

## R-032: Port 5173 in use, and a cleanup that could stop the author's process

- Date: 2026-10-02
- Prompt / session: [P-030](../07-prompts/session-log.md#p-030-real-slack-test-close-m8) (/milestone-done for M8)
- What the AI produced:
  - The clean-copy app check for M8.
  - A cleanup step used since M5: `lsof -ti tcp:3001 -ti tcp:5173 | xargs kill`.
- How I checked it: Read the web log when `GET /` returned `000`.
- What I found:
  - Port 5173 was already in use, so Vite silently moved to 5174 and the checks hit the wrong port.
  - The cleanup kills *any* process on those ports. Whatever held 5173, most likely the author's own dev server from the Slack test, was very likely stopped. The data wasn't affected.
  - Silent port switching would also break Connect Slack, because `SLACK_REDIRECT_URI` assumes `:5173`.
- Verdict: corrected
- What changed as a result: Vite uses `strictPort: true`, so it fails loudly instead of moving. The check was redone after confirming both ports were free, and it stopped only its own processes. The author was told.
- Related decision: D-021

## R-033: M9 independent review (whole repo)

- Date: 2026-10-02
- Prompt / session: review in [P-033](../07-prompts/session-log.md#p-033-m9-independent-review), checks and fixes in [P-034](../07-prompts/session-log.md#p-034-m9-check-and-fix-the-findings)
- What the AI produced: The `code-reviewer` agent (read-only, fresh context) reviewed the whole repo: 12 findings (4 medium, 8 low) and 2 unverified suspicions. It reported invented API fields, SSRF, secrets, injection and hollow tests as clean.
- How I checked it: The main session re-read every cited line. It reproduced the suspicions by running the server. Each fix got a test, and each new test was run against the old code (a mutation) to show it fails there. The UI fix was checked in headless Chrome with the subscriptions request forced to fail.
- What I found, and the author's decision per finding:

| # | Finding | Check | Author's decision | What changed |
| --- | --- | --- | --- | --- |
| 1 | Item normalise errors are only counted. The feed shows healthy and is still baselined, so a source that changes shape is a silent outage, then a flood once items parse again | Valid (ingest.ts) | fix | A feed whose items **all** fail counts as a failed fetch: error shown, not baselined. Some failed: the feed is baselined, and "k of n items failed to normalise: …" is shown as its error. The worker log prints the messages. 3 tests; all 3 fail on the old code. Still open: an item that failed during the baseline and parses later is notified as new (design F3 note) |
| 2 | `startWorker` (poll → deliver) has no test | Valid. One claim is wrong: passing `baselineEventIds` to `deliver` would *not* flood anyone, because `match` only selects `notify = 1` events (mutation run: all tests pass, behaviour unchanged) | fix | New `worker.test.ts`: a new event after the baseline is delivered once, the baseline never; no overlapping polls; a failed fetch is logged and the next poll runs. Removing the `deliver` call fails test 1; removing the overlap guard fails test 2 |
| 3 | The subscription grid renders before the saved subscriptions load. Save replaces the whole set, so a failed or slow load plus one click deletes them all; switching user shows the previous user's set | Valid. Confirmed in Chrome with the subscriptions request answering 500: the old code showed 93 unchecked boxes | fix | The grid waits for `saved` and shows "Could not load" on error. `useLiveJson` keeps data with its URL and never returns another URL's data. Chrome re-check: 0 boxes, "Could not load: … HTTP 500". The user-switch race was fixed by reading the code, not reproduced in a browser |
| 4 | Dispatch: a destination removed mid-dispatch leaves the delivery `pending`; a bad config `JSON.parse` outside the try aborts the rest of the loop | Valid (dispatch.ts) | fix | LEFT JOIN: marked `failed` "destination removed before send". Bad JSON: `failed` "destination config is not valid JSON" (the config text is never stored). 2 tests, both fail on the old code |
| 5 | Vite proxies to `process.env.PORT`, which does not include the root `.env`; `PORT=4000` in `.env` breaks the UI | Valid. Not run on the old code; fix verified by running it | fix | `vite.config.ts` loads the root `.env` with Vite's `loadEnv`. Run with `PORT=4000` in `.env`: API on 4000, `/api/health` through :5173 → 200, SSE → 200 |
| 6 | The user view hard-codes the `slack` hash and "Slack connected" (D-001); the seed names channels | Valid | fix the text; seed is fine | The hash is now `#/?connect=<channel id>&result=…`, and the text uses the channel's `label` from `/api/channels`. The web code names no channel. OAuth tests updated |
| 7 | The plan's M8 row, assumptions, design (S2) and this log claim both Slack paths, and cancelling, were tested for real | Valid for the plan row, assumptions, design and the S2 row. D-023's own "Done in M8" note was already accurate | fix the docs | Corrected: only Connect Slack (OAuth) was tested for real; the pasted webhook only with the mock (plus R-025's real 404); cancel untested. README "Known gaps" says so |
| 8 | No test covers `scrub()` (dispatch) or `hide()` (Slack) | Valid. Mutation: removing `hide` alone still passed even with the new end-to-end tests, because `scrub` masks the same URL in the same format. The layers overlap | fix | Tests: Slack transport error and echoed body stored masked; Slack `send` masks by itself (fails without `hide`); a generic channel leaking a secret, returned or thrown, is scrubbed (fails without `scrub`) |
| 9 | OAuth callback `catch {}` logs nothing; `remove()` has no try/catch | Valid | fix | The exchange error message is logged (cut to 200 chars; never the request or response). Test: logged, and without the client secret. `remove()` shows the error in the form |
| 10 | `&` in Slack link URLs not escaped; the stored doc says `&`, `<`, `>` "must be converted to HTML entities if they're not going to be used for their parsing purpose" | Valid against the stored doc | fix | The link URL goes through the same escaping; `\|` is percent-encoded. Test updated (`&amp;` in the GDACS link). *Unverified:* how Slack renders it; not sent to a real workspace |
| 11 | No `guid`: the RSS fallback to `link` has a different form, so one story could be stored twice | Valid, never observed (every stored item has a guid) | **won't fix** | Added to the Later list in [assumptions](../02-plan/assumptions.md#later-out-of-scope-for-the-24-hour-build) |
| 12 | Design doc drift: Slack `blocks`, `{ webhookUrl, channelLabel }`, `send(NormalisedEvent)` | Valid | fix | Design now says `{ text }` only, label in `destinations.label`, `send(DeliveryEvent)`, and `status().connect`. Note: D-017's wording "Slack blocks" also differs from the code (text only); D-017 is the author's, so it is left as written |
| S-a | Ctrl+C may hang with an SSE client open | Partly valid. With plain `node`/`tsx` (as `npm start` runs it) and an open SSE stream, SIGINT left the server running, and the in-flight poll crashed with "The database connection is not open". Under `npm run dev` it did not hang: tsx force-kills the process (all exited in 1 s with the old code) | fix | `shutdown()` closes all connections and calls `process.exit(0)`. Re-run: exit code 0 within 2 s, no crash line; `npm run dev` also exits cleanly |
| S-b | Email subject header injection from feed titles | Unverified whether nodemailer strips CR/LF; not checked against its docs | fix ourselves | CR and LF are replaced with a space in the subject. Test with `\r\nBcc:` in a title |

- Verdict: corrected (12 valid findings, one with a wrong sub-claim; one suspicion partly valid, one unverified and fixed anyway)
- What changed as a result: The fixes above. 127 tests pass (113 before). Typecheck is clean for server and web.
- Related decision: D-001, D-014, D-023, D-027, D-034

## R-034: The app crashed silently on Node 20; lockfile out of date

- Date: 2026-10-02
- Prompt / session: [P-033](../07-prompts/session-log.md#p-033-m9-independent-review) (run by the main session; the review agent can't run anything)
- What the AI produced: A no-keys start check in a clean copy of HEAD with an empty environment (only `PATH` and `HOME`).
- How I checked it: Ran `npm install && npm run dev` and probed `/api/health` and `:5173`.
- What I found:
  - On the shell's default Node 20.19.5, install succeeded. The API server then crashed with a segfault (exit 139) and printed nothing, while the web server answered 200. The full environment crashed the same way, so the cause was the Node version, not missing keys.
  - On Node 22.23.3: everything started with no keys (email "dev outbox", Slack "paste a webhook", all 4 sources polled, health 200).
  - A clean `npm install` added `"hasInstallScript": true` for `better-sqlite3` to `package-lock.json`, so the committed lockfile was not what npm generates.
- Verdict: corrected
- What changed as a result: [D-034](../05-decisions/decision-log.md#d-034-enforce-node-22-at-install-and-start): `engine-strict` plus a startup check, both verified on Node 20. The regenerated lockfile was committed on its own (bb6bc62).
- Related decision: D-032, D-034

## R-035: M9 re-review of the fixes

- Date: 2026-10-02
- Prompt / session: review in [P-034](../07-prompts/session-log.md#p-034-m9-check-and-fix-the-findings), decisions and fixes in [P-035](../07-prompts/session-log.md#p-035-m9-re-review-fixes-close-m9)
- What the AI produced: A second `code-reviewer` pass (read-only, fresh context) on only the files changed since b7cf759.
- How I checked it: Shown to the author as reported, then fixed as the author decided. Each code fix has a test that fails on the code before the fix where it can be tested. The banner was checked in headless Chrome.
- What I found: 0 critical, 0 high, 0 medium, 7 low. It found every R-033 fix correct by reading, except where noted below. It found no remaining `slack=` hash anywhere.

| # | Finding | Author's decision | What changed |
| --- | --- | --- | --- |
| 1 | Fix 4 incomplete: `scrub()` runs outside any try. Valid-JSON config with a non-string secret (e.g. `{"webhookUrl":5}`) makes `maskWebhookUrl` throw, which aborts the dispatch loop and leaves later deliveries `pending` | fix | `scrub` is wrapped: on failure the stored error is "error text hidden: it could not be masked" (never the unmasked text), and the loop goes on. The test sends the bad delivery first; on the old code it fails with `url.slice is not a function` |
| 2 | The connect-result text takes `connect` and `result` from the hash, so a crafted link can show any text in a status box. Escaped by React, so no XSS; local demo | fix: only fixed messages, no text from the URL | The banner shows only "<label> connected.", "<label> was not connected." or "<label> connection failed.", and only for a registered channel. An unknown channel shows nothing. Slack's error name, no longer shown, is logged by the server (`slack oauth: error:…`, tested). Chrome check: `connect=Your bank` → no banner; `connect=slack&result=error:call 555 now` → "Slack connection failed.", no "555" on the page |
| 3 | Vite `loadEnv` also reads `.env.local` and `.env.development[.local]`; the server reads only `.env`. `PORT` only in `.env.local` would split them | document only: only `.env` is supported | Said in README, `.env.example` and the `vite.config.ts` comment. No code change |
| 4 | "Interrupted before send" is wrong for a send cut off after Slack or SMTP received it. Pre-existing F8 wording; Ctrl+C mid-dispatch now reaches it | fix: say the outcome is unknown | The error is now "interrupted: outcome unknown, it may have been delivered", and the start-up log says "(outcome unknown)". The status stays `failed` (no new status). Design F8 and code comments updated; test updated |
| 5 | design.md says "Slack not connected"; the code says "Slack was not connected." | fix | Design text matches the code and lists the three fixed messages |
| 6 | design.md says "<label> not connected" appears next to subscriptions; it only appears on the channel form. Not touched in this change (pre-existing) | fix | Both design lines now describe what the UI does |
| 7 | P-034 pointed to R-035 before it existed | fixed by this entry | — |

- Unverified suspicions it raised, left as they are by the author's decision:
  - Node's JSON parse error message includes a short snippet of the response body, and the OAuth log line would print it. Not checked; the client secret can't be in it.
  - The 2 s `until` timeouts in `worker.test.ts` could be tight on a loaded CI machine. Not seen in any local run this session.
- Verdict: corrected
- What changed as a result: The fixes above. 128 tests pass. Typecheck is clean.
- Related decision: D-001, D-030, D-034
