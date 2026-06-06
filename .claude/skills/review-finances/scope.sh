#!/usr/bin/env bash
# Gather review scope for the personal-finances repo.
#
# Prints, for the changes on the current branch (vs a base, default `main`,
# plus any uncommitted working-tree changes):
#   - the diffstat and the full unified diff
#   - which architectural layers were touched (Routes / Services / Repos / …)
#   - project-specific risk flags worth a closer look during review
#
# Usage:
#   .claude/skills/review-finances/scope.sh [base-ref]      # default base: main
#   .claude/skills/review-finances/scope.sh <PR-number>     # via gh, if numeric
#
# It only collects and flags — the reviewing agent does the actual judgement
# using SKILL.md. Output is plain text meant to be read top-to-bottom.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BASE="${1:-main}"

# If the arg is a bare number, treat it as a GitHub PR and check it out via gh.
if [[ "$BASE" =~ ^[0-9]+$ ]]; then
  echo "## Reviewing GitHub PR #$BASE"
  gh pr checkout "$BASE"
  BASE="$(gh pr view "$BASE" --json baseRefName -q .baseRefName)"
fi

RANGE="${BASE}...HEAD"

echo "## Scope"
echo "base=$BASE  head=$(git rev-parse --abbrev-ref HEAD)  merge-base=$(git merge-base "$BASE" HEAD | cut -c1-12)"
echo

echo "## Changed files (committed vs $BASE)"
git diff --stat "$RANGE" || true
echo
WT="$(git status --porcelain --untracked-files=no)"
if [[ -n "$WT" ]]; then
  echo "## Uncommitted working-tree changes (also review these)"
  git diff --stat
  echo
fi

# --- Layer / area classification -------------------------------------------
files="$(git diff --name-only "$RANGE"; git diff --name-only)"
files="$(echo "$files" | sort -u | sed '/^$/d')"

classify() { echo "$files" | grep -E "$1" || true; }
echo "## Layers touched"
for pair in \
  "Routes (HTTP/validation):src/api/.*\.routes\.ts" \
  "Schemas (Zod input):src/api/.*\.schema\.ts" \
  "Services (business logic):src/api/.*\.service\.ts" \
  "Repositories (SQL):src/api/.*\.repository\.ts" \
  "Shared/middleware/db:src/api/shared/" \
  "UI (React):src/ui/" \
  "CLI importer:src/cli/" \
  "Tests:(__tests__/|\.test\.ts)"; do
  label="${pair%%:*}"; pat="${pair#*:}"
  hits="$(classify "$pat")"
  [[ -n "$hits" ]] && printf '  %-28s %s\n' "$label" "$(echo "$hits" | tr '\n' ' ')"
done
echo

# --- Project-specific risk flags -------------------------------------------
echo "## Risk flags (heuristics — confirm by reading the diff)"
flag() { echo "  [!] $1"; }

# A service or repo changed but no test file changed → integration tests are required here.
if echo "$files" | grep -qE 'src/api/.*\.(service|repository)\.ts$' \
   && ! echo "$files" | grep -qE 'src/api/.*__tests__/.*\.test\.ts$'; then
  flag "Service/Repository changed but no API test touched — CLAUDE.md requires integration tests."
fi

# Repository changed: check for string interpolation into SQL near user data.
if echo "$files" | grep -qE 'src/api/.*\.repository\.ts$'; then
  if git diff "$RANGE" -- '*.repository.ts' | grep -qE '^\+.*(prepare|exec)\(`?[^`]*\$\{'; then
    flag "Possible SQL built with template interpolation in a repository — verify only column names (never values) are interpolated; values must be ? placeholders."
  fi
  if git diff "$RANGE" -- '*.repository.ts' | grep -qE '^\+.*\b(UPDATE|DELETE)\b' \
     && ! git diff "$RANGE" -- '*.repository.ts' | grep -qiE 'transaction'; then
    flag "New UPDATE/DELETE in a repository — check for multi-statement read-modify-write that should be wrapped in db.transaction()."
  fi
fi

# console.* slipped into committed code (logger rule).
if git diff "$RANGE" | grep -qE '^\+\s*console\.'; then
  flag "console.* added — use Logger (API) / remove (UI). ESLint no-console will fail the commit hook."
fi

# New string field in a schema without a .max() bound.
if echo "$files" | grep -qE '\.schema\.ts$'; then
  if git diff "$RANGE" -- '*.schema.ts' | grep -qE '^\+.*z\.string\(\)' \
     && ! git diff "$RANGE" -- '*.schema.ts' | grep -qE '^\+.*\.max\('; then
    flag "z.string() added without .max() — unbounded text field (only the 100kb body cap stops it). Confirm a length bound is intended."
  fi
fi

# Money handling outside the cents helpers.
if git diff "$RANGE" | grep -qE '^\+.*(parseFloat|toFixed\(2\)|\* 100|/ 100)\b'; then
  flag "Manual money math (×/÷100, toFixed) in the diff — amounts are integer cents; prefer money.ts helpers and check rounding."
fi

# better-sqlite3 is synchronous; an await between two DB calls breaks atomicity.
if git diff "$RANGE" -- 'src/api/**/*.service.ts' | grep -qE '^\+.*\bawait\b'; then
  flag "await added in a service — better-sqlite3 is synchronous; an await between two DB reads/writes opens a real TOCTOU window. Verify intent."
fi

echo
echo "## Full diff (committed vs $BASE)"
git --no-pager diff "$RANGE"
if [[ -n "$WT" ]]; then
  echo
  echo "## Full diff (uncommitted)"
  git --no-pager diff
fi
