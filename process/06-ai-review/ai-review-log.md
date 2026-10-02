# AI Review Log

What the AI produced, how I checked it, and what I accepted, corrected or rejected.

## Template

```
## R-NNN: <short title>

- Date:
- Prompt / session: link to entry in ../07-prompts/session-log.md
- What the AI produced:
- How I checked it: (ran it, read it, tested it, compared with docs or raw API data, ...)
- What I found:
- Verdict: accepted | corrected | rejected
- What changed as a result:
- Related decision: D-NNN (if any)
```

## Entries

## R-001: P-001 transcript was not verbatim

- Date: 2026-10-02
- Prompt / session: [P-001](../07-prompts/session-log.md#p-001-repository-setup), fixed in [P-002](../07-prompts/session-log.md#p-002-fix-p001-transcript)
- What the AI produced: A transcript of the first prompt, with the session log saying it was "verbatim". The middle of the prompt (the full task text) had been replaced with the placeholder `[full task text — see 01-brief/brief.md]`, justified in a note as avoiding repetition.
- How I checked it: Opened the transcript and compared it with what I had actually sent.
- What I found: The claim "verbatim" was false. The AI decided on its own to shorten the record, which conflicts with the submission requirement "all prompts used during the process". The note in the file disclosed the shortcut, but the session log entry did not.
- Verdict: corrected
- What changed as a result: The transcript now contains the complete prompt as sent. Going forward, transcripts are stored exactly as sent, with no abbreviation, even where content duplicates another file.
- Related decision: none

## R-002: Brief analysis compared with author decisions

- Date: 2026-10-02
- Prompt / session: [P-003](../07-prompts/session-log.md#p-003-brief-analysis) (analysis), reviewed in [P-005](../07-prompts/session-log.md#p-005-author-decisions)
- What the AI produced: [brief-analysis.md](../03-research/brief-analysis.md), with 12 default assumptions, 13 gaps, 8 risks and a proposed interpretation, written before seeing my decisions.
- How I checked it: Made my own decisions independently, then had the AI compare the two and state where it disagreed.
- What I found:
  - Agreed: channels as delivery adapters (A10), dedup (gap 2), verifying sources against real calls (risk 2), a dev email inbox (A9).
  - Overridden: per-user filters (A1/A7) replaced by on/off topics. Minimal auth (A12) replaced by no auth. Admin control actions (A11) replaced by "see everything + inject demo event". Polling-only (A2) extended with push. Webhook-only Slack (A9) extended with OAuth.
  - Added by me, not in the analysis: live UI, zero-config run, stack choice.
  - Deferred: most of the gaps and the remaining risk mitigations (see [D-012](../05-decisions/decision-log.md#d-012-defer-remaining-extras-to-later)).
  - Pushback the AI raised, still open: system thresholds now carry the whole definition of "important" (Q1), whether a keyless market source exists (Q2), user identity without auth (Q3), minimal source-staleness monitoring.
- Verdict: corrected
- What changed as a result: Assumptions and decisions D-001 to D-012 recorded. The analysis file is kept unchanged as the AI's baseline.
- Related decision: D-001 to D-012
- Follow-up ([P-006](../07-prompts/session-log.md#p-006-decision-revisions)): The AI's Q1 objection led the author to replace the fixed topics with categories taken from the sources (D-013 supersedes D-002). Source freshness moved into scope (D-014). Q2 and Q3 were resolved (D-016, D-015). The remaining AI recommendations were accepted (D-017). The AI-drafted "Why" texts were reviewed and confirmed by the author.

## R-003: Severity floor for "important" rejected

- Date: 2026-10-02
- Prompt / session: proposed by the AI after [P-006](../07-prompts/session-log.md#p-006-decision-revisions), rejected in [P-007](../07-prompts/session-log.md#p-007-close-q1)
- What the AI produced: A recommendation to keep Q1 open and give each source a system-level minimum level (e.g. minimum severity), to be set during research.
- How I checked it: Weighed it against D-013. If users pick categories, a hidden system threshold on top second-guesses the source, and the threshold values would be arbitrary.
- What I found: The floor adds a layer of filtering the system has to justify, while the same goal is reached by choosing better sources.
- Verdict: rejected
- What changed as a result: D-018 (no filter; source choice controls volume). Q1 closed. The research checklist now measures publishing volume per category instead of looking for severity fields.
- Related decision: D-018
