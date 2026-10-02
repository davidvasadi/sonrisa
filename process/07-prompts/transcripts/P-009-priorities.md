# P-009: Priorities and review milestone

Prompt exactly as sent.

---

set the priorities based on the task itself, not just effort:
must have (never cut): the process docs/logs/prompts/commits since that's what they evaluate, plus everything the brief literally asks for: users set up alerts (categories), email + slack delivery (webhook is enough), channels easy to add (with the tiny stub channel that just logs the message), admin view. also dedup and starting with no keys, otherwise it doesn't work or they can't run it.
should have: live updates without refresh, source freshness in admin, more than one source.
cut first if time runs out: slack oauth button, push ingestion, ui polish, markets.
also add an independent code review milestone before submission: the code-reviewer agent goes through the whole repo, I decide what gets fixed. so M9 review, M10 submission. put all this in the plan, commit
