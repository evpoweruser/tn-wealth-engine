# AI Work Tracking Rule

This repo uses an in-repo memory system so any AI session can resume without context loss.
Spec files live in `docs/` and are version-controlled with the code.

Whenever doing a complex multi-step task or modifying project code:

1. **Check progress first**: read `docs/PROGRESS.md` before starting.
2. **Update after accomplishing work**: check off / add items in `docs/PROGRESS.md`
   and append a dated entry to `docs/TASK_LOG.md` (goal, files created/modified,
   verification outcome, commit hash).
3. **Record architectural decisions**: if a non-trivial design choice, bug-fix policy,
   or scope limitation is established, append an ADR to `docs/DECISIONS.md`.
4. **Stay truthful**: only record commit hashes from `git log`, test counts from
   actual runs, and deploy URLs only when a deploy actually happened. Never invent.
5. **Don't duplicate specs**: deep technical specs live in `docs/WALKTHROUGH.md` and
   `docs/ROBUSTNESS_AND_STRESS_PANEL.md` — link to them, don't copy them here.
6. **Local-first session workflow**: Keep progress local during active session (`git commit`), do not `git push` or `npx vercel --prod` until user signals session wrap-up (`.agents/rules/deployment_workflow.md`).

Verification commands:

- Unit tests: `npm test` (vitest; 40/40 passing as of 2026-09-06)
- Build: `npm run build`
