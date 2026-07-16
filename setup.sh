#!/usr/bin/env bash
# PRAuto + ArcQA setup script
# Run this once after cloning/copying this starter into your repo.
set -e

echo ""
echo "PRAuto + ArcQA Setup"
echo "===================="
echo ""

# ── Gather inputs ─────────────────────────────────────────────────────────────

read -rp "Your GitHub handle (for CODEOWNERS, e.g. fitim-b): " GH_HANDLE
if [ -z "$GH_HANDLE" ]; then echo "GitHub handle required." && exit 1; fi

read -rp "Repo (owner/name, e.g. your-org/your-repo): " REPO
if [ -z "$REPO" ]; then echo "Repo required." && exit 1; fi

read -rp "WIP cap — max open PRs before new ones are blocked [25]: " WIP_CAP
WIP_CAP="${WIP_CAP:-25}"

read -rp "Does your app use Supabase for auth? [y/N]: " USE_SUPABASE
USE_SUPABASE="${USE_SUPABASE,,}"

echo ""

# ── Patch CODEOWNERS ──────────────────────────────────────────────────────────

sed -i "s/@YOUR_GITHUB_HANDLE/@${GH_HANDLE}/g" .github/CODEOWNERS
echo "CODEOWNERS: set owner to @${GH_HANDLE}"

# ── Patch WIP cap ─────────────────────────────────────────────────────────────

sed -i "s/WIP_CAP: \"25\"/WIP_CAP: \"${WIP_CAP}\"/" .github/workflows/wip-check.yml
echo "wip-check: cap set to ${WIP_CAP}"

# ── Patch pr-contract PROTECTED_PATHS if Supabase not in use ─────────────────

if [ "$USE_SUPABASE" != "y" ]; then
  sed -i '/supabase\/migrations\//d' .github/workflows/pr-contract.yml
  echo "pr-contract: removed supabase/migrations/ from PROTECTED_PATHS"
fi

# ── Create required GitHub labels ─────────────────────────────────────────────

echo ""
echo "Creating GitHub labels in ${REPO}..."

create_label() {
  gh label create "$1" --repo "$REPO" --color "$2" --description "$3" 2>/dev/null \
    && echo "  created: $1" \
    || echo "  exists:  $1"
}

create_label "tier:1"       "0075ca" "Tier 1 — AI-approved auto-merge"
create_label "tier:2"       "e4e669" "Tier 2 — human review required"
create_label "stale"        "e4e669" "PR open >48h without activity"
create_label "ai-review"    "bfd4f2" "AI review finding"
create_label "needs-fix"    "d93f0b" "Requires fixes before merge"
create_label "security"     "b60205" "Security finding"
create_label "merge-conflict" "f9d0c4" "Cannot auto-rebase"
create_label "arcqa"        "0075ca" "ArcQA test failure"
create_label "smoke"        "bfd4f2" "L1 smoke test"
create_label "invariant"    "e4e669" "L2 invariant test"
create_label "exploratory"  "fbca04" "L3 exploratory test"
create_label "isolation"    "d93f0b" "L4 isolation test"

# ── Print next steps ──────────────────────────────────────────────────────────

echo ""
echo "Done. Complete setup with these GitHub UI steps:"
echo ""
echo "1. Add secrets (Settings > Secrets > Actions):"
echo "   ANTHROPIC_API_KEY   — get from console.anthropic.com"
if [ "$USE_SUPABASE" = "y" ]; then
echo "   NEXT_PUBLIC_SUPABASE_URL"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   E2E_SESSION_TOKEN   — a valid Supabase auth token for CI"
fi
echo "   DISCORD_WEBHOOK     — (optional) for human-review escalation alerts"
echo ""
echo "2. Enable auto-merge (Settings > General > Allow auto-merge)"
echo ""
echo "3. Add branch protection for main (Settings > Branches):"
echo "   Required status checks: lint, test, ai-review, pr-contract, security, lint-guard"
echo "   Require review from Code Owners"
echo ""
echo "4. Edit arcqa/tests/e2e/smoke/routes.spec.ts:"
echo "   Replace AUTHED_ROUTES and PUBLIC_ROUTES with your app's actual routes."
echo ""
echo "PRAuto + ArcQA is ready. Push a branch to test it."
