# P-030: Real Slack test result, close M8

Prompt exactly as sent.

---

real slack test done: connect slack worked on https://localhost (so Q5 is answered, slack accepts https localhost), connected to #new-channel, injected bbc business for ada, delivery shows sent and the message arrived in slack. screenshots are in process/08-screenshots (m8-slack-real-message.png, m8-admin-slack-sent.png). I didn't test cancel on slack's page, leave it unverified.
also log this: I first put the real slack keys into .env.example by mistake, caught it before any commit, moved them to .env and restored .env.example. double check .env.example is empty and .env is not staged.
then close M8 with /milestone-done, commit without asking again
