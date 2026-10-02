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
