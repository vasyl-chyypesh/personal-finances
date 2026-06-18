---
description: Update dependencies to their latest versions, install, enforce exact pins, and verify tests still pass
allowed-tools: Bash(npx npm-check-updates*), Bash(npm install), Bash(npm test), Bash(git diff package*.json)
---

Update dependencies to their latest versions (including breaking majors), install
them, and confirm nothing broke. Stop and report if a step makes the next
pointless.

## 1. Bump versions

Run `npx npm-check-updates -u`. If it reports **nothing to update**, report that
and stop. Otherwise note which packages changed and which jumps are
semver-major (potentially breaking).

## 2. Install

Run `npm install` to apply the new versions and refresh the lockfile.

## 3. Enforce exact pins

Project rule: `dependencies` must stay pinned to exact versions. `ncu` preserves
existing range prefixes, so check `package.json` and strip any `^`/`~` from
`dependencies` entries, pinning each to the exact installed version. (`devDependencies`
may keep caret ranges.) Re-run `npm install` if you edited `package.json`.

## 4. Verify

Run `npm test`. If green, report success. If it fails, show the output, don't
edit tests to pass, name the likely culprit bump, and recommend reverting
(`git checkout package.json package-lock.json && npm install`) or fixing the
breakage — my call.

## Report

Show `git diff package.json package-lock.json` so the version bumps are visible,
then end with: packages updated (with major bumps flagged), pins enforced, and
the test result. Be honest about anything skipped or left unresolved.
