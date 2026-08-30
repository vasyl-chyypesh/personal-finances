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

- [ ] **Show inverse (foreign→UAH) rate on the currency list** — the
      Currencies page (`CurrenciesPage.tsx` / `CurrencyListItem.tsx`) shows only
      `rates[base][code]`, i.e. how much USD/EUR 1 UAH buys (`0.0223`, labeled
      "per 1 UAH"). Each non-base row should show **both** directions: the
      existing `1 UAH = X USD` line _and_ an inverse `1 USD = Y UAH` line. No
      API or math change is needed — the response already carries the full
      pairwise matrix, so the inverse is `rates[code][base]`
      (`ExchangeRatesResponse.rates`); pass it into `CurrencyListItem` and
      render both lines. Add i18n keys for the inverse label in both `en` and
      `uk` (`src/ui/i18n/messages.ts`; the `rateValue`/`rateVsBase` keys are the
      model). Scope is the **list rows only** — leave the rate-history chart's
      direction unchanged. Format the (larger) inverse value with sensible
      precision, not necessarily the list's fixed 4 decimals.
      Done when: each foreign-currency row renders both `1 {base} = … {code}`
      and `1 {code} = … {base}` using values from the existing matrix (no new
      endpoint); the base (UAH) row is unaffected; both `en` and `uk` have the
      new label with no missing-key gaps; a `run-personal-finances` headless
      run shows both directions on the Currencies page; and lint/build/test are
      green.

## Blocked

_None yet._

## Done

_None yet._
