# P-011: CLAUDE.md rules

Prompt exactly as sent.

---

before M3 let's set up the rules. write a CLAUDE.md with the rules for this repo:
- never invent APIs/fields — call it first, save response to process/03-research/raw-responses
- say "unverified" if not sure, list assumptions up front
- don't say it works unless you ran it
- must start with no keys
- no secrets in git
- small steps, tests for matching/dedup/dispatch
- new channel = one module
- don't override my decisions, tell me if you disagree
- the main task is process/01-brief/brief.md — everything serves it, especially "What We're Evaluating"
- after a task ask "Run /milestone-done now? (y/n)", don't run it without yes
commit, together with P-010
