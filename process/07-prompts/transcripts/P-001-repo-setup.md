# P-001: Repository setup

Prompt exactly as sent.

---

take-home task for a job. below is the main task — everything we do in this repo is for this, so keep coming back to it. the most important part is "What We're Evaluating": they care more about how I work with AI (decisions, checks, what I reject or correct) than the code, so everything gets documented as we go.

=== MAIN TASK ===
Task: Feature Design & Build from a Vague Brief

Scenario
A product manager has handed you the following brief — exactly as written, nothing more:
"We want users to be able to set up alerts so they get notified when something important happens in the world — like breaking news, market movements, natural disasters, that kind of thing. Should work for both email and Slack. Make it flexible enough that we can add more channels later. We need an admin view too."
You may use any technology, language, or framework you choose.
There is no further specification. No wireframes. No schema proposal. No agreement on what "something important" means, where the data comes from, or how events are detected.

Your Task
Using AI agents, take this brief from ambiguity to a working implementation.
Before you start building, define your own plan of attack. Decide what deliverables you think this brief requires, what order to tackle them in, and why. Your plan is itself part of the evaluation — we want to see how you scope and structure work, not just how you execute a predefined checklist.
Then execute against your own plan. As you go, critically assess what the AI produces: don't assume outputs are correct just because they look plausible. Surface the checks you run, the things you reject, and the course-corrections you make — that judgment is as important as the work itself.

Suggested Timeframe
Plan for 24 hours. A partial but well-reasoned solution beats a complete but undocumented one — use the time to think, plan, and show your work, not to maximize output.

A Note on What We're Evaluating
We are not evaluating the solution itself. We are evaluating how you arrived at it.
A working, polished implementation with no visible process tells us very little. What we want to see is how you directed the AI: how you framed the problem, what decisions you made and why, where you course-corrected, and how you validated output before accepting it. The artifacts of that process — plans, decision logs, prompt drafts, notes, intermediate outputs — are the submission. The code is evidence, not the point.
We pay particular attention to how you evaluated the validity of what the AI produced — the assumptions you challenged, the hallucinations or shortcuts you caught, the code you rewrote or rejected, and the sanity checks you applied to generated artifacts.

AI Tooling
Use any AI tool(s) you prefer — there is no required or favored product.

What to Submit
Please share your results with us via a GitHub repository that must contain:
- commits for each major milestone, with meaningful commit messages
- your prompt history — all prompts used during the process
- your plans, working artifacts, and evidence of how you worked — design docs, decision logs, prompt drafts, intermediate outputs, notes, scratch files, screenshots, etc.
- your deliverables — as defined by your own plan
=== END OF MAIN TASK ===

don't build yet, first just set up the repo. I want two main folders: process for the reviewers (how I worked) and app for the actual system, app stays empty for now.

inside process numbered folders 01 to 08 so it reads in order: brief (put the main task in there word for word), plan (plan + assumptions), research (brief analysis, data sources, and a folder for the raw api responses), design, decisions (decision log), ai-review (the log of what I checked/rejected), prompts (session log, transcripts, drafts) and screenshots. plus a notes and a scripts folder in process too, no number.

just headings in the files for now, the logs can get a template. readme in the root explaining the two parts with links, gitignore, everything in english. then git init and commit
