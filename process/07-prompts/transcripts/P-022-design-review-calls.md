# P-022: Design review calls

Prompt exactly as sent.

---

first check each finding yourself against the doc and the stored responses, tell me if any is wrong. number them F1-F15 in the order the reviewer gave them.

then:
F1-F8 fix. for F7 just make the doc honest: a channel can own its own table and admin panel, don't build a plugin system for it.
F9 won't fix: no retries, so just store the error text, drop the retryable flag.
F10-F15 fix, keep it simple. for F12 the demo events come from small fixtures in app/, not from raw-responses. for F15 remove that test row, the evidence is the commit diff.
suspicions: admin shows users, yes add it. slack denial: handle it simply, check it during the real test. GDACS datemodified: mark it unverified.
log all calls in the ai review log, then commit the design
