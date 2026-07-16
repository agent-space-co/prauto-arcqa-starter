# PR Approval Tier Policy

Defines which PRs merge autonomously and which require human review.
Enforced via CODEOWNERS, `pr-contract.yml` tier labeling, and GitHub branch protection.

---

## Tier 1 — AI-approved, auto-merged

**Criteria (all must be true):**
- `ai-review` verdict = `approve`
- All required status checks green: `lint`, `test`, `ai-review`, `pr-contract`, `security`, `lint-guard`
- Diff under 400 lines (excluding lockfiles)
- No CODEOWNERS-protected files touched
- "Allow auto-merge" enabled in GitHub Settings

**Examples:** standard `feat/`, `fix/`, `docs/` PRs not touching sensitive paths

---

## Tier 2 — AI-reviewed, human required

**Triggers (any one):**
- PR touches a file in `.github/CODEOWNERS`
- Diff exceeds 400 lines
- `ai-review` verdict = `needs_human`
- PR modifies DB migrations AND application logic together

**Behavior:** `ai-review` still runs and comments. CODEOWNERS blocks merge until a
listed reviewer approves. `pr-contract.yml` labels the PR `tier:2`.

**Examples:** DB migrations, CI/CD workflow changes, docker-compose files

---

## GitHub Setup

1. **Branch protection on `main`:** required status checks: `lint`, `test`,
   `ai-review`, `pr-contract`, `security`, `lint-guard`. Require Code Owner review.

2. **Allow auto-merge:** Settings > General > enable "Allow auto-merge".

3. **Labels:** run `setup.sh` — it creates all required labels automatically.

---

## How `pr-contract.yml` applies tier labels

On every PR open/sync:
1. Checks diff size and CODEOWNERS file overlap
2. Applies `tier:1` or `tier:2` label
3. Posts a comment on Tier 2 PRs explaining why human review is required

The label is informational. CODEOWNERS is the enforcement mechanism.
