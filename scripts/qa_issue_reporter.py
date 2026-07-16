#!/usr/bin/env python3
"""
scripts/qa_issue_reporter.py

Called from .github/workflows/e2e.yml on Playwright test failure.
Reads the Playwright JSON results file and creates one GitHub issue per
failed test, labeled by layer (smoke / invariant / exploratory / isolation).

Usage:
  python3 scripts/qa_issue_reporter.py \
      --results test-results/results.json \
      --pr-number $PR_NUMBER \
      --pr-title "$PR_TITLE" \
      --pr-author $PR_AUTHOR \
      --branch $BRANCH \
      --run-url $RUN_URL \
      --repo $GITHUB_REPOSITORY
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

# Keyword -> (label, tier)
# tier 1 = smoke (fast, always run), tier 2 = integration, tier 3 = exploratory
LAYER_LABELS: dict[str, tuple[str, int]] = {
    "smoke":        ("smoke", 1),
    "auth":         ("smoke", 1),
    "public":       ("smoke", 1),
    "invariant":    ("invariant", 2),
    "integration":  ("invariant", 2),
    "choreography": ("isolation", 3),
    "isolation":    ("isolation", 3),
    "exploratory":  ("exploratory", 3),
    "fault":        ("exploratory", 3),
    "perf":         ("exploratory", 3),
}


def classify_test(title: str) -> tuple[str, int]:
    lower = title.lower()
    for keyword, (label, tier) in LAYER_LABELS.items():
        if keyword in lower:
            return label, tier
    return "smoke", 1


def gh(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["gh", *args], capture_output=True, text=True)


def ensure_label(repo: str, name: str, color: str, description: str) -> None:
    result = gh("label", "list", "--repo", repo, "--search", name, "--json", "name")
    existing = json.loads(result.stdout or "[]")
    if not any(lbl["name"] == name for lbl in existing):
        gh("label", "create", "--repo", repo, name,
           "--color", color, "--description", description)


def create_issue(repo: str, title: str, body: str,
                 labels: list[str], assignee: str) -> str:
    args = ["issue", "create", "--repo", repo,
            "--title", title, "--body", body,
            "--label", ",".join(labels)]
    if assignee:
        args += ["--assignee", assignee]
    result = gh(*args)
    return result.stdout.strip() if result.returncode == 0 else f"error: {result.stderr.strip()}"


def parse_results(path: Path) -> list[dict]:
    data = json.loads(path.read_text())
    failed = []
    for suite in data.get("suites", []):
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                if test.get("status") != "passed":
                    error = ""
                    for result in test.get("results", []):
                        errors = result.get("errors", [])
                        if errors:
                            error = errors[0].get("message", "")[:500]
                    failed.append({
                        "title": spec.get("title", "unknown test"),
                        "file": spec.get("file", ""),
                        "status": test.get("status", "failed"),
                        "error": error,
                    })
    return failed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--results",   required=True)
    parser.add_argument("--pr-number", required=True)
    parser.add_argument("--pr-title",  default="")
    parser.add_argument("--pr-author", default="")
    parser.add_argument("--branch",    default="")
    parser.add_argument("--run-url",   default="")
    parser.add_argument("--repo",      required=True)
    parser.add_argument("--dry-run",   action="store_true")
    args = parser.parse_args()

    results_path = Path(args.results)
    if not results_path.exists():
        print(f"Results file not found: {results_path} — skipping.")
        sys.exit(0)

    failed = parse_results(results_path)
    if not failed:
        print("No failed tests — nothing to report.")
        sys.exit(0)

    print(f"Found {len(failed)} failed test(s).")

    ensure_label(args.repo, "arcqa",       "0075ca", "ArcQA test failure")
    ensure_label(args.repo, "smoke",       "bfd4f2", "L1 smoke test")
    ensure_label(args.repo, "invariant",   "e4e669", "L2 business invariant test")
    ensure_label(args.repo, "exploratory", "fbca04", "L3 exploratory / fault test")
    ensure_label(args.repo, "isolation",   "d93f0b", "L4 isolation / choreography test")

    pr_url = f"https://github.com/{args.repo}/pull/{args.pr_number}"
    created = 0

    for test in failed:
        layer_label, tier = classify_test(test["title"])
        tier_note = (
            "**Tier 2** — human review required before merge."
            if tier <= 2 else
            "**Tier 3** — senior review required."
        )

        title = f"QA: {test['title']} failed on {args.branch or args.pr_number}"
        body = (
            f"A Playwright test failed in CI.\n\n"
            f"**Test:** `{test['title']}`\n"
            f"**File:** `{test['file']}`\n"
            f"**Status:** {test['status']}\n"
            f"**PR:** [{args.pr_title or args.pr_number}]({pr_url})\n"
            f"**Branch:** `{args.branch}`\n"
            f"**CI run:** {args.run_url}\n\n"
            f"{tier_note}\n"
        )
        if test["error"]:
            body += f"\n**Error:**\n```\n{test['error']}\n```\n"

        if args.dry_run:
            print(f"  dry-run: {title}")
            continue

        result = create_issue(args.repo, title, body,
                              ["arcqa", layer_label], args.pr_author)
        print(f"  {test['title']}: {result}")
        if not result.startswith("error:"):
            created += 1

    print(f"\nDone. Created {created} issue(s).")


if __name__ == "__main__":
    main()
