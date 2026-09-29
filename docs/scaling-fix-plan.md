# Plan: Remove the GM coordination bottleneck

Status: DRAFT (for /plan-eng-review before build)
Author: operator + Claude, 2026-09-29
Repo: orchestraos (fleet on this machine, 13 seats)

## Problem (observed twice tonight, same root cause)
The GM is a single coordination hub: every seat reports to it, and it absorbs all
routing/synthesis. Two live failure modes resulted:
1. **Long-turn SLA breach** — GM ran a 17-min turn; the router delivers only at turn
   boundaries, so 9 reports queued past the 15-min SLA (`HOLD_SLA_S=900`) and spammed
   the operator with "HELD past SLA".
2. **Context-0% stall** — GM absorbed so much it filled its context window (0%
   remaining) and stalled entirely. A rotation gate exists (`ROTATION_TRIGGER_PCT=80`
   in `scripts/promote_successor.py`) but it only *permits* rotation ≥80%; nothing
   *initiates* it. The GM is meant to self-rotate via the reincarnation protocol, but
   a jammed GM never gets the free cycle — so it rode to 0%.

Root cause (validated hypothesis): **org design, not org size.** The GM is over span
of control (~13 effective reporters) and everything reports raw events straight to it.
Adding agents makes both failure modes worse.

> **CORRECTED by /plan-eng-review outside-voice 2026-09-29 (all claims verified in source).**
> Failure #2 was misdiagnosed. A rotation engine ALREADY EXISTS and is armed:
> `cron_beat.py` (*/15 beat) → `fleet.plan_fleet` (flock single-flight, hourly cap,
> cooldown, kill-switch) → `decide.py` (≥0.80 fraction = HARD → hard_rotate). It did NOT
> fire on the GM for three real reasons, none of which is "no initiator":
> 1. **Empty signal** — `collect.py` documents that the shared agent-status parser
>    returns `context_pct=''` for the `████ 86%` / `0% until auto-compact` bar formats,
>    so `decide()` noop'd the exact agents that should rotate. (collect.py already ships
>    a better parser `_parse`/`resolve_ctx_pct` — it just isn't feeding the live path.)
> 2. **T0/T1 are human-gated** — `decide._GATED_TIERS={"T0","T1"}`; a GM (T0) hard_rotate
>    sets `needs_approval`. The GM is NOT auto-rotatable by design.
> 3. **Conservative arming + cadence** — cron_beat runs `armed_tiers={"T2"}, soft_only=True`
>    every hard_rotate defers; and */15 may be too slow for a hub that goes 80%→0% inside
>    one window.
> Consequences: `context_pct` is a **0..1 fraction** (`tier()` classifies, ≥0.80=HARD) —
> a `>= 80` trigger never fires. And **auto-rotation does nothing for failure #1** (the
> SLA breach); only fan-in reduction (Part 2) shrinks that queue.

## Goal
The org runs under load without the GM stalling — no 0% context stalls, no SLA-breach
spam — so we can then scale horizontally (more accounts/machines) on a sound topology.

## Design — build in this order (CORRECTED after outside-voice review)

The original plan (a new auto-rotate beat) duplicated the existing `cron_beat`/`fleet`/
`decide` engine and misdiagnosed the root cause. Corrected sequence — **topology first,
signal-fix second, no new beat**:

### Part A — Topology (build FIRST; treats the cause; the only fix for failure #1)
Prompt-only, no signal needed. Cuts the GM's fan-in and context-fill rate at the source.
- **Fan-in reduction [Part 2]:** workers report to their T1 lead; leads send the GM
  consolidated digests, not raw events (~4× less GM inbound). Edits: `plan.md`/`build.md`/
  `review.md` (aggregate your pod, digest up) + worker prompts (report to your lead).
- **EA inbox buffer [Part 3]:** GM's inbound flows through `ea`, which triages/batches and
  hands up decisions. `ea.md` already frames this; make it the default path.
- **Autonomy by exception [Part 4]:** leads run pods without narrating every step; GM pulls
  status (push→pull). Edits: gm.md (already has bounded-turns) + lead prompts.
- **Metric [F5]:** before/after, instrument GM inbound msgs/hour and GM context-fill-rate
  (fraction/hour). Without it we can't tell the topology change worked.

### Part B — Fix the context signal in the EXISTING chain (not a new capture path) [F1/M2/M5]
The rotation engine already exists and is armed for T2 soft handoffs; it noop'd because
the shared agent-status parser returns `context_pct=''` for the `████ 86%` / skull bar
formats. `collect.py` already ships the fix parser (`_parse`, `resolve_ctx_pct`).
- **Do:** make `collect.resolve_ctx_pct` (or its bar-parser) the value `decide()` reads —
  diagnose why the empty string still reaches the live path and route the working parser in.
- **Pin direction [M5]:** the pipeline treats the number as **used fill** (calibrated
  690k tok → bar 86%; `tier ≥0.80` = HARD). Confirm the scraped value is *used*, not
  remaining, at the INPUT — an inverted sign makes an 86%-full seat read 14% and never rotate.
- **Verify empirically [M6]:** `ctxstate.effective_ceiling` warns recalibration "is not
  possible while no pane renders a context bar." Confirm a bar actually renders before
  relying on the scrape; if it doesn't, the jsonl_tokens/ceiling fallback is the signal.
