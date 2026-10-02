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

The implementation: `app/server` (Node + TypeScript, Express, SQLite) and `app/web` (React + Vite + shadcn/ui).

### Run it

Requires **Node 22.12 or newer** ([D-032](process/05-decisions/decision-log.md#d-032-node-22-lts)). With nvm, `nvm use` picks it up from [.nvmrc](.nvmrc). On an older Node, `npm install` stops with `EBADENGINE` ([.npmrc](.npmrc) sets `engine-strict`), and the server refuses to start with a message saying which version it needs ([D-034](process/05-decisions/decision-log.md#d-034-enforce-node-22-at-install-and-start)).

```sh
npm install
npm run dev        # API + worker on :3001, web on http://localhost:5173
npm test
```

`npm install` may also need Python 3 and `make`: npm runs a `node-gyp` step for `better-sqlite3`. It compiles nothing, because a prebuilt binary is bundled, but node-gyp itself needs those tools ([R-016](process/06-ai-review/ai-review-log.md#r-016-better-sqlite3-13-still-runs-node-gyp)). macOS gets them with the Xcode Command Line Tools.

No keys, no Docker, no `.env` needed (D-009). Only a repo-root `.env` is supported (not `.env.local` or `.env.development`: the web dev server would read those, the API would not). Everything in [.env.example](.env.example) is optional: SMTP and the Slack app switch on when set. The SQLite database is created at `app/server/data/sonrisa.db` (git-ignored); delete it to start fresh.

### Connect Slack (optional)

Without a Slack app, the Connect Slack button is shown disabled with a note, and you paste a `https://hooks.slack.com/...` webhook URL next to it (D-021). Only `hooks.slack.com` is accepted (D-022).

To try the button, Slack requires an **HTTPS** redirect URL (Q5), so run the dev server with a self-signed certificate:

```sh
HTTPS=1 npm run dev   # https://localhost:5173 (accept the browser's certificate warning once)
```

and set in `.env`: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI=https://localhost:5173/api/slack/oauth/callback`. Slack accepts this `https://localhost` redirect URL: verified in the author's real test (D-023), [screenshot](process/08-screenshots/m8-slack-real-message.png). Still untested: cancelling on Slack's approval page.

In the Slack app: activate Incoming Webhooks, and add the redirect URL above under OAuth & Permissions. Keys go in `.env` only, never in `.env.example`.

The admin layout and UI components come from [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) (MIT); see [app/web/THIRD-PARTY-NOTICES.md](app/web/THIRD-PARTY-NOTICES.md).

> **Local demo only.** There is no authentication: the user view uses a simple user picker, and the admin view is open to anyone who can reach the app, including all users' data and failed deliveries. Do not expose it on a network. See [D-006](process/05-decisions/decision-log.md#d-006-two-views-no-authentication).

> **Not an emergency warning service.** Disaster and other alerts are informational only. They depend on free third-party sources and can be late, incomplete or missing. For warnings that affect your safety, follow your official local authorities.

## Known gaps (decided)

- **Pasted Slack webhooks are tested only with a mock.** The real Slack test used Connect Slack (OAuth). The paste path shares its delivery code but was not tried against a real workspace ([D-023](process/05-decisions/decision-log.md#d-023-slack-delivery-tested-with-a-mock-receiver-then-once-for-real)).
- **Real SMTP is unverified.** Email over SMTP is built from nodemailer's documentation and tested only with a fake transport; it has never sent through a real mail server. Without SMTP settings, email goes to the dev outbox in the admin view, which is the tested path.

- **No price alerts.** "Market movements" are covered by the BBC Business news section, not by price feeds or % thresholds. Keyless price APIs exist, but they publish prices, not events ([D-024](process/05-decisions/decision-log.md#d-024-market-movements-via-bbc-business-no-price-feeds)).
- **No GovSlack.** Pasted webhooks are accepted only on `hooks.slack.com`; GovSlack uses `slack-gov.com` ([D-022](process/05-decisions/decision-log.md#d-022-pasted-webhooks-only-to-hooksslackcom), [D-026](process/05-decisions/decision-log.md#d-026-govslack-not-supported)).
