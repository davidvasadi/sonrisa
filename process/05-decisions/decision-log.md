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
| D-024 to D-026 | [P-019](../07-prompts/session-log.md#p-019-m3-source-decisions) |
| D-027 to D-031 | [P-021](../07-prompts/session-log.md#p-021-design-decisions-and-independent-review) |
| D-032, D-033 | [P-025](../07-prompts/session-log.md#p-025-node-22-and-template) |

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
- Consequences / trade-offs: The mock only proves we send what we think Slack expects; the real test and screenshot are the proof that Slack accepts it. **Done in M8 (P-030):** the author connected a free workspace through Connect Slack on `https://localhost`, and a demo delivery arrived in `#new-channel` ([message](../08-screenshots/m8-slack-real-message.png), [admin](../08-screenshots/m8-admin-slack-sent.png)). Not tested: cancelling on Slack's approval page. Note: with D-022, tests must allow the mock's host only in test configuration, never in normal runs.

## D-024: Market movements via BBC Business, no price feeds

- Date: 2026-10-02
- Status: accepted (resolves Q2; applies [D-016](#d-016-drop-markets-if-they-need-a-key-or-registration) and [D-018](#d-018-no-importance-filter-the-source-decides))
- Context: M3 found four keyless market sources (CoinGecko, Coinbase, Binance, Frankfurter), so D-016 does not drop markets. But all of them return price snapshots, not events. A "movement" alert would need a threshold chosen by the system, which D-018 rejects, and event detection, which the assumptions exclude ([data sources](../03-research/data-sources.md#what-was-different-from-what-i-expected)).
- Options considered:
  1. Drop price feeds; cover market movements through BBC Business, where the source decides what is newsworthy.
  2. One documented D-018 exception: a fixed movement rule on one keyless price source.
  3. Drop markets entirely.
- Decision: Option 1. There are no price feeds. Market movements are covered by the BBC Business section. The README names the gap: no price-based or per-instrument alerts.
- Why: Author decision. It keeps D-018 intact: the source decides what is important.
- AI involvement: The AI found the conflict and recommended option 1.
- Consequences / trade-offs: Users can't set alerts on a ticker or a % move. Coverage of markets is whatever BBC Business publishes.

## D-025: Final data sources

- Date: 2026-10-02
- Status: accepted (closes the M3 source choice)
- Context: M3 checked 16 candidate sources with real calls ([data sources](../03-research/data-sources.md)).
- Decision:
  - **USGS: the significant earthquake feed only** (about 0.3/day). The M4.5+ feed (17/day) is not offered.
  - **GDACS: the default event list**, which contains only Orange and Red alerts (about 0.23/day across six event types). The RSS feed, which is mostly Green alerts, is not used.
  - **BBC News: section feeds.** Volume is up to about 25/day for Top stories and World. That is acceptable because the user decides which sections to subscribe to.
  - **UN News: topic and region feeds** (0–16 items a week per feed).
  - Not used: EONET (mostly republished GDACS), NPR (kept as a fallback), Al Jazeera, GDELT, NWS, and the keyed or registration-gated sources (Guardian, ReliefWeb).
- Why: Author decision, following the AI's recommendation, with BBC kept despite its volume.
- AI involvement: The AI recommended these sources and flagged BBC's volume and the USGS M4.5+ option as questions. The author answered both.
- Consequences / trade-offs:
  - None of these sources offers push (Q4), so all are polled.
  - New items must be detected by `guid` or ID, not by time (UN dates have no time; BBC section feeds aren't chronological).
  - Event dedup keys on source + ID, not feed + ID.
  - A USGS earthquake may also appear in GDACS as EQ. That is cross-source dedup, which is under Later.
  - GDACS forecast items must be shown as forecasts.
  - Terms: BBC requires "BBC News" attribution and no logos. UN News allows personal, non-commercial use only, which is fine for a demo but not a product.

## D-026: GovSlack not supported

- Date: 2026-10-02
- Status: accepted (keeps [D-022](#d-022-pasted-webhooks-only-to-hooksslackcom))
- Context: Slack's webhook doc says GovSlack apps use "the slack-gov.com domain instead of the slack.com domain". D-022 accepts only `hooks.slack.com`.
- Decision: Keep D-022 unchanged. GovSlack webhooks are not supported, and the README notes the gap.
- Why: Author decision.
- AI involvement: Found by the AI while answering Q5 from Slack's docs. The AI recommended keeping D-022.
- Consequences / trade-offs: A GovSlack workspace can't receive alerts. Supporting it later means allowing one more exact host.

## D-027: First poll only marks items as seen; subscriptions apply forward only

- Date: 2026-10-02
- Status: accepted
- Context: Without a rule, the first poll of BBC World would store about 30 existing stories and send all of them to every subscriber. M3 also showed that BBC section feeds contain old items, e.g. a 2025 story in top stories ([design](../04-design/design.md#first-poll-and-old-items)).
- Decision:
  1. The first successful fetch of each source stores its items with `notify = 0` and notifies nobody.
  2. An event is delivered to a subscription only if it was ingested after the subscription was created.
- Why: Author decision. Both rules are about "already seen", not importance, so D-018 holds.
- AI involvement: Proposed by the AI in the M4 design draft.
- Consequences / trade-offs:
  - After a fresh start nothing is sent until a source publishes something new. The demo relies on inject (D-017) or a real new item.
  - An old item that shows up in a feed later for the first time is still treated as new. Accepted.

## D-028: One event can belong to several categories

- Date: 2026-10-02
- Status: accepted
- Context: Event dedup keys on source + ID, so a story in two feeds of the same source (BBC World and Top stories; 131 of 369 UN GUIDs) is stored once. With a single category per event, subscribers of the second feed would miss it.
- Decision: Add an `event_categories` table. A story seen in several feeds is stored once, linked to every category it appeared in. Matching uses any of its categories.
- Why: Author decision, following the AI's recommendation.
- AI involvement: Raised and recommended by the AI.
- Consequences / trade-offs: A user subscribed to both sections, on the same channel, still gets the story once, because notification dedup is per event, user and channel (D-005). A category link added on a later poll can't notify anyone, because the event already exists; only categories seen when the event is first stored count for delivery. *AI note:* this edge case will be tested.

## D-029: Channels are registered with one line in the channels folder

- Date: 2026-10-02
- Status: accepted (interprets [D-001](#d-001-channels-are-delivery-mechanisms-one-module-per-channel))
- Context: D-001 says a new channel needs no core change. Channels must be registered somewhere.
- Options considered:
  1. An explicit registry, `server/channels/index.ts`, with one import and one array entry per channel.
  2. Loading every file in `channels/` automatically.
- Decision: Option 1. The registry belongs to the channels folder, not the core, so adding a registry line is not a core change.
- Why: Author decision. It's explicit and easy to read.
- AI involvement: The AI proposed both options and recommended option 1.
- Consequences / trade-offs: Adding a channel such as Discord is one new file plus one line, with no change to matching, dispatch, the database, the API or the UI.

## D-030: No delivery retries

- Date: 2026-10-02
- Status: accepted (confirms [D-012](#d-012-defer-remaining-extras-to-later))
- Decision: No automatic or immediate retries. Failed deliveries are recorded with their error text and shown in the admin view. (A `retryable` flag was dropped after review finding F9: without retries nothing would read it; see [R-013](../06-ai-review/ai-review-log.md#r-013-independent-review-of-the-m4-design).)
- Why: Author decision. Retries with backoff stay under Later.
- AI involvement: The AI offered a single immediate retry as an option and recommended against it.
- Consequences / trade-offs: A brief network error loses that notification. Adding retries later would first need a way to tell temporary errors from permanent ones.

## D-031: Seven BBC sections

- Date: 2026-10-02
- Status: accepted (refines [D-025](#d-025-final-data-sources))
- Decision: Offer Top stories, World, Business, Politics, Science & environment, Technology and Health. Each has a stored sample from M3.
- Why: Author decision.
- AI involvement: Proposed by the AI.
- Consequences / trade-offs: More sections means one line each in the BBC module, plus a stored sample.

## D-032: Node 22 LTS

- Date: 2026-10-02
- Status: accepted (resolves Q6)
- Context: At M5 the app was built on Node 20.19.5. Node 20 has no built-in `node:sqlite` (`ERR_UNKNOWN_BUILTIN_MODULE`). `better-sqlite3` 12.11.1, the last version allowing Node 20, publishes prebuilt binaries only for Node ABIs 127, 137, 141 and 147, not for Node 20's ABI 115. So `npm install` compiled it from source with node-gyp. That worked only because this Mac has Xcode Command Line Tools and Python, and would fail on a reviewer's machine without build tools, breaking D-009. Three of the newest packages also require Node 22: `better-sqlite3` 13, `vitest` 5 and `concurrently` 10.
- Options considered:
  1. Require Node 22 LTS.
  2. Stay on Node 20.19 and document the build tools.
  3. Use `sql.js` (WASM), with no native build, but the app has to persist the in-memory database itself.
- Decision: Option 1. Node 22.12+ is required. `.nvmrc` says `22`. Root `engines` is `>=22.12.0`, the floor for vitest 5 and Vite 8. The README says Node 22+. The author's global nvm default stays on Node 20, because other projects use it.
- Why: Author decision, following the AI's recommendation.
- AI involvement: The AI found the native build, checked the release assets per ABI, and offered the three options.
- Consequences / trade-offs:
  - The Node-20 pins were lifted: `better-sqlite3` 13.0.3, `vitest` 5.0.3, `concurrently` 10.0.5, `@types/node` 22.20.5.
  - `better-sqlite3` 13 bundles prebuilt binaries for 8 platforms inside its npm package, so nothing is compiled. It still has an install step: npm runs `node-gyp rebuild` automatically because the package contains a `binding.gyp`. That `binding.gyp` is deliberately a no-op when a prebuilt exists (`prebuild_exists`): in a clean copy it finished in under a second and wrote only stamp files. But node-gyp itself needs Python and `make`. *Unverified:* whether `npm install` fails on a machine without them. This corrects the first version of this entry, which said there was no install script ([R-016](../06-ai-review/ai-review-log.md#r-016-better-sqlite3-13-still-runs-node-gyp)).
  - Reviewers on Node 20 must switch versions.

## D-033: Admin layout from satnaing/shadcn-admin, copied in part

- Date: 2026-10-02
- Status: accepted
- Context: At M5 the AI checked three MIT React + Vite shadcn admin templates on GitHub: stars, last commit on the default branch, and dependencies.
- Decision: Use [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) at commit `e16c87f` (15.5k stars, last commit on `main` 2026-06-11), but copy only the layout and the UI components the app uses. Clerk and login are removed. TanStack Router, cookies and the context providers are replaced by a small own layout and a two-view hash switch.
- Why: Author decision. Keep it small.
- AI involvement: The AI compared the three templates and noted that this one carries Clerk and 70 dependencies. The pick is the author's.
- Consequences / trade-offs:
  - **Copied:** 9 `ui/` components, `header` and `main`, the mobile hook, the theme CSS and `cn`. Each copied file has a provenance line, and the MIT licence is in `app/web/THIRD-PARTY-NOTICES.md`.
  - **Added:** 12 runtime and build dependencies (Radix primitives, Tailwind 4, lucide, cva, clsx, tailwind-merge), all MIT, Apache-2.0 or ISC.
  - **Future updates:** any later upgrade of the template is manual.

