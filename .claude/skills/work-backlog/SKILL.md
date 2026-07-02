---
name: work-backlog
description: Work one item from BACKLOG.md end to end — claim it, implement on a branch, verify against the full CI gate, get a pr-review check, open a PR, and update the backlog. Use to work the backlog, pick up the next backlog item, or run the autonomous dev loop (e.g. via /loop work-backlog).
---

# work-backlog

One invocation = **one backlog item**, taken from claim to open PR. The queue
and all state live in `BACKLOG.md` at the repo root — read its **Item format**
section first; this skill follows that protocol exactly. Run it once for a
single item, or drive it repeatedly with `/loop work-backlog` to work through
the queue.

## Usage

Invoked by description or as `/work-backlog` — ask to work the backlog, pick
up the next backlog item, or run the dev loop. Work through the steps below
in order: **pick and claim** (Step 1), **implement** (Step 2), **verify**
(Step 3), **independent check** (Step 4), **ship** (Step 5) — or take the
**Blocked exit** when the rules say so.

## Hard rules

These apply before anything else:

- Never work on `main`; never push to `main`; never merge — PRs are the
  boundary, the human lands them.
- Never pick an item tagged `(placeholder)`.
- Never weaken, skip, or delete a test to make the gate pass. If a test seems
  wrong, that's a Blocked reason, not an edit.
- Never touch the production database: no writes via `sqlite-prod`, and don't
  point `DB_PATH` at `finance.db` in tests.
- One loop at a time — this protocol has no claim arbitration for parallel
  runs.

## Step 1 — pick and claim

Read `BACKLOG.md`. Resume rules first: if the current branch is a work branch
whose item is marked `[~]`, resume that item at whatever step it stopped.
Otherwise require a clean tree on `main` (dirty → stop and report; don't
stash someone's work).

Pick the **topmost `[ ]` item in Queue** that is not `(placeholder)`. If
there is none, report "queue empty" and **end — including ending any `/loop`
(no next iteration)**. Don't invent work.

Create a branch named for the item (`feat/…` or `fix/…`), then mark the item
`[~]` with the branch name and today's date, and commit just that edit as
`chore: claim backlog item <title>`.

## Step 2 — implement

Read the nested `CLAUDE.md` for each part of `src/` you touch **before**
writing code, and follow it: layering, integer cents, validation, i18n,
naming. Keep the diff small and focused on the item's **Done when** criteria —
scope creep is a bug. Tests are part of the implementation, not an
afterthought: integration tests always; unit tests when there's real logic
(project testing rules apply).

## Step 3 — verify (the gate)

Run the full CI gate locally:

```bash
npm run lint && npm run lint:files && npm run format:check && npm run build && npm test
```

For UI-facing items, also verify end to end with the `run-personal-finances`
skill (agent path): drive the real SPA and capture a screenshot proving the
**Done when** behavior.

On failure: fix and re-run. **Three** failed fix→gate cycles on the same item
means stop — go to *Blocked exit* below.

## Step 4 — independent check

Spawn the `pr-review` agent (local mode — it reviews the branch diff vs
`main`). Fix what it finds at Critical/High severity, re-run the gate, and
note lower-severity findings for the PR body. The agent is the checker; don't
argue findings away without evidence.

## Step 5 — ship

Commit the work in Conventional Commits style (`feat:`/`fix:`/`test:`; no
attribution or co-author lines). Push with `git push -u origin <branch>` and
open the PR with `gh pr create`. The PR body must carry the evidence, not
adjectives: what changed and why, the **Done when** criteria and how each is
met, gate results, the pr-review outcome (including accepted lower-severity
findings), and the screenshot for UI items.

Then update `BACKLOG.md`: mark the item `[x] … — done — PR #<n>`, move it
under **Done**, and push that as a final `chore: mark backlog item done`
commit on the same branch so it rides the PR.

## Blocked exit

When the item can't proceed — three failed gate cycles, missing information,
or a decision only the human can make — move it to **Blocked** in
`BACKLOG.md` with a one-line reason, commit and push what exists **only if
the gate is green**; otherwise leave the branch local and unpushed. Report
what blocked it and end the iteration (a blocked item ends a `/loop` run too
— the human unblocks before the loop restarts).

## Report

End every invocation with: the item worked, the branch, gate status, review
outcome, the PR link (or the Blocked reason), and what the queue looks like
now.
