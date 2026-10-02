# CLAUDE.md

Rules for working in this repository.

## The main task

The main task is [process/01-brief/brief.md](process/01-brief/brief.md). Everything in this repo serves it, especially "A Note on What We're Evaluating": the process (decisions, checks, what was rejected or corrected) matters more than the code.

## Verification

- **Never invent APIs or fields.** Call the API first and save the raw response to [process/03-research/raw-responses/](process/03-research/raw-responses/). Only then write code or docs against it.
- **Say "unverified"** whenever you are not sure. List your assumptions up front, before the answer.
- **Don't say it works unless you ran it.** Report what you ran and what came out. If something was not run or tested, say so.

## Decisions

- **Don't override the author's decisions.** If you disagree, say so and explain why, then follow the decision. Decisions are in [process/05-decisions/decision-log.md](process/05-decisions/decision-log.md).

## Running and secrets

- **The app must start with no keys:** `npm install && npm run dev`, with no Docker. Anything that needs credentials (SMTP, Slack OAuth) is optional and has a fallback.
- **No secrets in git.** No keys, tokens, webhook URLs or `.env` files in commits. Mask webhook URLs in the UI, API responses and logs.

## Code

- **Small steps.** One focused change at a time.
- **Write tests for matching, dedup and dispatch.**
- **A new channel is one module.** Adding a channel must not require changes to the core.

## Process logging

These are the conventions used so far:
- Every prompt goes in [process/07-prompts/session-log.md](process/07-prompts/session-log.md), with a transcript in `transcripts/` saved exactly as sent, never abbreviated (see R-001).
- Decisions go in the decision log.
- AI output that was checked, corrected or rejected goes in [process/06-ai-review/ai-review-log.md](process/06-ai-review/ai-review-log.md).

## After a task

Ask: **"Run /milestone-done now? (y/n)"**. Do not run it without a "y".
