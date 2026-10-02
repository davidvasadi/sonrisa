---
name: milestone-done
description: Close a milestone. Runs tests and the app, checks process docs are up to date, exports and logs prompts, drafts AI review entries for approval, and proposes a commit. Commits only after an explicit yes.
disable-model-invocation: true
---

# /milestone-done

Close the current milestone from `process/02-plan/plan.md`. Follow the rules in `CLAUDE.md`. Report only what you actually ran.

Work through the steps in order. Do not write review entries or commit until the author approves them in step 7.

## 1. Identify the milestone

Name the milestone (M1–M10) being closed, using the plan and the work since the last commit (`git log`, `git status`, `git diff --stat`). If it's unclear, ask.

## 2. Run tests

- If `app/package.json` exists, run the test script (`npm test` in `app/`). Report the command, the pass/fail counts and any failures, verbatim.
- If there is no app or no tests yet, say "skipped: <reason>". Never say tests pass without running them.

## 3. Run the app

- If the app exists, start it with `npm run dev`, wait until it is up, check that it responds (e.g. `curl` the API and the web UI), then stop it. Report what you ran and what came back.
- Check that it starts with **no keys** (D-009): no `.env` needed.
- If there is no app yet, say "skipped: <reason>".

## 4. Export transcripts

Run `node process/scripts/export-transcripts.mjs`, then `node process/scripts/export-transcripts.mjs --check`. Report the check's output. If the check fails, stop and show the failure.

## 5. Log prompts

Follow the existing convention in `process/07-prompts/session-log.md`:
- Find the last `P-NNN` in the session log.
- For every author prompt since then, in order:
  - create `process/07-prompts/transcripts/P-NNN-<slug>.md`, with the prompt **exactly as sent**, never abbreviated (R-001);
  - add a session-log entry using the template (date, tool/model, goal, link to the transcript, result summary, follow-up).
- Take the prompt text from the exported session in `transcripts/sessions/`, not from memory.

## 6. Check docs

Check each item and report it as up to date, needs update (what exactly), or not applicable:
- `plan.md`: is the milestone's status and its "done when" actually met? List any criterion that isn't met.
- `decision-log.md`: is there an entry for every decision made in this milestone? Are superseded entries marked?
- `assumptions.md`: are the open questions and the Later list current?
- Research and design docs touched by this milestone.
- `README.md`: are the run instructions and limitations still true?

Propose the edits. Don't make large edits without asking.

## 7. Draft AI review entries

From this milestone's work, draft `R-NNN` entries in the format of `process/06-ai-review/ai-review-log.md`. Cover the AI output the author checked, corrected or rejected, and any check that caught a problem. Draft only from what actually happened in the session. Don't invent checks.

Show the drafts and ask which to keep, edit or drop. Write only the approved ones.

## 8. Propose the commit

- Run a secrets check on what will be committed. Look for `.env` files, tokens, `hooks.slack.com/services/` URLs, passwords and API keys. Report the result.
- Show `git status` and propose a commit message: a meaningful subject that names the milestone, a short body, and the attribution line.
- Ask: **"Commit with this message? (y/n)"**. Commit only on "y". On anything else, don't commit.
