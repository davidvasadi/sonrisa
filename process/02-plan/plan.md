# Plan

## Goal

Turn the brief into a working alerting app in about 24 hours, with the process documented as it happens. Scope and rules: [assumptions](assumptions.md) and the [decision log](../05-decisions/decision-log.md).

## Deliverables

1. **Process record:** brief analysis, plan, assumptions, decision log, AI review log, prompt history, research with raw API responses, design, review findings, screenshots.
2. **Verified data sources:** a per-source checklist and category inventory, each backed by a stored real response.
3. **Design doc:** architecture, event format, data model, source and channel interfaces, API.
4. **Working app** in `app/`. It starts with `npm install && npm run dev`, with no keys and no Docker.
5. **Tests** for the core: dedup, matching, and channel delivery.
6. **Independent code review:** findings, each with the author's decision to fix or not.
7. **README** with run instructions, a demo walkthrough and known limitations.

## Priorities

Set by what the task evaluates and what the brief literally asks for, not by effort ([D-020](../05-decisions/decision-log.md#d-020-priorities-follow-the-task-not-effort)).

**Must have (never cut)**
- **Process:** docs, logs, prompt history and milestone commits. This is what the task evaluates.
- **"Users set up alerts":** users subscribe to categories (D-013), using the user picker (D-015).
- **"Email and Slack":**
  - Email works through the dev outbox (D-010).
  - Slack works through a "Connect Slack" OAuth button, with a paste-webhook option next to it for when no Slack app is configured, as on a reviewer's machine ([D-021](../05-decisions/decision-log.md#d-021-connect-slack-button-is-a-must-have)). Only `hooks.slack.com` webhooks are accepted ([D-022](../05-decisions/decision-log.md#d-022-pasted-webhooks-only-to-hooksslackcom)).
- **"Easy to add channels":** one module per channel (D-001). A tiny stub channel that only logs the message proves the claim ([D-019](../05-decisions/decision-log.md#d-019-build-a-stub-log-channel)).
- **"Admin view":** shows everything, including failed deliveries, and can inject demo events through the full pipeline (D-006, D-017).
- **Deduplication** of events and notifications (D-005). Without it the app doesn't work properly.
- **No keys needed to start** (D-009). Without it reviewers can't run the app.

**Should have**
- Live updates without a refresh (D-004)
- Source freshness in the admin view (D-014)
- More than one source

**Cut first if time runs out** (in this order)
1. Push ingestion (D-003)
2. UI polish
3. Markets (D-016)

SMTP is not on any of these lists. Email is covered by the dev outbox; SMTP is an optional extra.

## Order and why

1. **Data sources before design.** They are the biggest unknown. The categories users can pick (D-013), whether markets survive (D-016), how much each source sends (D-018) and whether push exists (D-017) all depend on real responses. Designing first would mean designing around guesses.
2. **Design before code.** The event format and the source and channel interfaces are the core that must not change when sources or channels are added (D-001).
3. **Must-haves as a thin vertical slice first.** One source runs end to end to the outbox, Slack and stub channels, with both views working. Should-haves come next, and cut-first items only after that.
4. **Independent review before submission.** A separate agent, with fresh context and not the one that wrote the code, reviews the whole repo. The author decides what gets fixed.

## In scope / out of scope (24 h)

- **In:** everything decided in the decision log except superseded entries (D-002), prioritised as above.
- **Out:** the "Later" list in [assumptions](assumptions.md#later-out-of-scope-for-the-24-hour-build).

## Milestones

Each milestone ends with a commit, and each one's checks are logged in the [AI review log](../06-ai-review/ai-review-log.md).

| # | Milestone | Done when |
| --- | --- | --- |
| M1 | Repo and process setup | Folder structure, log templates and the verbatim brief are committed. **Done** |
| M2 | Brief analysis and decisions | AI analysis committed before the author's decisions. Decisions logged. Q1–Q4 settled. **Done** |
| M3 | Data source verification | Every candidate source was checked with a real call and its response is stored in `raw-responses/`. The checklist and category inventory are filled in. Volume per category is measured. Markets are kept or dropped under D-016. Final sources are chosen. Q5 (Slack OAuth localhost redirect) is answered from Slack's docs, with a workaround noted if needed (D-021) |
| M4 | Design | [design.md](../04-design/design.md) covers the architecture, event format, data model, source and channel interfaces, API and live updates. The author has reviewed it, and the decisions are logged |
| M5 | App skeleton | A fresh clone runs with `npm install && npm run dev` and starts the API, worker and web UI. SQLite works (Q6 resolved). Demo users are seeded and the user picker works |
| M6 | Ingestion | Real events from at least one source are normalised and stored. Running the fetch again creates no duplicates. *(Should have:)* more than one source, and the last successful fetch recorded per source. *(Cut first:)* push, only where M3 verified it |
| M7 | Matching and delivery | An injected demo event goes through the full pipeline. It is delivered exactly once to each subscribed channel: the email outbox, a Slack webhook and the stub log channel. Slack tests use a local mock receiver ([D-023](../05-decisions/decision-log.md#d-023-slack-delivery-tested-with-a-mock-receiver-then-once-for-real)). The stub channel is one module, with no core changes. Failed deliveries are recorded. Core tests pass |
| M8 | User and admin views | Users can pick categories and channels, and connect Slack with the "Connect Slack" button (Q5 checked) or by pasting a `hooks.slack.com` webhook. The author has tested both Slack paths once in a real free workspace, with a screenshot (D-023). The admin view shows users, events, deliveries including failures and the outbox, and can inject demo events. *(Should have:)* both views update live, and the admin view shows source freshness. *(Cut first:)* UI polish |
| M9 | Independent code review | A separate review agent with fresh context has reviewed the whole repo, code and docs. Each finding is logged in the AI review log with the author's decision (fix / won't fix / not valid). The chosen fixes are made and committed |
| M10 | Submission | The README has run instructions, a demo walkthrough, known limitations and the warning that the app is a local demo. Screenshots are taken. All logs are complete. A clean-clone run has been verified |
