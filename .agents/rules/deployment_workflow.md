# Deployment & Remote Sync Policy

To maintain a clean commit history and avoid unnecessary intermediate deployments during development:

1. **Local-First Development (During Session)**:
   - Complete features, visual changes, and fixes locally.
   - Verify code using local unit tests (`npx vitest run`) and local builds (`npm run build`).
   - Create local git commits (`git commit`) after each feature or task.
   - **Do NOT** execute `git push` or `npx vercel --prod` after individual intermediate tasks.

2. **End-of-Session Release (Wrap Up)**:
   - When the user gives the signal to end the session (e.g. "push progress", "merge today's work", "wrap up session"):
     1. Run full test suite & production build check.
     2. Push all accumulated local commits to GitHub (`git push origin main`).
     3. Deploy to Vercel production (`npx vercel --prod`).
     4. Update `docs/PROGRESS.md` & `docs/TASK_LOG.md`.
