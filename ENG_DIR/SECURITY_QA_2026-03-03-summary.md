**Security QA 2026-03-03**
- Task 1 — Rotate Compromised Credentials
- Task 2 — Fix Open Redirect in Auth Callback and Login
- Task 3 — Rate Limiting on Votes, Comments, Posts, Q&A, Polls
- Task 4 — Content Moderation Fails Closed
- Task 5 — lock-event API Route Authorization
- Task 6 — File Upload Size Limits and Magic-Byte Validation
- Task 7 — Fix N+1 Queries in Post Feed and Event Q&A
- Task 8 — Remove console.log Leaks
- `action/createPost.tsx` (also fixed in Task 4)
- Task 9 — /api/track View-Count Inflation
- Task 10 — Email Notifications: Downgrade from Service Role + Send-Rate Limit
- Task 11 — Security Response Headers
- Task 12 — Loose Equality in Delete Authorization
**Fix:** Replaced with strict `!==` in both delete actions. The `console.log` statements above the checks were removed at the same time (see Task 8).
