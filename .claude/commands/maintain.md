---
description: Run the full maintenance cycle — update deps, audit, verify the CI gate, and open a chore PR
allowed-tools:
  - Skill
  - Bash(git checkout -b *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git push origin *)
  - Bash(git diff *)
  - Bash(gh pr create *)
  - Bash(npm run *)
  - Bash(npm test)
  - Bash(npm install)
---

One shippable maintenance cycle: update dependencies, fix vulnerabilities,
prove the CI gate is green, open a PR. Stop and report if a step makes the
next pointless. Never merge — the PR is mine to land.

## 1. Branch

Start from a clean `main`. If the working tree is dirty, stop and report.
Create `chore/maintenance-<YYYY-MM-DD>`.

## 2. Update

Invoke the `update-deps` skill and follow it to completion. If it reports
**nothing to update**, note that and continue — the audit step still runs.
If it ends with failing tests, follow its recommendation flow (revert the
culprit bump rather than shipping red); a held-back package is a finding for
the report, not a failure.

## 3. Audit

Invoke the `audit` skill and follow it to completion. Same rule: unresolved
force-only fixes are findings to report, never `--force` material.

## 4. Full gate

The skills above only run tests. Run the complete CI gate:
`npm run lint`, `npm run lint:files`, `npm run format:check`,
`npm run build`, `npm test`. All green or the cycle stops with the output
shown — don't edit tests or code to force a pass; report instead.

## 5. Ship

If nothing changed (no updates, no audit fixes), report that and stop —
no empty PR. Otherwise commit as `chore(deps): <summary>` (Conventional
Commits, no attribution/co-author lines), push the branch, and open a PR
with `gh pr create`. The body must carry the evidence: a table of version
bumps with majors flagged, audit results (found → fixed → remaining),
held-back packages with reasons, and the gate results.

## Report

End with: what was updated, what was fixed, what was held back or left
unresolved and why, the gate status, and the PR link. Be honest about
anything skipped.
