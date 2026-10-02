# Decision Log

Every significant decision, in the order it was made. Newest at the bottom.

## Template

```
## D-NNN: <short title>

- Date:
- Status: proposed | accepted | superseded by D-NNN
- Context: what forced the decision
- Options considered:
  1.
  2.
- Decision:
- Why:
- AI involvement: what the AI suggested, and whether I accepted it
- Consequences / trade-offs:
```

## Entries

All entries below were decided by the author, after the AI's [brief analysis](../03-research/brief-analysis.md). Where each one comes from:

| Entries | Prompt |
| --- | --- |
| D-001 to D-012 | [P-005](../07-prompts/session-log.md#p-005-author-decisions) |
| D-013 to D-017 | [P-006](../07-prompts/session-log.md#p-006-decision-revisions) |
| D-018 | [P-007](../07-prompts/session-log.md#p-007-close-q1) |
| D-019, D-020 | [P-009](../07-prompts/session-log.md#p-009-priorities-and-review-milestone) |
| D-021 to D-023 | [P-016](../07-prompts/session-log.md#p-016-doc-fixes-and-slack-decisions), D-021 completed in [P-017](../07-prompts/session-log.md#p-017-review-entries-and-slack-button) |

"Why" quotes the author where a reason was given. Where none was given in P-005, the AI drafted one, marked *AI-inferred, confirmed*: the author reviewed and confirmed these in P-006.

## D-001: Channels are delivery mechanisms, one module per channel

- Date: 2026-10-02
- Status: accepted
- Context: The brief asks for Email and Slack, and for flexibility to "add more channels later".
- Options considered:
  1. Code-level adapter: one module per channel behind a shared interface.
  2. Channels configurable at runtime with no deploy.
- Decision: A channel is a delivery mechanism (Email, Slack), not a topic. A new channel (SMS, Teams, ...) is one new module, with no change to the core.
- Why: Author: new channels must be easy to add later.
- AI involvement: The AI proposed the same thing in brief-analysis A10, and suggested adding a stub third channel to prove the claim. Building the stub was decided in [D-019](#d-019-build-a-stub-log-channel).
- Consequences / trade-offs: The core (matching, dedup, scheduling) must not reference specific channels. Adding a channel needs a code change and a deploy, and that is accepted.

## D-002: Three fixed topics, on/off per user

- Date: 2026-10-02
- Status: superseded by [D-013](#d-013-categories-come-from-the-sources-not-a-fixed-list)
- Context: The brief gives examples ("breaking news, market movements, natural disasters, that kind of thing") without saying how users choose.
- Options considered:
  1. Per-user structured rules with filters (region, ticker, keyword, severity). This was the AI's default in A1/A7.
  2. Fixed topics with an on/off switch per user and a channel choice per topic.
- Decision: Option 2. The topics are **breaking news**, **economy / markets** and **natural disasters**.
- Why: *AI-inferred, confirmed:* this is the simplest model that still delivers the brief within 24 hours, and the UI is trivial to use.
- AI involvement: Overrides the AI's default of per-user filters (A1, A7). The AI points out that this puts the whole definition of "important" on system thresholds (open question Q1 in [assumptions](../02-plan/assumptions.md)).
- Consequences / trade-offs: Users cannot narrow a topic (e.g. "only earthquakes near me"). Filters are listed under Later.

## D-003: Push where supported, polling otherwise

- Date: 2026-10-02
- Status: accepted
- Context: The brief says nothing about how events are detected.
- Options considered:
  1. Polling only (the AI's default in A2).
  2. Push where the source offers it, polling otherwise.
- Decision: Option 2.
- Why: *AI-inferred, confirmed:* lower latency where a source allows it, without excluding sources that don't.
- AI involvement: Extends the AI's polling-only default. The AI notes that few free sources offer push (Q4), so push should only be built for a verified source that has it. Author confirmed in P-006: push only where verified.
- Consequences / trade-offs: The source interface must support both modes.

## D-004: Live UI without refresh

- Date: 2026-10-02
- Status: accepted
- Context: Alerts and deliveries happen in the background. A static UI would hide them.
- Decision: Both the user and admin views update live, without a page reload.
- Why: *AI-inferred, confirmed:* the system's behaviour (events arriving, deliveries succeeding or failing) is visible as it happens. This matters for the demo.
- AI involvement: Not raised in the AI's analysis.
- Consequences / trade-offs: The server needs a channel to push updates to the browser, and this is one reason for D-011 (no Next.js).

## D-005: Deduplicate events and notifications

- Date: 2026-10-02
- Status: accepted
- Context: Polling sees the same event many times, and several sources may report the same event.
- Decision: Events are deduplicated, and notifications are deduplicated separately. A user never receives the same event twice on the same channel.
- Why: *AI-inferred, confirmed:* duplicate alerts are the fastest way to make users mute the product.
- AI involvement: Matches the AI's analysis (gap 2, risk 5).
- Consequences / trade-offs: This needs stable event identity (source + external ID) and a uniqueness constraint per notification. Cross-source dedup (the same quake from two feeds) is harder and depends on the sources chosen. It is deferred to Later (P-016): dedup is per source only.

## D-006: Two views, no authentication

- Date: 2026-10-02
- Status: accepted
- Context: The brief asks for an admin view and does not mention auth.
- Options considered:
  1. Minimal auth with user and admin roles (the AI's default in A12).
  2. No auth. The views are separate but open.
- Decision: Option 2. The admin sees everything, including failed deliveries, and can inject a demo event.
- Why: *AI-inferred, confirmed:* auth costs time and shows nothing the brief asks for. Demo event injection makes the pipeline testable without waiting for a real event.
- AI involvement: Overrides the AI's minimal-auth default (A12). The admin's control actions (disabling users or alerts, pausing sources, from A11) were not adopted; demo injection was added instead. The AI notes that the user view still needs some way to pick a user identity (Q3, resolved by [D-015](#d-015-simple-user-picker)), and recommends that injected events go through the full pipeline (accepted in P-006).
- Consequences / trade-offs: Anyone with access to the app sees everything. This is acceptable only for a local demo, and the root README says so.

## D-007: Slack OAuth if configured, webhook paste otherwise

- Date: 2026-10-02
- Status: accepted (amended by [D-021](#d-021-connect-slack-button-is-a-must-have))
- Context: The brief requires Slack. The AI's default was webhook paste only (A9).
- Decision: Slack is required (the brief names it). A user connects it with a "Connect Slack" OAuth button, which works when a Slack app is configured, or by pasting an incoming webhook URL. Webhook URLs are masked everywhere.
- Why: *AI-inferred, confirmed:* OAuth is the realistic product flow. Webhook paste keeps the zero-config promise (D-009).
- AI involvement: Extends the AI's webhook-only default. The AI notes that if OAuth uses the `incoming-webhook` scope, both paths end with a webhook URL, so delivery code can be shared (accepted in P-006). Whether Slack accepts a localhost redirect (Q5) is checked when the Slack integration is built.
- Consequences / trade-offs: Two connection flows to build and test. Secrets must be masked in the UI, API responses and logs.

## D-008: Free sources, keyless where possible, verified by a real call

- Date: 2026-10-02
- Status: accepted
- Context: The brief does not say where data comes from. AI tools are prone to inventing endpoints and response fields.
- Decision: Free sources only, keyless where possible. Every source is verified with a real call before code is written against it, and the raw responses are stored in [raw-responses/](../03-research/raw-responses/).
- Why: *AI-inferred, confirmed:* zero cost and zero setup for reviewers. Verification guards against hallucinated APIs.
- AI involvement: Matches the AI's risk 2.
- Consequences / trade-offs: Market data is the weak spot (Q2), resolved by [D-016](#d-016-drop-markets-if-they-need-a-key-or-registration).

## D-009: Zero-config local run

- Date: 2026-10-02
- Status: accepted
- Decision: `npm install && npm run dev` starts everything. No keys and no Docker are required. SMTP and Slack OAuth need credentials and switch on when configured; without them, email goes to the dev outbox and Slack is connected by pasting a webhook.
- Why: *AI-inferred, confirmed:* a reviewer can run it in one step.
- AI involvement: Not raised in the AI's analysis.
- Consequences / trade-offs: Every external dependency needs a fallback (dev outbox, webhook paste, keyless sources). The SQLite driver must install cleanly (Q6, checked at setup). One command has to start the API, worker and web UI.

## D-010: Email via SMTP if configured, dev outbox otherwise

- Date: 2026-10-02
- Status: accepted
- Decision: Email is sent over SMTP when it is configured. Otherwise it is written to a dev outbox that is visible in the admin view.
- Why: *AI-inferred, confirmed:* follows from D-009. Email delivery stays demonstrable without credentials.
- AI involvement: Close to the AI's default (A9), which suggested a local capture inbox. Here the outbox is shown in the app's admin view instead.
- Consequences / trade-offs: The outbox is a channel output, not a fake. It has to go through the same channel module as SMTP.

## D-011: Stack: React + Vite + shadcn, Node + TypeScript, SQLite

- Date: 2026-10-02
- Status: accepted
- Options considered:
  1. Next.js.
  2. A separate React + Vite front end and a Node + TypeScript back end.
- Decision: Option 2, with shadcn for UI components and SQLite for storage.
- Why: Author: not Next.js, because of the long-running worker and realtime updates.
- AI involvement: The AI's analysis deliberately left out the stack.
- Consequences / trade-offs: Two processes (or one server serving both) to orchestrate under `npm run dev`. SQLite fits a single-node demo. It is not a production choice for many concurrent writers.

## D-012: Defer remaining extras to Later

- Date: 2026-10-02
- Status: accepted
- Context: The AI's brief analysis listed 13 gaps a real system needs.
- Decision: Everything not covered by D-001 to D-011 is out of scope for the 24-hour build. The list is under "Later" in [assumptions](../02-plan/assumptions.md#later-out-of-scope-for-the-24-hour-build).
- Why: Author: out of scope for 24 hours.
- AI involvement: The AI argued that two items are core rather than extras: the common event model and per-channel message formatting, both of which D-002, D-005 and D-001 already require. The AI also recommended keeping a minimal version of source staleness monitoring, because of the silent-failure risk. The author accepted all three in P-006; see [D-014](#d-014-source-freshness-is-in-scope) and [D-017](#d-017-accepted-ai-recommendations).
- Consequences / trade-offs: Unhandled behaviour (e.g. a revised earthquake magnitude, flapping market alerts) must be documented, not discovered.

## D-013: Categories come from the sources, not a fixed list

- Date: 2026-10-02
- Status: accepted (supersedes [D-002](#d-002-three-fixed-topics-onoff-per-user))
- Context: D-002 fixed three topics. The AI pointed out that with on/off topics and no user filters, system thresholds carry the whole definition of "important" (Q1). The author changed the model instead.
- Options considered:
  1. Three fixed topics (D-002).
  2. Categories taken from what each source actually offers. The user picks any of them.
- Decision: Option 2. The selectable categories are whatever the chosen sources really provide (e.g. event types, sections, feeds). The user subscribes to any combination and picks channels for each. Research must establish what categories each source has before design.
- Why: Author: categories should come from the sources. *AI note:* this also grounds the category list in data that is verifiably there, instead of a list that sources may not support, and gives users a finer choice than three switches.
- AI involvement: Prompted by the AI's Q1 objection to D-002. The model itself is the author's.
- Consequences / trade-offs: The category list is data, not code, and can change when a source is added. The UI must render categories dynamically. Different sources' categories may overlap or use different granularity, and the design has to decide whether to merge or show them per source. The research step now includes a category inventory per source.

## D-014: Source freshness is in scope

- Date: 2026-10-02
- Status: accepted (amends [D-012](#d-012-defer-remaining-extras-to-later))
- Decision: The admin view shows the last successful fetch per source.
- Why: Author accepted the AI's argument: without it, a dead source looks the same as a quiet world.
- AI involvement: Recommended by the AI in the P-005 review.
- Consequences / trade-offs: Every fetch records success or failure and a timestamp. Alerting on staleness stays under Later.

## D-015: Simple user picker

- Date: 2026-10-02
- Status: accepted (resolves Q3)
- Decision: With no auth (D-006), the user view has a simple user picker over seeded demo users.
- Why: Author decision. It is the least effort that still gives preferences an owner.
- AI involvement: The AI raised the need (Q3) and offered this option.
- Consequences / trade-offs: Anyone can act as any user. This is acceptable for a local demo only (D-006).

## D-016: Drop markets if they need a key or registration

- Date: 2026-10-02
- Status: accepted (resolves Q2)
- Decision: Markets are included only if a source is free, keyless and needs no registration of any kind. Otherwise markets are dropped completely, with no keyed fallback.
- Why: Author decision. Keeps D-009 (no keys) intact rather than weakening it for one category.
- AI involvement: The AI raised the conflict between D-008 and D-009 for market data (Q2).
- Consequences / trade-offs: The brief names "market movements" explicitly, so dropping them must be stated as a deliberate gap with its reason. Under D-013 the user simply would not see market categories.

## D-017: Accepted AI recommendations

- Date: 2026-10-02
- Status: accepted
- Decision: The author accepted these AI recommendations from the P-005 review:
  1. A common event format and per-channel message formatting are core scope, not extras.
  2. Injected demo events go through the full pipeline (normalise, dedup, match, deliver).
  3. Both Slack connection paths store a webhook URL and share one delivery path.
  4. Push ingestion is built only for a source verified to offer it (Q4).
  5. Q5 (Slack localhost redirect) and Q6 (SQLite driver) are checked when those parts are built, not now.
- Why: Author confirmed in P-006.
- AI involvement: All five were proposed by the AI.
- Consequences / trade-offs: See the decisions each one refines: D-001, D-003, D-005, D-006, D-007, D-009.

## D-018: No importance filter, the source decides

- Date: 2026-10-02
- Status: accepted (closes Q1)
- Context: After D-013 the AI kept Q1 open: it proposed a system-level floor per source (e.g. a minimum severity) to define "important".
- Options considered:
  1. A system-level minimum per source, based on severity or magnitude fields (the AI's proposal).
  2. No floor and no filter. Users get everything the source publishes in the categories they picked. Volume is controlled by which sources are chosen.
- Decision: Option 2. No minimum level and no severity filter. If a source sends too much, research picks a different source; the system does not filter.
- Why: Author decision. *AI note:* this delegates the definition of "important" to the source's own editorial judgement (e.g. a curated alert feed instead of a raw one). That makes it explicit and inspectable, and removes thresholds the system would have had to justify.
- AI involvement: Rejects the severity floor the AI proposed in its reply to [P-006](../07-prompts/session-log.md#p-006-decision-revisions) (Q1). Rejected in [P-007](../07-prompts/session-log.md#p-007-close-q1).
- Consequences / trade-offs: Source selection becomes the main quality lever. Research must measure each category's volume from real responses, not just confirm the category exists. Sources that only offer an unfiltered firehose are ruled out. Users cannot tune volume except by unsubscribing from a category.

## D-019: Build a stub log channel

- Date: 2026-10-02
- Status: accepted
- Context: D-001 claims a new channel is one module with no core changes. The AI suggested proving this with a stub third channel. The plan had only stated the claim as a done-when criterion.
- Decision: Build a tiny third channel that only logs the message. It is a must-have.
- Why: Author decision. The brief asks for channels that are easy to add, and a working third channel shows this better than an argument does.
- AI involvement: Proposed by the AI (brief-analysis risk 6, plan review in P-008).
- Consequences / trade-offs: The stub must be added the same way a real channel would be, so the claim holds. If it needs a core change, that is a finding to log.

## D-020: Priorities follow the task, not effort

- Date: 2026-10-02
- Status: accepted (amended by [D-021](#d-021-connect-slack-button-is-a-must-have): the Connect Slack button moves from cut-first to must-have)
- Context: The first plan (P-008) set the cut order by effort and optionality.
- Decision: Three tiers, set out in the [plan](../02-plan/plan.md#priorities).
  - **Must have:** the process record, plus everything the brief literally asks for (category alerts; Email and Slack delivery, with a webhook being enough; easy-to-add channels with a stub; an admin view), plus deduplication and starting with no keys.
  - **Should have:** live updates, source freshness, more than one source.
  - **Cut first:** Slack OAuth, push ingestion, UI polish, markets.
- Why: Author: the evaluation weighs the process most, and the brief's literal asks define "done". Dedup and no-keys are must-haves because without them the app doesn't work or can't be run.
- AI involvement: Replaces the AI's effort-based cut order from P-008. Slack OAuth (D-007) and markets (D-016) are now explicitly expendable. Live updates (D-004) and source freshness (D-014) remain in scope but can be dropped if time runs out.
- Consequences / trade-offs: An independent code review (M9) is added before submission. The author decides what gets fixed.

## D-021: Connect Slack button is a must-have

- Date: 2026-10-02
- Status: accepted (amends [D-007](#d-007-slack-oauth-if-configured-webhook-paste-otherwise) and [D-020](#d-020-priorities-follow-the-task-not-effort))
- Context: D-007 called Slack "optional", which read as if Slack itself could be skipped, and D-020 put the Slack OAuth button first on the cut list.
- Options considered:
  1. Keep OAuth as cut-first; a pasted webhook alone covers "Slack" (D-020).
  2. Make both connection paths must-haves.
- Decision: Option 2. Slack is a must-have, and so is the "Connect Slack" button. When no Slack app is configured (as on a reviewer's machine), the button is shown but disabled, with a short note, and the paste-webhook option is next to it, so Slack still works with no keys.
- Why: Author decision.
- AI involvement: The AI flagged the wording conflict between D-007 ("Slack is optional") and D-020 (Slack is a must-have) in its P-015 review. The fix is the author's.
- Consequences / trade-offs: OAuth is no longer expendable, so Q5 (localhost redirect) is checked against Slack's docs during M3. If Slack does not accept a localhost redirect, the README documents the workaround; reviewers still have the webhook option. Because OAuth can't be tried without a Slack app, it is verified from Slack's official docs (CLAUDE.md exception) and the author's real test (D-023). The cut-first list is now push ingestion, UI polish, markets. The disabled-button behaviour was confirmed by the author in P-017.

## D-022: Pasted webhooks only to hooks.slack.com

- Date: 2026-10-02
- Status: accepted
- Context: With webhook paste, the server POSTs to whatever URL a user enters. That lets any user make the server call internal or arbitrary hosts (SSRF). The AI flagged this as an undecided gap in P-015.
- Options considered:
  1. Accept any URL.
  2. Accept only Slack incoming-webhook URLs.
- Decision: Option 2. A pasted webhook URL is accepted only if it is `https` and its host is exactly `hooks.slack.com`. Anything else is rejected with a clear error, both when saved and again before sending.
- Why: Author decision. Closes the SSRF hole without adding anything a real Slack user would miss.
- AI involvement: Raised by the AI as a gap; the rule is the author's.
- Consequences / trade-offs: Other webhook-style destinations (e.g. Teams, generic webhooks) would be separate channel modules with their own rules (D-001). The exact URL shape is to be confirmed from Slack's docs before it is coded (CLAUDE.md). Needs tests: allowed host, other hosts, look-alike hosts (e.g. `hooks.slack.com.evil.test`), `http`.

## D-023: Slack delivery tested with a mock receiver, then once for real

- Date: 2026-10-02
- Status: accepted
- Context: M7 requires delivery to "a Slack webhook" exactly once, but a real webhook needs a Slack workspace, which the no-keys rule (D-009) can't assume. The AI flagged that "Slack works" could otherwise be claimed without a real send.
- Decision: Automated tests send to a local mock receiver. The author creates a free Slack workspace at M7/M8, tests both connection paths for real once, and saves a screenshot.
- Why: Author decision. Tests stay key-free and repeatable; one real send proves the integration.
- AI involvement: Gap raised by the AI in P-015; the approach is the author's.
- Consequences / trade-offs: The mock only proves we send what we think Slack expects; the real test and screenshot are the proof that Slack accepts it. Until that test is done, docs must call Slack delivery "tested against a mock only". Note: with D-022, tests must allow the mock's host only in test configuration, never in normal runs.
