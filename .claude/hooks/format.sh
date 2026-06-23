#!/usr/bin/env bash
# PostToolUse hook: format the just-edited file with Prettier.
#
# Stdin carries the tool payload as JSON; we format only the edited file,
# honoring .prettierignore (so .claude/ stays hand-tuned) and skipping
# unsupported file types via --ignore-unknown. This closes the gap noted in
# src/ui/CLAUDE.md: the husky pre-commit hook runs ESLint but NOT Prettier,
# so unformatted files otherwise slip through to CI's `format:check`.
#
# Best-effort only: always exits 0 so a formatting hiccup never blocks an edit.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$PWD}"
file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0

bin="$root/node_modules/.bin/prettier"
[ -x "$bin" ] || bin="npx --no-install prettier"

( cd "$root" && $bin --write --ignore-unknown --log-level warn "$file" ) >/dev/null 2>&1 || true
exit 0
