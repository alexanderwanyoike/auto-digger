# Auto Digger

Use Yarn. Deliver changes on feature branches through pull requests. Never push or merge into dev without explicit permission.

Use `main <- dev <- feature/branch` Git flow. Start feature branches from `dev`, target feature PRs at `dev`, and promote `dev` to `main` through a release PR. Do not target feature PRs directly at `main`.

Every PR must deliver exactly one focused change, including only its implementation, tests and necessary documentation. Split unrelated changes into separate PRs even when requested together. State dependencies and merge order when stacking is necessary.

Follow TDD with separate atomic commits for the failing test, passing implementation, and any refactoring. Keep TypeScript strict, use explicit typed Results for expected failures, and keep files small and cohesive. Do not suppress lint rules or use explicit any. Use composition and simple responsibilities.

Run `yarn verify` and `xvfb-run --auto-servernum yarn test:electron` before handing off coding changes. Ask whether the user wants a code review after delivering a coding PR.

Do not use Unicode U+2014. Comments explain constraints and rationale only. Prefer restrained visuals and plain language.

PR descriptions contain Background, Tasks (checklist), and Tested, in that order, with optional Tech Debt.

## Agent skills

### Issue tracker

GitHub Issues in alexanderwanyoike/auto-digger. See `docs/agents/issue-tracker.md`.

### Triage labels

Use existing labels; no project triage workflow is configured. See `docs/agents/triage-labels.md`.

### Domain docs

Single context in `CONTEXT.md`, with decisions in `docs/adr/`. See `docs/agents/domain.md`.
