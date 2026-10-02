# P-034: M9, check and fix the findings

Prompt exactly as sent.

---

first check each finding yourself, tell me if any is wrong.
then fix: 1, 2, 3, 4, 5, 8, 9, 10, 12, both suspicions (ctrl+c exit, strip CR/LF from email subject ourselves).
6: just make the connected/failed text generic per channel, seed is fine.
7: fix the docs to say only the oauth path was tested for real, paste webhook only with the mock, cancel untested.
11: won't fix, put it on the later list.
node 20 crash: make npm install fail with a clear message on node < 22 (engine-strict in .npmrc), and the server should print why if started on the wrong version.
lockfile: commit the regenerated one.
log every call in the ai review log. then run the code-reviewer again only on what changed, show me what it finds.
