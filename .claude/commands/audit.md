---
description: Audit installed dependencies for vulnerabilities, apply fixes, and verify tests still pass
allowed-tools: Bash(npm audit), Bash(npm audit fix), Bash(npm test), Bash(git diff package*.json)
---

Audit dependencies for vulnerabilities, apply safe fixes, confirm nothing broke.
Stop and report if a step makes the next pointless.

## 1. Find

Run `npm audit`. If **0 vulnerabilities**, report that and stop. Otherwise
summarize counts by severity and whether each fix is non-breaking or `--force`.

## 2. Fix

Run `npm audit fix` (never `--force` — it can install breaking majors; list
force-only fixes as "needs a manual major upgrade"). Re-run `npm audit` and note
what remains and why. Show `git diff package.json package-lock.json`. Project
rule: `dependencies` must stay pinned to exact versions — if a fix added a
`^`/`~` range there, pin it back.

## 3. Verify

Run `npm test`. If green, report success. If it fails, show the output, don't
edit tests to pass, name the likely cause, and recommend reverting
(`git checkout package.json package-lock.json && npm install`) or fixing — my call.

## Report

End with: vulnerabilities found → fixed → remaining, plus the test result. Be
honest about anything skipped or unresolved.
