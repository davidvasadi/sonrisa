# Session Log

Every prompt given to the AI, in order. Full transcripts are in [transcripts/](transcripts/); prompts drafted before sending are in [drafts/](drafts/).

## Template

```
## P-NNN: <short title>

- Date:
- Tool / model:
- Goal:
- Prompt: (verbatim, or link to draft)
- Result summary:
- Follow-up: review entry R-NNN / decision D-NNN
```

## Entries

## P-001: Repository setup

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Create the repository structure before any planning or building.
- Prompt: Verbatim in [transcripts/P-001-repo-setup.md](transcripts/P-001-repo-setup.md).
- Result summary: Created `process/` (01–08 plus `notes/` and `scripts/`), empty `app/`, root README, .gitignore; initialised git and made the first commit.
- Follow-up: none

## P-002: Fix P-001 transcript

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Restore the full P-001 prompt (the AI had abbreviated it while calling it verbatim), log the catch, rename the README title.
- Prompt: Verbatim in [transcripts/P-002-fix-p001-transcript.md](transcripts/P-002-fix-p001-transcript.md).
- Result summary: P-001 transcript now holds the complete prompt; R-001 logged; README title changed to "Sonrisa".
- Follow-up: [R-001](../06-ai-review/ai-review-log.md#r-001-p-001-transcript-was-not-verbatim)

## P-003: Brief analysis

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Get the AI's independent reading of the brief (ambiguities, default assumptions, missing requirements, risks) before sharing my own decisions, so the two can be compared.
- Prompt: Verbatim in [transcripts/P-003-brief-analysis.md](transcripts/P-003-brief-analysis.md).
- Result summary: [brief-analysis.md](../03-research/brief-analysis.md) written from the brief only: 12 ambiguities with default assumptions, 13 missing requirements, 8 ranked risks, PM questions, and a proposed interpretation marked as pending.
- Follow-up: to be reviewed against my decisions

## P-004: Commit brief analysis

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Commit the AI's unreviewed brief analysis before I share my own decisions, so the git history shows what the AI produced independently.
- Prompt: Verbatim in [transcripts/P-004-commit-analysis.md](transcripts/P-004-commit-analysis.md).
- Result summary: Brief analysis, P-003 and P-004 committed.
- Follow-up: none

## P-005: Author decisions

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Give my product and technical decisions, get the AI's disagreements, and record everything as assumptions and decisions.
- Prompt: Verbatim in [transcripts/P-005-author-decisions.md](transcripts/P-005-author-decisions.md).
- Result summary: [assumptions.md](../02-plan/assumptions.md) filled (decided vs working assumptions, open questions Q1–Q6, Later list); decisions D-001 to D-012 logged; comparison logged as R-002.
- Follow-up: [R-002](../06-ai-review/ai-review-log.md#r-002-brief-analysis-compared-with-author-decisions), D-001 to D-012

## P-006: Decision revisions

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Respond to the AI's objections from P-005: revise the topic model, settle open questions, confirm AI-drafted reasons.
- Prompt: Verbatim in [transcripts/P-006-decision-revisions.md](transcripts/P-006-decision-revisions.md).
- Result summary: D-002 superseded by D-013 (categories come from the sources); D-014 to D-017 added; AI-inferred reasons marked confirmed; assumptions updated; category inventory added to the research checklist in [data-sources.md](../03-research/data-sources.md); README states the admin view is open, local demo only.
- Follow-up: [R-002](../06-ai-review/ai-review-log.md#r-002-brief-analysis-compared-with-author-decisions) follow-up, D-013 to D-017

## P-007: Close Q1

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Reject the AI's proposed severity floor and close Q1.
- Prompt: Verbatim in [transcripts/P-007-close-q1.md](transcripts/P-007-close-q1.md).
- Result summary: D-018 logged; Q1 closed in assumptions; research checklist item 3 changed to measure volume per category; rejection logged as R-003.
- Follow-up: [R-003](../06-ai-review/ai-review-log.md#r-003-severity-floor-for-important-rejected), D-018

## P-008: Plan

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Write the plan of attack: deliverables, order and reasoning, scope, milestones with completion criteria.
- Prompt: Verbatim in [transcripts/P-008-plan.md](transcripts/P-008-plan.md).
- Result summary: [plan.md](../02-plan/plan.md) with 6 deliverables, ordering rationale (sources → design → vertical slice → optional paths), cut order, M1–M9 with "done when"; M1–M2 marked done.
- Follow-up: none

## P-009: Priorities and review milestone

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Set priorities by what the task evaluates and the brief asks for; add an independent code review milestone.
- Prompt: Verbatim in [transcripts/P-009-priorities.md](transcripts/P-009-priorities.md).
- Result summary: Plan gets must / should / cut-first tiers, a stub log channel as a must-have, M9 independent review, M10 submission. Decisions D-019 (stub channel) and D-020 (priorities) logged.
- Follow-up: D-019, D-020

## P-010: Code-reviewer agent and SMTP

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Answer the AI's two open points from P-009.
- Prompt: Verbatim in [transcripts/P-010-reviewer-and-smtp.md](transcripts/P-010-reviewer-and-smtp.md).
- Result summary: No change to the plan. The AI had flagged that no "code-reviewer" agent exists; the author plans to create it in a later step, before M9. SMTP stays optional.
- Follow-up: create the code-reviewer agent before M9

## P-011: CLAUDE.md rules

- Date: 2026-10-02
- Tool / model: Claude Code (VS Code extension), Claude Opus 5.5
- Goal: Set standing rules for the AI before M3, so verification and decision discipline don't depend on repeating them in each prompt.
- Prompt: Verbatim in [transcripts/P-011-claude-md.md](transcripts/P-011-claude-md.md).
- Result summary: [CLAUDE.md](../../CLAUDE.md) written with the author's rules. The AI added one section not in the prompt, "Process logging", describing the logging conventions already in use.
- Follow-up: `/milestone-done` is referenced but does not exist yet
