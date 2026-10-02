# P-005: Author decisions

Prompt exactly as sent.

---

ok here's what I decided. compare with your analysis, tell me where you disagree, then put it into assumptions + decision log:

- channels = delivery (email, slack), not categories. has to be easy to add new ones later (sms, teams etc), so a new channel should just be one new module, no changes in the core
- user picks which topics they want news about: breaking news, economy/markets, natural disasters. on/off per topic + pick channels
- push where the source supports it, polling where not. UI live, no refresh
- dedup events + notifications
- user view + admin view, no auth. admin sees everything incl. failed deliveries, can inject demo event
- slack: "connect slack" oauth button if app is configured, otherwise paste webhook. optional. mask webhooks
- free sources only, keyless if possible, verify each with a real call first
- runs with npm install && npm run dev, no keys, no docker
- email: SMTP if configured, otherwise dev outbox visible in admin
- react + vite + shadcn, node + ts, sqlite. not next.js (long running worker + realtime)

the other extras from your analysis are out of scope for 24h, put them under later.
