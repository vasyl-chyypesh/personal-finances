# Backlog

Work queue for the autonomous dev loop. The `work-backlog` skill
(`.claude/skills/work-backlog/SKILL.md`) picks the top unclaimed item from
**Queue**, implements it on a branch, verifies it against the full CI gate,
has it reviewed by the `pr-review` agent, opens a PR, and records the result
here. This file is the loop's only memory between runs — keep it accurate.

## Item format

- Every item needs a short title and a **Done when:** line with
  machine-checkable acceptance criteria (tests, lint, observable behavior).
  Items without verifiable criteria belong in **Blocked**, not **Queue**.
- Status is tracked with the checkbox and an annotation:
  - `- [ ]` — up for grabs.
  - `- [~]` — claimed; annotate with the branch name and start date.
  - `- [x]` — done; annotate with the PR link, then move under **Done**.
- Items tagged `(placeholder)` demonstrate the format and are **never picked
  by the loop** — replace them with real work before starting it.

## Queue

- [ ] **Monthly spending summary endpoint** `(placeholder)` — add
      `GET /api/summary/:month` returning per-category totals for the month,
      in integer cents, following the Routes → Services → Repositories
      layering.
      Done when: integration tests cover an empty month and a month with
      seeded multi-category entries, totals are exact integer cents, and
      lint/build/test are green.
- [ ] **Export ledger to CSV** `(placeholder)` — add a UI action on the
      ledger page that downloads the current entries as a CSV file.
      Done when: the button renders on the ledger page, a headless-driver
      run downloads a CSV whose rows match seeded entries, and
      lint/build/test are green.

## Blocked

- [ ] **Multi-currency budgets** `(placeholder)` — blocked: needs a decision
      on which currency the budget totals are stored in before acceptance
      criteria can be written.

## Done

- [x] **Example finished item** `(placeholder)` — done — PR #0.
