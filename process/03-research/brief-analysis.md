# Brief Analysis

> **Status: AI first pass, not yet reviewed.** Claude wrote this from the brief alone ([01-brief/brief.md](../01-brief/brief.md)). That was before the author shared any of their own decisions, and before any stack choice or data-source research. The assumptions below are the AI's defaults. The author's decisions go in the [decision log](../05-decisions/decision-log.md), and anything here they reject or change goes in the [AI review log](../06-ai-review/ai-review-log.md).

## What the brief says

The PM's brief, taken one clause at a time:

| # | Clause | What it explicitly asks for |
| --- | --- | --- |
| 1 | "users to be able to set up alerts" | Users create and own alert definitions themselves |
| 2 | "notified when something important happens in the world" | A trigger based on external, real-world events |
| 3 | "like breaking news, market movements, natural disasters, that kind of thing" | Three example categories. "That kind of thing" means the list is open-ended |
| 4 | "Should work for both email and Slack" | Two delivery channels at launch |
| 5 | "flexible enough that we can add more channels later" | A channel abstraction. Adding a channel must not mean rewriting the core |
| 6 | "We need an admin view too" | A second role and a second UI with unspecified capabilities |

The task text also says there is no agreement on three points: what "something important" means, where the data comes from, and how events are detected. So these are the core of the problem, not details to fill in later.

## Ambiguities

Each item lists the open question and the default the AI would assume if nobody decided otherwise.