- **Acceptance:** `decide()` classifies a busy seat as SOFT/HARD (not `unknown`) on live data.

### Part C — Reassess the rotation engine (only after A + B; likely small or nothing)
With fan-in cutting fill rate (A) and the signal fixed (B), the existing engine revives.
Then decide, per evidence, whether anything more is needed:
- **Do NOT build a new beat.** Reuse `cron_beat`/`fleet`/`decide`.
- **The GM (T0) stays human-gated** — `_GATED_TIERS={"T0","T1"}` is a deliberate safety
  invariant. Do not auto-rotate the GM. Its protection is the lower fill rate (A) plus the
  existing one-tap approval card when it does hit HARD.
- **Candidate levers (evaluate, don't assume):** arm hard_rotate for T2 survival (currently
  soft_only), and/or tighten cadence for the hub (a T0 can go 80%→0% inside the */15 window).
  Each is a change to a deliberately conservative default — justify against evidence.
- **Units [M4]:** any threshold uses the 0..1 fraction via `tier()`, never `>= 80`.

### Part 2 — Fan-in reduction (biggest load win, prompt-level)
Workers report to their T1 lead, not the GM. Leads send the GM **consolidated digests**,
not raw per-event reports. Cuts GM inbound ~4× (branching factor). Prompt changes to
`plan.md`/`build.md`/`review.md` (leads: aggregate your pod, report digests up) and the
worker prompts (report to your lead, not gm).

### Part 3 — EA as inbox buffer (prompt-level)
GM's raw inbound flows through `ea`: it triages/batches and hands the GM *decisions*,
not a stream. `ea.md` already frames this; make it the default path and point leads'
digests at ea for consolidation.

### Part 4 — Autonomy by exception (prompt-level)
Leads run their pods without narrating every step; the GM pulls status when it wants it
(push→pull). Prompt changes in gm.md (already has bounded-turns) + lead prompts.

> NOTE: the "Part 2/3/4" subsections above are folded into **Part A** in the corrected
> design. The single-source content is Parts A/B/C; treat 2/3/4 as their detail.

## Data flow (after Part A)
worker → (report) → lead → (digest) → ea → (triaged decisions) → gm → operator
existing cron_beat/decide → reads FIXED signal → SOFT/HARD handoff per `tier()` (T2 only;
T0/T1 stay human-gated)

## Tests
- Part A (topology): a metric harness asserting GM inbound msgs/hour and context-fill-rate
  drop after the prompt changes (the F5 success signal).
- Part B (signal): `resolve_ctx_pct` parses the `████ 86%` and `0% until auto-compact`
  bar formats → correct 0..1 fraction; empty/no-bar → jsonl fallback → None only when
  truly unknown. `decide()` classifies a busy seat non-`unknown` on live data.
- Reuse existing `fleet`/`decide` unit tests for rotation guards — do NOT rewrite them.
- Part C (if pursued): any cadence/arming change carries a regression test that the T0/T1
  human-gate still holds (needs_approval on a T0 hard_rotate).

## Rollout
1. **Part A first** — ship topology prompt changes incrementally with the F5 metric;
   confirm GM fill-rate + SLA breaches drop. This is the real fix and the only thing that
   helps failure #1.
2. **Part B** — fix the signal feed; confirm `decide()` sees live SOFT/HARD.
3. **Part C** — reassess: with A+B done, is any engine change even needed? If yes, justify
   each cadence/arming change against evidence; never touch the T0/T1 gate.

## Out of scope (later, separate CEO review)
Horizontal scale (2nd account / VPS pods), the quota ceiling, the delivery-model rewrite
(pull vs push). This plan makes the single-node topology sound first.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | /plan-eng-review | Lock architecture before build; user wanted it properly engineered | 1 | resolved | F1 context signal empty on live seats (P0); F2 rotate blocking/slow; F3 reuse canonical idle judge; F4 signal semantics; F5 no success metric; F6 no rotation cap |
| Outside Voice | native Plan subagent (codex model_unusable) | Default-on second model; find what the review missed | 1 | resolved | M1 rotation engine ALREADY EXISTS (cron_beat/fleet/decide) — Part 1 reinvented it; M2 real root cause is the documented parser noop, not "no initiator"; M3 GM is T0 human-gated, not auto-rotatable; M4 context_pct is a 0..1 fraction (`>=80` never fires); M5 signal-direction unpinned at input; M6 pane-bar-renders assumption may be false; M7 cadence is the lever; M8 topology must precede rotation |

**VERDICT: REVISE BEFORE BUILD → revised.** Corrected in place: dropped the new beat
(reuse existing `cron_beat`/`fleet`/`decide`), re-labeled the root cause (starved parser,
not missing initiator), resequenced topology (Part A) ahead of the signal fix (Part B) and
any engine change (Part C), pinned 0..1 fraction units, locked the T0/T1 human-gate as an
invariant (the GM is not auto-rotated).

**OUTSIDE COVERAGE:** codex unavailable (`model_unusable`: account can't use `gpt-6-astra`;
fix `GSTACK_CODEX_MODEL=<supported>`). Native Plan-subagent fallback ran and found the
decisive M1-M8 (all verified in source).

**UNRESOLVED DECISIONS:**
- Part C scope: after Part A+B, whether to also arm hard_rotate for T2 and/or tighten hub cadence, or stop at topology + signal fix — deferred to post-A/B evidence.
