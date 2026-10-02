# P-026: Close M5, build M6 ingestion

Prompt exactly as sent.

---

keep R-016 to R-019, add the python/make line to the readme, y commit.

then M6 — ingestion. source interface + common event format from the design. start with one source end to end, based on the saved real response, then the rest. dedup, first poll baseline, last successful fetch per feed. tests use the real responses as fixtures.
list assumptions first. after: run tests + app, paste real output, tell me what's mocked or not working