### A1. What counts as "important", and who decides?
- **Open:** Is importance a global system judgement ("this earthquake matters"), a per-user one ("this matters *to me*"), or both? Is it objective (a magnitude or a % move) or editorial (a newsroom's "breaking" label)?
- **Would assume:** Both layers. Each category has a system-level floor so that junk never enters (e.g. earthquakes below M4.5 are dropped). Each user's alert then narrows further with filters (region, ticker, keyword, severity). Importance comes from **measurable signals the source provides**, not from AI or ML scoring.

### A2. How are events detected?
- **Open:** Do we detect events ourselves (clustering news, computing price moves) or consume feeds that already describe discrete events? Push (webhooks or streams) or pull (polling)?
- **Would assume:** We consume sources that already emit discrete, structured events, and poll them on a schedule. We do not build event detection from raw signals.

### A3. "Breaking news" is the least well-defined category
- **Open:** What makes news "breaking"? A source flag, many outlets covering the same story, or any new article matching a keyword?
- **Would assume:** A new article from a news feed that matches the user's keywords or topic. We would not claim to detect "breaking" in any deeper sense. This category is the most likely to be noisy, and that should be stated openly.

### A4. "Market movements": which markets, and moving relative to what?
- **Open:** Stocks, indices, crypto, FX, commodities? A % change over a day, an hour, or since the last alert? Real-time or delayed data?
- **Would assume:** The user picks an instrument (ticker or symbol) and a % threshold over a fixed window (e.g. a daily change). Delayed or free-tier data is acceptable for this exercise, and the UI says so.

### A5. "Natural disasters": which types, and relevant where?
- **Open:** Earthquakes, cyclones, floods, wildfires, volcanoes? Do users care about the whole world or a region?
- **Would assume:** Start with the types the chosen sources cover with structured severity fields. Users can filter by region or country and by minimum severity.

### A6. Who are the "users"?
- **Open:** Consumer app or B2B? Individuals or teams? The mention of Slack suggests a workplace product, which in turn suggests alerts may target a shared team channel rather than one person.
- **Would assume:** Individual users in one organisation (single-tenant). An alert belongs to one user, but its Slack destination can be a shared channel.

### A7. What does an alert look like?
- **Open:** A structured rule (category + filters), free text ("tell me about anything affecting Tokyo"), or both? One channel per alert, or several?
- **Would assume:** A structured rule: category, category-specific filters, one or more destinations, and an on/off switch. No natural-language rules.

### A8. Timing: real-time or digest?
- **Open:** "Breaking" implies minutes. Users may still want a digest for low-urgency categories.
- **Would assume:** Notifications go out immediately, as soon as the next poll finds a match, with latency in minutes. Digests are out of scope but the design shouldn't rule them out.

### A9. How exactly do Email and Slack work?
- **Open:** Slack via an incoming webhook, a full Slack app with OAuth, DMs, or channels? Email through which provider, from which sender, and with verified recipient addresses?
- **Would assume:** Slack uses an incoming-webhook URL that the user supplies for each destination. Email goes out through a standard provider. In development, mail goes to a local capture inbox so nothing is sent for real.

### A10. How flexible is "flexible"?
- **Open:** Should adding a channel be a code change (a new adapter) or runtime configuration (an admin adds one with no deploy)?
- **Would assume:** A code-level adapter interface. A new channel means one new adapter plus its config schema, with no changes to matching or scheduling. Runtime-pluggable channels would be over-engineering for this brief.

### A11. What does the admin view do?
- **Open:** Who is an admin? Read-only monitoring, or the power to act (disable users or alerts, tune thresholds, pause sources, resend)?
- **Would assume:** An operational console showing users, alerts, ingested events, and deliveries with their status and errors. Admins can disable an alert or a user and pause a source. They cannot edit a user's alerts on the user's behalf.

### A12. Is authentication in scope?
- **Open:** Real sign-up, SSO, password reset?
- **Would assume:** Minimal auth with two roles (user, admin), and seeded accounts are fine. Production-grade auth is out of scope and should be stated as such.

## What the brief does not say, but a real system needs

These are not ambiguities but gaps. Without them the feature fails in production, even if nobody asked for them.

1. **A common event model.** Each source has its own shape. Matching needs a single normalised event (category, title, time, location, severity or magnitude, source, link, external ID).
2. **Deduplication and idempotency.** Polling sees the same event repeatedly, and several sources may report the same event. A user must never get the same alert twice. This needs a unique key per (alert, event) delivery.
3. **Event updates.** Earthquake magnitudes get revised and news gets corrected. Should an update re-notify? The default is no, unless the update newly crosses the user's threshold.
4. **Noise control.** Per-user rate limits and cooldowns. Hysteresis for markets, so a price oscillating around the threshold doesn't fire every poll.
5. **Delivery reliability.** Retries with backoff, a final "failed" state, and a delivery log the admin view can show. Slack webhooks get revoked and mail bounces.
6. **Source health monitoring.** If a source silently stops returning data, users simply get no alerts, and that looks the same as "nothing happened". This is the worst failure mode for an alerting product, so source staleness must be visible in the admin view.
7. **Consent and unsubscribe.** Email needs an unsubscribe link and sender identity. Ideally the destination is verified before the first send, so the system can't be used to spam arbitrary addresses or channels.
8. **Secrets handling.** Slack webhook URLs are credentials. They must not be shown in full in the UI or written to logs.
9. **Source terms and limits.** Free API tiers have rate limits, and some forbid commercial or production use. Market data in particular is often licensed.
10. **Testability without live events.** Nobody can wait for an earthquake to test the pipeline. Recorded real responses (stored in [raw-responses/](raw-responses/)) should be replayable through the pipeline.
11. **Message formatting per channel.** The same event needs an HTML or text email and a Slack-formatted message.
12. **Admin audit trail.** Record who disabled what, and when.
13. **Time zones and quiet hours.** Nice to have. Worth a note, not an implementation.

## Biggest risks

Ranked by how badly each could sink the result.

| # | Risk | Why it matters | Mitigation |
| --- | --- | --- | --- |
| 1 | **"Important" stays undefined** | If it's too loose, users get spam and mute the product. If it's too strict, they miss the one alert that mattered. This is the central product question, and the brief leaves it open on purpose | Use objective, source-provided measures per category (A1). Show users which recent events their rule *would* have matched before they save it |
| 2 | **Unreliable or unusable data sources** | Free news and market APIs are rate-limited, delayed, or licensed for development only. AI tools also confidently invent endpoints and response fields | Verify every source against a real recorded response before writing code against it. Store the responses in [raw-responses/](raw-responses/). Never trust a field name the AI "remembers" |
| 3 | **Scope exceeds 24 hours** | Three categories, two channels, user UI and admin UI is a lot. The likely failure is everything half-working | Build one thin end-to-end slice first: one source, one channel, the minimal UI. Then widen. Cut categories before cutting reliability |
| 4 | **Silent failure** | An alerting system that quietly stops alerting is worse than none, especially for disasters | Monitor source staleness and keep a delivery log, both visible in the admin view |
| 5 | **Duplicate or flapping notifications** | Polling plus multiple sources plus revisions together produce repeats | Idempotency key per (alert, event), and hysteresis for markets |
| 6 | **Wrong level of abstraction for channels** | Too little and Slack ends up hard-coded. Too much and we build a plugin framework for two channels | One small adapter interface, with an exercise to show that a third channel needs no change to the core (e.g. a stub webhook or console channel) |
| 7 | **Implied safety claims** | Disaster alerts could be read as an emergency warning service | State plainly that this is informational and not a public warning system |
| 8 | **Security basics skipped** | Webhook URLs are secrets, the admin view must not be reachable by users, and anyone could be targeted with email | Role checks, masked secrets, destination verification (or at least a clearly stated gap) |

## Questions I would ask the PM

If a real PM were available, these would be asked before building. Here they get answered by assumption, and each answer gets logged as a decision.

1. Who is the user: consumers, or employees of a customer organisation?
2. For each category, what is one concrete example of an event that **must** trigger an alert, and one that **must not**?
3. Is a delay of a few minutes acceptable? Is delayed market data acceptable?
4. Should users get Slack in their own DMs or in shared channels?
5. Is the admin's job monitoring, support, or content curation?
6. Is there budget for paid data sources, or must they be free?
7. Which channel is "next": SMS, push, Teams, webhooks? This decides what the abstraction has to accommodate.

## Proposed interpretation (pending author's decision)

A single-organisation alerting service. It polls a small number of public sources that already emit structured events. It normalises them into one event model, and drops anything below a per-category importance floor. It matches each event against users' structured alert rules, and delivers matches once, through pluggable channel adapters (Email and Slack, plus one stub to prove the abstraction). Every delivery and source health check is recorded. An admin console exposes users, alerts, events, deliveries and source health, and offers a few control actions.

The author confirms or overrides this in the decision log.
