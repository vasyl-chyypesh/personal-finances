---
name: work-backlog
description: Work one item from BACKLOG.md end to end — claim it, explore the related code, write an implementation plan, implement on a branch, verify against the full CI gate, get a pr-review check, open a PR, and update the backlog. Use to work the backlog, pick up the next backlog item, or run the autonomous dev loop (e.g. via /loop work-backlog).
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
in order: **pick and claim** (Step 1), **explore** (Step 2), **plan**
(Step 3), **implement** (Step 4), **verify** (Step 5), **independent check**
(Step 6), **ship** (Step 7) — or take the **Blocked exit** when the rules
say so.

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

## Step 2 — explore

Map the terrain before touching code. Find the code and flow related to the
item (Grep/Glob/Read): the routes, services, repositories, and UI components
it will touch or sit next to (note `file:line` references), how the existing
flow works end to end, and the test patterns the nearest neighbors use. Read
the nested `CLAUDE.md` for each part of `src/` involved — layering, integer
cents, validation, i18n, naming all bind the plan. If nothing related exists,
say so explicitly and name the closest analog whose structure the new code
should follow.

The output is a short **context brief** — it feeds Step 3 directly. If
exploration reveals the item's **Done when** criteria don't match reality
(the feature half-exists, the described flow isn't how the app works), don't
reinterpret the item — go to *Blocked exit* for re-scoping.

## Step 3 — plan

Turn the brief into a concrete implementation plan before writing code: the
files to create or change, layer by layer; the test plan mapped to each
**Done when** criterion; and the E2E verification step for UI-facing items.
Scope guard: if the plan grows beyond the item's criteria, trim the plan,
not the criteria — extra ideas become new backlog items, not scope creep.

## Step 4 — implement

Follow the plan. Deviating from it is fine when the code teaches you
something the exploration missed — but note every deviation for the PR body.
Keep the diff small and focused on the item's **Done when** criteria. Tests
are part of the implementation, not an afterthought: integration tests
always; unit tests when there's real logic (project testing rules apply).

## Step 5 — verify (the gate)

Run the full CI gate locally:

```bash
npm run lint && npm run lint:files && npm run format:check && npm run build && npm test
```

For UI-facing items, also verify end to end with the `run-personal-finances`
skill (agent path): drive the real SPA and capture a screenshot proving the
**Done when** behavior.

On failure: fix and re-run. **Three** failed fix→gate cycles on the same item
means stop — go to *Blocked exit* below.

## Step 6 — independent check

Spawn the `pr-review` agent (local mode — it reviews the branch diff vs
`main`). Fix what it finds at Critical/High severity, re-run the gate, and
note lower-severity findings for the PR body. The agent is the checker; don't
argue findings away without evidence.

## Step 7 — ship

Commit the work in Conventional Commits style (`feat:`/`fix:`/`test:`; no
attribution or co-author lines). Push with `git push origin <branch>` (no
`-u` — the permission allow is prefix-matched on `git push origin`, and
`gh pr create` doesn't need the upstream link) and open the PR with
`gh pr create`. Recommend **squash-merge** in the PR body — the claim/done
bookkeeping commits shouldn't land in `main`'s history as separate commits.
The PR body must carry the evidence, not adjectives:
what changed and why, a short **Plan** section (the Step 3 plan plus any
deviations from Step 4), the **Done when** criteria and how each is met,
gate results, the pr-review outcome (including accepted lower-severity
findings), and the screenshot for UI items.

Then update `BACKLOG.md`: mark the item `[x] … — done — PR #<n>`, move it
under **Done**, and push that as a final `chore: mark backlog item done`
commit on the same branch so it rides the PR.

## Blocked exit

When the item can't proceed — three failed gate cycles, missing information,
**Done when** criteria that exploration showed don't match reality,
or a decision only the human can make — move it to **Blocked** in
`BACKLOG.md` with a one-line reason, commit as
`chore: mark backlog item blocked` and push what exists **only if the gate
is green**; otherwise leave the branch local and unpushed. Report
what blocked it and end the iteration (a blocked item ends a `/loop` run too
— the human unblocks before the loop restarts).

## Report

End every invocation with: the item worked, the branch, gate status, review
outcome, the PR link (or the Blocked reason), and what the queue looks like
now.
