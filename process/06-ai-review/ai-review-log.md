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
- Prompt / session: [P-001](../07-prompts/session-log.md#p-001-repository-setup), fixed in [P-002](../07-prompts/session-log.md#p-002-fix-p-001-transcript)
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

## R-004: Transcript export leak check tested with planted leaks

- Date: 2026-10-02
- Prompt / session: [P-012](../07-prompts/session-log.md#p-012-code-reviewer-agent-milestone-done-skill-transcript-export)
- What the AI produced: `export-transcripts.mjs` and a `--check` mode that looks for harness tags, fragments of thinking, tool calls, tool results and attachments, and missing turns in the export.
- How I checked it:
  1. Inspected the real session JSONL format before writing the parser, rather than assuming it.
  2. Ran the export and the check: OK.
  3. Questioned "probed 1 thinking" out of 28 thinking blocks. The session file stores thinking as empty text with a signature, except one block, so there was nothing else to leak.
  4. Planted leaks in the export and confirmed the check fails: thinking text (FAIL), a `<system-reminder>` tag (FAIL), a real tool result (FAIL), a deleted reply (FAIL). A clean re-export passes.
  5. Independent `grep` for harness tags, tool markers, the paste id, the home path and email addresses.
- What I found:
  - The AI's first tool-output test was invalid. It planted brief text, which legitimately appears in prompt 1, and Read output carries line-number prefixes. So "OK" there proved nothing. It was replaced with a planted real tool result, which the check caught.
  - The grep found the author's git email in one assistant reply. This is not a harness leak: it is the assistant's own reply text.
- Verdict: accepted, after correcting the invalid test
- What changed as a result: The check is reproducible (`--check`) and part of `/milestone-done`.
- Related decision: none

## R-005: Skill flag contradicted the y/n rule

- Date: 2026-10-02
- Prompt / session: [P-012](../07-prompts/session-log.md#p-012-code-reviewer-agent-milestone-done-skill-transcript-export), fixed in [P-013](../07-prompts/session-log.md#p-013-skill-invocation-flag-and-email-redaction)
- What the AI produced: The `/milestone-done` skill with `disable-model-invocation: true`, so that the AI could not start it on its own.
- How I checked it: Read the skill against the CLAUDE.md rule: the AI asks "Run /milestone-done now? (y/n)" and runs it after a yes.
- What I found: The flag stops the AI from invoking the skill at all, including after a yes. The y/n flow in CLAUDE.md could never work. The AI had enforced "don't run without yes" twice, once in a way that broke the rule's purpose, and had not noticed that the two contradicted each other.
- Verdict: corrected
- What changed as a result: Flag removed. The CLAUDE.md rule alone governs when the skill runs.
- Related decision: none

## R-006: Leak check false positives after the session grew

- Date: 2026-10-02
- Prompt / session: [P-013](../07-prompts/session-log.md#p-013-skill-invocation-flag-and-email-redaction)
- What the AI produced: The `--check` from R-004, which failed on a clean export once the session included discussion of the export itself.
- How I checked it: Read the two reported leaks, not just the FAIL count.
- What I found: Both were false positives. A reply mentioned `<system-reminder>` by name. A tool output that read the transcript echoed prompt 1, which is legitimately in the export. The check treated any match as a leak.
- Verdict: corrected
- What changed as a result: A fragment only counts as a leak if it is not in allowed text. Allowed text is built from the raw prompt and reply blocks, not from the extractor's output, so an extractor bug can't whitelist its own leak. Tags are counted beyond those the replies themselves contain. Re-tested against six planted cases: clean, thinking text, a harness tag in a prompt, a real tool result, an email address, a deleted reply. Each behaved as expected. The planted tool result also contained the author's email, which the new email check caught.
- Related decision: none

## R-007: Fresh-session review of the process docs

- Date: 2026-10-02
- Prompt / session: [P-015](../07-prompts/session-log.md#p-015-review-rules-and-decisions-for-contradictions), acted on in [P-016](../07-prompts/session-log.md#p-016-doc-fixes-and-slack-decisions)
- What the AI produced: In a new session with no memory of writing the docs, a summary of CLAUDE.md and the process docs, with 7 contradictions or errors and 3 undecided gaps.
- How I checked it: Read each finding against the files it cited, and decided each one myself.
- What I found: All 10 held up:
  1. The decision-log intro named the wrong prompts for D-018 to D-020.
  2. CLAUDE.md required a raw response even for APIs that can't be called without credentials, while the reviewer agent accepted docs.
  3. "Slack is optional" (D-007) contradicted Slack as a must-have (D-020).
  4. There was no defined way to test Slack in M7.
  5. The /milestone-done question was asked after every task, not every milestone.
  6. The plan's scope included the superseded D-002.
  7. The brief analysis read as current.

  Gaps: cross-source dedup, SSRF through pasted webhooks, and the disaster disclaimer.

  For items 3 and 4 I went further than the AI suggested: the Connect Slack button became a must-have, not just a wording fix, and Slack is tested with a mock plus one real send.
- Verdict: accepted
- What changed as a result: Wording fixed across CLAUDE.md, the plan, the assumptions, the decision log, the brief analysis and the reviewer agent. D-021 to D-023 were added. Cross-source dedup went to Later, and the disclaimer went into the README.
- Related decision: D-021, D-022, D-023

## R-008: Prompt numbering taken from memory

- Date: 2026-10-02
- Prompt / session: [P-016](../07-prompts/session-log.md#p-016-doc-fixes-and-slack-decisions)
- What the AI produced: Decision-log and assumption references to P-014 and P-015 for the new prompts, numbered from the last entry in the session log.
- How I checked it: /milestone-done step 5 takes prompts from the exported session, not from memory. The export showed a bare "n" at the end of the previous session that had never been logged.
- What I found: The numbers were off by one. The unlogged "n" is P-014, so the new prompts are P-015 and P-016.
- Verdict: corrected
- What changed as a result: References renumbered, and P-014 logged. This confirms the skill's rule of taking prompts from the export.
- Related decision: none

## R-009: Transcript export was stale at commit time

- Date: 2026-10-02
- Prompt / session: [P-016](../07-prompts/session-log.md#p-016-doc-fixes-and-slack-decisions), fixed in [P-017](../07-prompts/session-log.md#p-017-review-entries-and-slack-button)
- What the AI produced: The /milestone-done skill, which exports transcripts in step 4 and commits in step 8.
- How I checked it: Re-ran `--check` before the commit.
- What I found: It failed with "1 turn(s) missing from export". This was not a content leak: the AI's reply text written after step 4 wasn't in the export yet. A re-export passed (`OK: no leaks found`). Without a re-run, a stale export would have been committed.
- Verdict: corrected
- What changed as a result: Step 8 of the skill now re-exports and re-checks right before committing.
- Related decision: none

## R-010: Leak check raced the session file

- Date: 2026-10-02
- Prompt / session: [P-017](../07-prompts/session-log.md#p-017-review-entries-and-slack-button), fixed in [P-018](../07-prompts/session-log.md#p-018-leak-check-retry-and-m3-data-source-research)
- What the AI produced: `export-transcripts.mjs --check`, run right after an export.
- How I checked it: Read the failure instead of trusting a re-run. The export and check ran in the same command, so R-009's staleness (work done after step 4) could not explain it.
- What I found: "1 turn(s) missing from export" right after a fresh export, and a pass on the next run. The likely cause is that Claude Code was still writing the assistant's latest reply to the session file when the export read it. This is unconfirmed: we don't control when the harness writes.
- Verdict: corrected
- What changed as a result: When the *only* failures are missing turns, `--check` waits 2 s, re-exports and checks once more. Any other failure, such as a leaked fragment or an email address, is never retried. Tested with four cases: a clean export (it hit the race on its own, retried, OK), a stale export with the last reply cut (retried, OK), a planted email (FAIL, no retry), and a planted email plus a stale export (FAIL, no retry).
- Related decision: none

## R-011: UN News feeds wrongly reported as empty

- Date: 2026-10-02
- Prompt / session: [P-018](../07-prompts/session-log.md#p-018-leak-check-retry-and-m3-data-source-research)
- What the AI produced: A finding, stated to the author mid-task, that UN News returns HTTP 200 with zero items for slugs that don't exist (health, culture-and-education, americas), "so a 200 doesn't prove a category exists".
- How I checked it: The analysis script later failed to parse one stored UN body. Its first bytes were `1f 8b` (gzip) and its headers showed `content-encoding: gzip`, although curl had not asked for compression.
- What I found: The "empty" feeds were gzip-compressed. The AI had counted `<item` in compressed bytes. After decompression each feed had 30 items. The claimed server behaviour didn't exist; it came from the AI's own measurement error.
- Verdict: corrected
- What changed as a result: The finding was withdrawn and stated as wrong in [data-sources.md](../03-research/data-sources.md) (surprise 9). The analysis script decompresses gzip bodies, and the fetch script documents it. The file named `topic-health-EMPTY.rss` was renamed.
- Related decision: none

## R-012: Research doc claimed more than the stored evidence

- Date: 2026-10-02
- Prompt / session: [P-018](../07-prompts/session-log.md#p-018-leak-check-retry-and-m3-data-source-research)
- What the AI produced: A first version of [data-sources.md](../03-research/data-sources.md) saying "every number below comes from that output" and listing UN topic and region feeds and NPR IDs as "verified".
- How I checked it: Re-read each number and claim in the doc against [sample-analysis.txt](../03-research/sample-analysis.txt) and the files in `raw-responses/`.
- What I found: The GDACS 365-day breakdown came from an ad-hoc command, not from the analysis script. Twelve UN feeds and four NPR IDs had been checked live, but their responses weren't stored. That breaks the CLAUDE.md rule that claims need a stored response. Re-fetching changed three numbers in the doc (UN overlap 32/138 to 131/369, NPR overlap 8/41 to 16/63, NPR Business 5 to 6 in 24 h).
- Verdict: corrected
- What changed as a result: The missing feeds were added to the fetch script and stored. The 30/90/365-day GDACS windows were added to the analysis script. The doc was updated to the regenerated numbers.
- Related decision: none
