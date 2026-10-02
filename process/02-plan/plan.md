# Plan

## Goal

Turn the brief into a working alerting app in about 24 hours, with the process documented as it happens. Scope and rules: [assumptions](assumptions.md) and the [decision log](../05-decisions/decision-log.md).

## Deliverables

1. **Process record:** brief analysis, plan, assumptions, decision log, AI review log, prompt history, research with raw API responses, design, screenshots.
2. **Verified data sources:** a per-source checklist and category inventory, each backed by a stored real response.
3. **Design doc:** architecture, event format, data model, source and channel interfaces, API.
4. **Working app** in `app/`. It starts with `npm install && npm run dev`, with no keys and no Docker, and has:
   - ingestion with deduplication
   - category subscriptions
   - Email and Slack delivery
   - a live user view and a live admin view
5. **Tests** for the core: dedup, matching, and channel delivery.
6. **README** with run instructions, a demo walkthrough and known limitations.

## Order and why

1. **Data sources before design.** They are the biggest unknown. The categories users can pick (D-013), whether markets survive (D-016), how much each source sends (D-018) and whether push exists (D-017) all depend on real responses. Designing first would mean designing around guesses.
2. **Design before code.** The event format and the source and channel interfaces are the core that must not change when sources or channels are added (D-001).
3. **Thin vertical slice before breadth.** First one source runs through to one channel, end to end. Then more sources, channels and UI.
4. **Optional paths last.** Slack OAuth, push ingestion and SMTP are built after their zero-config fallbacks work.

If time runs short, cut in this order: Slack OAuth, push ingestion, UI polish. Never cut dedup, the delivery log or the process docs.

## In scope / out of scope (24 h)

- **In:** everything decided in D-001 to D-018.
- **Out:** the "Later" list in [assumptions](assumptions.md#later-out-of-scope-for-the-24-hour-build).

## Milestones

Each milestone ends with a commit, and each one's checks are logged in the [AI review log](../06-ai-review/ai-review-log.md).

| # | Milestone | Done when |
| --- | --- | --- |
| M1 | Repo and process setup | Folder structure, log templates and the verbatim brief are committed. **Done** |
| M2 | Brief analysis and decisions | AI analysis committed before the author's decisions. D-001 to D-018 logged. Q1–Q4 settled. **Done** |
| M3 | Data source verification | Every candidate source was checked with a real call and its response is stored in `raw-responses/`. The checklist and category inventory are filled in. Volume per category is measured. Markets are kept or dropped under D-016. Final sources are chosen |
| M4 | Design | [design.md](../04-design/design.md) covers the architecture, event format, data model, source and channel interfaces, API and live updates. The author has reviewed it, and the decisions are logged |
| M5 | App skeleton | A fresh clone runs with `npm install && npm run dev` and starts the API, worker and web UI. SQLite works (Q6 resolved). Demo users are seeded and the user picker works |
| M6 | Ingestion | Real events from every chosen source are normalised and stored. Running the fetch again creates no duplicates. The last successful fetch is recorded per source. Push is used only where M3 verified it |
| M7 | Matching and delivery | An injected demo event goes through the full pipeline and is delivered exactly once to each subscribed channel. Email goes to the dev outbox (or SMTP if configured) and Slack goes to a webhook. Failed deliveries are recorded. A third channel would need only one new module. Core tests pass |
| M8 | User and admin views | Users can pick categories and channels, and connect Slack by webhook or OAuth (Q5 checked). The admin view shows users, events, deliveries including failures, the outbox and source freshness, and can inject demo events. Both views update without a refresh |
| M9 | Submission | The README has run instructions, a demo walkthrough, known limitations and the warning that the app is a local demo. Screenshots are taken. All logs are complete. A clean-clone run has been verified |
