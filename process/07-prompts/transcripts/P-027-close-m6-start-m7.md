# P-027: Close M6, start M7

Prompt exactly as sent.

---

y. keep R-020 to R-022 as you described them, commit without asking again.

then M7 — matching + delivery. category subscriptions → channel registry → email (dev outbox, smtp if configured) + slack webhook + the tiny stub log channel. one delivery per event+user+channel, no retries, failures stored with the error. injected demo event goes through the whole pipeline. slack tests use the mock receiver. fix the channels path in the design. tests: match/no match, same event twice = one delivery, one failing channel doesn't block the others, look-alike slack host rejected.
list assumptions first. after: run tests + app, paste real output, tell me what's mocked or not working
