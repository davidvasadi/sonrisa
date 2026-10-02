# Sonrisa

Response to a take-home task: turn a vague product brief ("users set up alerts for important world events, via email and Slack, extensible channels, admin view") into a working implementation using AI agents.

The task states that the **process is evaluated, not the solution**. The repository is split accordingly.

## [process/](process/) — how I worked

Plans, research, design, decisions, AI review and prompt history. Start here.

1. [Brief](process/01-brief/brief.md) — the task as received
2. [Plan](process/02-plan/plan.md) and [assumptions](process/02-plan/assumptions.md)
3. [Research](process/03-research/) — [brief analysis](process/03-research/brief-analysis.md), [data sources](process/03-research/data-sources.md), [raw API responses](process/03-research/raw-responses/)
4. [Design](process/04-design/design.md)
5. [Decision log](process/05-decisions/decision-log.md)
6. [AI review log](process/06-ai-review/ai-review-log.md) — what was checked, rejected or corrected
7. [Prompts](process/07-prompts/session-log.md) — session log, [transcripts](process/07-prompts/transcripts/), [drafts](process/07-prompts/drafts/)
8. [Screenshots](process/08-screenshots/)

Also: [notes](process/notes/) and [scripts](process/scripts/). Rules given to the AI for this repo: [CLAUDE.md](CLAUDE.md).

## [app/](app/) — the system

The implementation. Empty for now; setup and run instructions will go here once it exists.

> **Local demo only.** There is no authentication: the user view uses a simple user picker, and the admin view is open to anyone who can reach the app, including all users' data and failed deliveries. Do not expose it on a network. See [D-006](process/05-decisions/decision-log.md#d-006-two-views-no-authentication).
