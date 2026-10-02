# P-020: Remove Slack example token, write the M4 design

Prompt exactly as sent.

---

fix the slack example token now while it's only in the last unpushed commit: cut it out of the saved html, note the edit in the .meta.txt, amend the commit. check no other commit has it.

then M4: write process/04-design/design.md based on the verified sources. architecture (mermaid), data model with dedup constraints, common event format + mapping per source using real field names, how the categories from the sources become the list the user picks from, channel interface (what would adding discord take) incl. the stub channel, connect slack button + webhook fallback, retries, sse vs websocket, security (webhook masking, hooks.slack.com only). keep it simple, flag overkill. don't commit the design yet, I want to review it first
