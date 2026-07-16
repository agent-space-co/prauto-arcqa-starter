# PRAuto + ArcQA Starter

AI-powered PR automation and smoke test coverage for any GitHub repo.

**PRAuto** automatically reviews PRs with Claude, enforces PR hygiene, auto-fixes
lint errors, and merges qualifying PRs without human intervention.

**ArcQA** runs Playwright smoke tests on every PR and files GitHub issues when
tests fail — with layer classification so you know exactly what broke.

---

## What you get

| Workflow | What it does |
|---|---|
| `ai-review` | Claude haiku reviews every PR diff. Approves and auto-merges clean PRs. Escalates to humans when needed. |
| `pr-contract` | Enforces branch naming, conventional commit titles, diff size limits, and lockfile-excluded file counts. Labels PRs with approval tier. |
| `lint-guard` | Blocks PRs that add `# noqa` or `# type: ignore` suppressions without justification. |
| `wip-check` | Blocks new PRs when too many are already open (configurable cap). |
| `auto-fix` | On lint failure: runs ruff auto-fix and pushes back to the branch. On merge conflict: attempts auto-rebase. Creates a GitHub issue if it can't resolve. |
| `auto-pr` | Opens a draft PR and enables auto-merge automatically when you push a branch. |
| `security` | Runs pip-audit and bandit on every PR. Creates a GitHub issue on failure. |
| `stale-sweep` | Labels PRs idle for 48h. Closes them at 96h. Runs daily. |
| `e2e` | Runs Playwright smoke tests. Files a GitHub issue per failure with layer classification. |

---

## Setup

**Prerequisites:** GitHub repo, `gh` CLI authenticated, Node 20+, Python 3.12+.

```bash
git clone https://github.com/agent-space-co/prauto-arcqa-starter your-repo-name
cd your-repo-name
chmod +x setup.sh
./setup.sh
```

`setup.sh` will:
- Ask for your GitHub handle and repo name
- Populate `CODEOWNERS` with your handle
- Set the WIP cap
- Create all required GitHub labels

Then complete the three GitHub UI steps it prints at the end.

---

## ArcQA — adding your routes

After setup, edit `arcqa/tests/e2e/smoke/routes.spec.ts` and replace the placeholder
route lists with your app's actual routes:

```ts
const AUTHED_ROUTES: string[] = [
  '/dashboard',
  '/settings',
  '/profile',
  // ... your protected routes
]

const PUBLIC_ROUTES: string[] = [
  '/login',
  '/signup',
  // ... your public routes
]
```

Copy the `arcqa/` folder and `playwright.config.ts` into your app directory and add
the Playwright dependencies to your `package.json`:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

---

## Required GitHub Secrets

| Secret | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers `ai-review`. Without this, all PRs route to human review. |
| `E2E_SESSION_TOKEN` | Optional | Injects a session cookie for authenticated Playwright tests. Without it, auth tests skip gracefully. |
| `DISCORD_WEBHOOK` | Optional | Posts human-review escalation alerts to a Discord channel. |

---

## Approval tiers

See [`docs/operations/pr-approval-tiers.md`](docs/operations/pr-approval-tiers.md) for the full tier policy.

**Short version:**
- **Tier 1** — ai-review approves, all checks green, <400 lines, no CODEOWNERS files: auto-merges.
- **Tier 2** — touches CODEOWNERS files, >400 lines, or ai-review says needs_human: requires a human reviewer.

---

## Customizing protected paths

Edit the `PROTECTED_PATHS` env var in `.github/workflows/pr-contract.yml` to match
the sensitive files in your repo. Any PR touching those paths gets labeled `tier:2`.

Also update `.github/CODEOWNERS` to list the same paths with your team's handles.

---

Built by [Agent Space](https://arc-grid.com).
