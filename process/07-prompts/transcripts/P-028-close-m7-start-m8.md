# P-028: Close M7, start M8

Prompt exactly as sent.

---

fix the demo mismatch, one real stored item per GDACS type. keep R-023 to R-026. real smtp stays unverified, say so in the readme. the real slack test happens in M8 together with the connect button, I'll make a workspace then. stub channel evidence is fine.
y, close M7 and commit without asking again.

then M8 — views. user: live feed, pick categories + channels, connect slack button (disabled with a note if no slack app is configured) + paste webhook next to it. admin: users, events, deliveries incl. failures, outbox, feed freshness, inject demo event, masked webhooks. both live over SSE, no refresh. build the oauth code from the stored slack docs, then stop and tell me what I need to set up in slack for the real test.
list assumptions first. after: run tests + app, paste real output, tell me what's mocked or not working
