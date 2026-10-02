# P-016: Doc fixes and Slack decisions

Prompt exactly as sent.

---

fix all of them:
1, 6, 7: yes fix the wording
2: for things that can't be called without credentials (slack oauth, smtp, real webhook) a cited official doc is enough, put that in CLAUDE.md
3: slack is a must have, and so is the "connect slack" button — move it out of cut-first. if no slack app is configured (like on the reviewers' machine), the paste webhook option is there next to it. fix the wording everywhere
4: tests use a mock receiver. I'll make a free slack workspace when we get to M7/M8 and test it for real once, with a screenshot
5: yes, only ask after a task that completes a milestone
gaps: cross-source dedup goes to later. pasted webhooks only allowed to hooks.slack.com, log it as a decision. add the disaster disclaimer to the readme now.
then run /milestone-done to close M2
