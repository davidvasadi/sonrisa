# P-037: Final tests, README screenshots, push to GitHub

Prompt exactly as sent.

---

last step, push to github:
1. I tested real SMTP myself with Gmail (app password), the email arrived in my inbox. I removed the credentials from .env afterwards and I'm not sharing screenshots of my inbox. update the readme and the logs: real SMTP was tested by the author with Gmail, it's no longer unverified. record it as author-reported.
2. I added two new screenshots: process/08-screenshots/m10-slack-real-poll-event.png and m10-user-real-poll-delivered.png. a real BBC event (not demo) came in from polling and was delivered to slack automatically. log it and mention it in the readme
3. screenshots in the main readme: put them right at the top, after the first short paragraph, before anything else. only the final result, no older ones (those stay in the folder). tell a story in this order, each with a one-line caption saying what it proves: the real slack message from a live BBC event, the user view showing it was sent, then the final admin view. make them a readable size, side by side where it fits
4. my notes are in process/notes/notes.md (hungarian), link them from the readme
5. export transcripts and commit, so this prompt is in the history too
6. search the full git history for .env files, slack client id/secret, webhook urls, tokens, smtp passwords. report what you checked, don't print any secret
7. create a public repo named sonrisa on my github with gh, push all commits, show me the url
