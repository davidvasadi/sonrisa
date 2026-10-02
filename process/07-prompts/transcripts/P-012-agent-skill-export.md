# P-012: Code-reviewer agent, /milestone-done skill, transcript export

Prompt exactly as sent.

---

n, it doesn't exist yet, let's make it now. keep the process logging section. create:
1. a code-reviewer subagent, read only, critical — bugs, made up APIs, fake tests, security, drift from decisions. file:line + how it breaks. no praise
2. a /milestone-done skill: run tests + app, check docs are updated, draft ai-review-log entries for me to approve, log my prompts the way we already do, propose commit msg, commit only if I say yes
3. process/scripts/export-transcripts.mjs — export this project's full claude code sessions from ~/.claude/projects to process/07-prompts/transcripts/sessions as markdown. my prompts + your replies, no thinking, no tool output, no system-reminder stuff. test it and show me nothing leaked
commit
