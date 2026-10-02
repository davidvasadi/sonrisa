# Assumptions

Two kinds of entry:
- **Decided** — the author's decisions. Each links to its entry in the [decision log](../05-decisions/decision-log.md).
- **Working assumption** — a default the author has not overridden, mostly carried over from the [brief analysis](../03-research/brief-analysis.md). Valid until a decision replaces it.

## Users

- **Decided ([D-006](../05-decisions/decision-log.md#d-006-two-views-no-authentication)):** Two views, user and admin. No authentication.
- **Decided ([D-015](../05-decisions/decision-log.md#d-015-simple-user-picker)):** A simple user picker over seeded demo users identifies the "current user".
- **Working assumption:** One organisation (single-tenant), English-language content only.

## Events and "something important"

- **Decided ([D-013](../05-decisions/decision-log.md#d-013-categories-come-from-the-sources-not-a-fixed-list), supersedes D-002):** There is no fixed list of topics. The selectable categories are the ones the chosen sources actually offer. The user subscribes to any combination of them. The list comes out of research and is not invented.
- **Working assumption:** The brief's examples (breaking news, market movements, natural disasters) guide which sources to look for. They are not the category list.
- **Consequence:** Users choose *what kind* of event they want, but "important" still needs a system-level floor per source (e.g. a minimum severity). That floor depends on the fields each source really has. *(Open, see Q1.)*
- **Working assumption:** We consume sources that already emit discrete, structured events. We do not build event detection from raw signals (e.g. clustering news articles).
- **Decided ([D-017](../05-decisions/decision-log.md#d-017-accepted-ai-recommendations)):** Every source is normalised into one common event format (source, category, title, time, location, severity, link, external ID). Deduplication and matching depend on it, so it is core scope.
- **Decided ([D-005](../05-decisions/decision-log.md#d-005-deduplicate-events-and-notifications)):** Events are deduplicated, and notifications are deduplicated separately.

## Data sources

- **Decided ([D-008](../05-decisions/decision-log.md#d-008-free-sources-keyless-where-possible-verified-by-a-real-call)):** Free sources only, keyless where possible. Each source is verified with a real call before any code is written against it. Raw responses are stored in [03-research/raw-responses/](../03-research/raw-responses/).
- **Decided ([D-013](../05-decisions/decision-log.md#d-013-categories-come-from-the-sources-not-a-fixed-list)):** Research records the categories each source actually offers.
- **Decided ([D-016](../05-decisions/decision-log.md#d-016-drop-markets-if-they-need-a-key-or-registration)):** If market data needs a key or any registration, markets are dropped completely.
- **Decided ([D-003](../05-decisions/decision-log.md#d-003-push-where-supported-polling-otherwise), [D-017](../05-decisions/decision-log.md#d-017-accepted-ai-recommendations)):** Push where the source supports it, polling otherwise. Push is built only for a source verified to offer it.
- **Decided ([D-014](../05-decisions/decision-log.md#d-014-source-freshness-is-in-scope)):** The last successful fetch per source is recorded.
- **Working assumption:** Latency of a few minutes is acceptable.
- **Working assumption:** If markets survive D-016, delayed market data is acceptable and the UI says so.

## Notification channels

- **Decided ([D-001](../05-decisions/decision-log.md#d-001-channels-are-delivery-mechanisms-one-module-per-channel)):** A channel is a delivery mechanism (Email, Slack), not a category. Adding a channel such as SMS or Teams means adding one module, with no change to the core.
- **Decided ([D-013](../05-decisions/decision-log.md#d-013-categories-come-from-the-sources-not-a-fixed-list)):** For each category a user subscribes to, they pick which channels deliver it.
- **Decided ([D-007](../05-decisions/decision-log.md#d-007-slack-oauth-if-configured-webhook-paste-otherwise), [D-017](../05-decisions/decision-log.md#d-017-accepted-ai-recommendations)):** Slack is optional. The user connects it through OAuth when a Slack app is configured, and pastes a webhook URL otherwise. Either way a webhook URL is stored, and both paths share one delivery path. Webhook URLs are always masked.
- **Decided ([D-010](../05-decisions/decision-log.md#d-010-email-via-smtp-if-configured-dev-outbox-otherwise)):** Email goes out over SMTP when SMTP is configured. Otherwise it goes to a dev outbox, which is visible in the admin view.
- **Decided ([D-017](../05-decisions/decision-log.md#d-017-accepted-ai-recommendations)):** Each channel module owns the formatting of its own messages (HTML or text email, Slack blocks). This is core scope.

## Admin view

- **Decided ([D-006](../05-decisions/decision-log.md#d-006-two-views-no-authentication)):** The admin sees everything, including failed deliveries, and can inject a demo event.
- **Decided ([D-017](../05-decisions/decision-log.md#d-017-accepted-ai-recommendations)):** An injected demo event goes through the same pipeline as a real one (normalise, deduplicate, match, deliver). It is not a shortcut that writes notifications directly. Otherwise the demo proves nothing.
- **Decided ([D-014](../05-decisions/decision-log.md#d-014-source-freshness-is-in-scope)):** The admin view shows the last successful fetch per source.
- **Decided ([D-006](../05-decisions/decision-log.md#d-006-two-views-no-authentication)):** The admin view is open to anyone who can reach the app. Local demo only, as the root README states.

## Non-functional

- **Decided ([D-009](../05-decisions/decision-log.md#d-009-zero-config-local-run)):** The app runs with `npm install && npm run dev`, with no keys and no Docker. SMTP and Slack OAuth are optional extras that switch on when configured.
- **Decided ([D-004](../05-decisions/decision-log.md#d-004-live-ui-without-refresh)):** The UI updates live, without a page refresh.
- **Decided ([D-011](../05-decisions/decision-log.md#d-011-stack-react--vite--shadcn-node--typescript-sqlite)):** The stack is React + Vite + shadcn, Node + TypeScript, and SQLite. Not Next.js.

## Open questions

| # | Question | Status |
| --- | --- | --- |
| Q1 | What makes an event "important" enough to deliver, per source? | **Open.** D-013 narrowed it: users now choose categories, but each source still needs a system-level floor. Research answers it, using the severity fields each source really has |
| Q2 | Is there a free, keyless, legitimately usable source of market data? | **Rule set** ([D-016](../05-decisions/decision-log.md#d-016-drop-markets-if-they-need-a-key-or-registration)): if it needs a key or registration, markets are dropped. Research still has to check |
| Q3 | How does the user view know which user it is, without auth? | **Resolved** ([D-015](../05-decisions/decision-log.md#d-015-simple-user-picker)): simple user picker |
| Q4 | Does any chosen free source actually offer push? | **Rule set** ([D-017](../05-decisions/decision-log.md#d-017-accepted-ai-recommendations)): push only where verified. Research checks each source |
| Q5 | Does Slack OAuth accept a `http://localhost` redirect URL? | **Deferred** to the Slack integration. To verify against Slack's docs, not from memory |
| Q6 | Which SQLite driver works with `npm install` alone? | **Deferred** to project setup. Native modules (e.g. `better-sqlite3`) can fail to build; Node's built-in `node:sqlite` depends on the Node version |

## Later (out of scope for the 24-hour build)

Raised in the [brief analysis](../03-research/brief-analysis.md) and deferred by the author ([D-012](../05-decisions/decision-log.md#d-012-defer-remaining-extras-to-later)):

- Per-user filters within a category (region, keyword, minimum severity)
- Re-notifying when an event is revised (e.g. an earthquake's magnitude is updated)
- Per-user rate limits and cooldowns
- Hysteresis for market alerts that oscillate around a threshold (only relevant if markets survive D-016)
- Automatic delivery retries with backoff (failed deliveries are still recorded and visible)
- Alerting on source staleness (showing the last fetch is in scope, D-014)
- Unsubscribe links, consent, and destination verification before the first send
- Audit trail of admin actions
- Time zones and quiet hours
- Digests instead of immediate notifications
- A test harness that replays recorded raw API responses through the pipeline
- Authentication and roles
- A notice that disaster alerts are informational, not an emergency warning service
