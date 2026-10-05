# Astro-Trading Algo: MVP Plan — Gann "Time = Price Squared" v1

- **Requested by:** operator, via gm (msg_c2cb1a4f_69084370). Operator is
  asleep — no rush decision needed from them; build this properly and
  report in the morning, same as last cycle.
- **Grounded in:** bshr's full research
  (`$ORCHESTRA_DIR/state/bshr/gann-time-price-squared-20261005/answer.md`,
  read in full) and the actual Bradley v1 code already committed at
  `~/conductor/repos/astro-trading-backtest` (commit `7141ad2`) — read
  directly to confirm what's genuinely reusable here, not assumed.
- gm asked for two specific hard problems to be built into the plan
  explicitly, not smoothed over. Both are addressed below as the plan's
  central decisions, not footnotes.

## Constraint 1: there is no single settled formula — this plan commits to one named source, as a stated assumption, not "the" Gann method

bshr found four non-equivalent variants in circulation and confirmed (by
actually computing both and comparing) that at least two of them —
Carl Futia's published formula and the Square-of-Nine spiral geometry —
disagree by 45–170° on identical inputs. That's a real, structural
disagreement between sources, not a notation difference.

**Decision: this plan commits to `stocks3127-droid/geometric-trading`'s
`engine/gann/square_of_nine.py` + `timing.py` as the single source of
truth**, for the same reason Bradley v1 committed to
`NQevxvEtg/Bradley-Siderograph` — it's the only one of the candidates
bshr could verify against a cited, worked example (bshr hand-reproduced
its "Rule 134" worked example, center=496, and it checked out to within a
last-digit rounding convention). This is a modeling assumption, stated
here in writing, not a claim that this is "the" authoritative Gann method.
If build finds the reference code itself disagrees with bshr's
description of it in any way (exactly what happened twice during Bradley
v1 — the D-factor body pair and the X multiplier both turned out
different in the actual code than in the secondary description), **the
reference code wins, the same instruction that governed Bradley v1.**

## Constraint 2: the pivot is a real free parameter — this plan pre-commits a mechanical rule before any backtest runs

Both core functions require a `center` (a price/date pivot), and the only
guidance given anywhere is "set it to a major low/high" — not a
mechanical definition. Bradley v1 had zero free parameters; this
technique has one, and it's a continuous knob that can silently steer
results if left to be chosen after looking at data. This needs resolving
in the plan, in writing, before build starts — not left to build's
judgment at implementation time.

**Decision: v1 uses a single, global pivot — the lowest daily close over
the full available SPX history (1927–2026, same instrument Bradley v1
validated Layer 1 against).** Reasoning:

- It's computed exactly once, from data already fully determined before
  any test window — there is no way to re-pick it after seeing a result,
  which is the entire point of pre-committing it.
- It literally satisfies the only rule given ("a major low") — the
  all-time low of the full dataset is unambiguously major.
- It's the simplest rule that has zero remaining judgment calls, matching
  Bradley v1's "nothing to choose" discipline as closely as this
  technique structurally allows.

**Named tradeoff, not hidden:** a single 99-year-old pivot means the
day-count side of the formula (`degrees_position`) computes enormous
elapsed-day values for any modern date, which the sqrt transform
compresses but doesn't eliminate — this may make the time/price
degree-matching mechanism behave differently (likely less sensitive) for
recent dates than Gann's own practice, which typically used closer,
more-recent pivots. That's a real limitation of choosing the most
objective rule over the most "authentic" one. **Explicitly deferred to
v1.1, not v1:** a mechanically-defined *rolling* local pivot (e.g. "the
lowest close in the trailing 252 trading days as of each test date") —
this is worth trying only if the single-global-pivot version shows
nothing, since a rolling pivot reopens more surface area for the rule
itself to be second-guessed and should only be reached for after the
simpler version has run.

## What's already reusable from Bradley v1 — confirmed by reading the actual code, not assumed from the module names

```
REUSABLE AS-IS (read turns.py directly to confirm this):
  turns.py  -- price_turns(), hit_rate_vs_chance(), and the full
               chance-baseline machinery are signal-agnostic. They take
               ANY predicted-turns DatetimeIndex and score it against
               real price turns. Only bradley_turns() itself (the
               Bradley-specific extrema detector) doesn't carry over --
               everything else in this file (price turn definition,
               +/-4 day tolerance, 1000-trial chance baseline) is exactly
               the scoring infrastructure Gann's turns need too.
  harness.py, stats.py -- same story as Bradley: Layer 2 (Sharpe/
               drawdown/win_rate vs. buy-and-hold) just needs a Gann
               turn-following position rule as the signal_fn, mirroring
               bradley.py's turn_following_positions() pattern.
  prices.py -- SPX history already cached/fetchable, no change needed.

NOT NEEDED AT ALL (a real simplification vs. Bradley):
  ephemeris.py -- Gann's time=price-squared is pure price + calendar-day
               arithmetic. No planetary positions, no declination, no
               astronomical data of any kind. This is numerologically
               "astro-adjacent" in spirit (degree-wheel framing) but
               structurally has nothing to do with the sky. Confirmed by
               reading bshr's formula kernel directly -- sqrt(center) and
               sqrt(day-count), nothing else.
```

## Concrete build scope

1. **New `gann.py` module**, ported from `stocks3127-droid`'s actual
   code (not bshr's description of it, per Constraint 1):
   `price_at_degree(center, degrees)`, `degrees_position(x, center)`, and
   the turn-signal rule — a predicted turn fires when a date's degree and
   the price's degree land within the reference repo's own stated
   tolerance (bshr found ~2° cited) on the same wheel.
2. **Pivot, hardcoded once, per Constraint 2:** the lowest daily SPX close
   over the full available history, computed once at module load, used
   for every date in the backtest — not recomputed, not reselected.
3. **`gann_turns()` function, mirroring `bradley_turns()`'s shape** — feed
   its output straight into the existing `hit_rate_vs_chance()` in
   `turns.py`, unmodified.
4. **Turn-following position rule**, mirroring
   `turn_following_positions()` — flip exposure at each Gann turn, flat
   between, pre-committed before any result is seen (same discipline as
   Bradley v1's position rule).
5. **Unit tests against the reference repo's own worked example**
   (center=496, the Rule 134 case bshr already hand-verified) — same
   pattern as `tests/test_bradley_vs_reference.py`, so the port is
   checked against source, not just "runs without crashing."

## Success metrics — same two-layer structure as Bradley, most of the scoring code is literally the same functions

```
LAYER 1 (the falsifiable claim itself):
  Does a Gann time/price-degree match predict a real SPX price turn
  within +/-4 calendar days, at a rate better than chance?
  -> turns.py's hit_rate_vs_chance(), unmodified, fed gann_turns()
     instead of bradley_turns(). Same chance-baseline methodology
     (1000 random-date trials, same count as predicted turns).

LAYER 2 (the returns question gm asked for explicitly):
  Sharpe ratio, max drawdown, win_rate vs. plain buy-and-hold, on SPX
  -> harness.py + stats.py, unmodified, fed the Gann turn-following
     position rule as signal_fn.
```

## Expectation, stated up front per bshr's and gm's explicit instruction

**A null result here is at least as likely as Bradley's, arguably more
likely**, for two concrete reasons, not a vague hedge: (1) this technique
has a real free parameter where Bradley had none, even with that
parameter pre-committed before any test; (2) the formula itself isn't
cross-source-settled the way Bradley's was once the reference code
resolved its one ambiguity — committing to one named source doesn't
manufacture agreement that doesn't exist, it just makes the test
honestly reproducible. If this comes back null, that's a complete,
useful answer about this specific pre-committed formula and pivot rule —
not a failure to report quietly. Bradley v1 itself already set this
precedent: its own Layer 2 result was a clear underperformance vs.
buy-and-hold on all three instruments, reported plainly in its README
rather than reframed.

## What's explicitly NOT in this plan

- **The rolling local-pivot variant** — named above as v1.1, only worth
  attempting if the single-global-pivot version shows something real
  first (same "cheaper/more mechanical signal first" discipline bshr
  applied to the original Gann-vs-Bradley-vs-Jenkins ranking).
- **Carl Futia's formula, or any other of the four variants bshr found** —
  not implemented, not blended, not used as a cross-check inside this
  plan. If a future pass wants to test whether the formula choice itself
  matters, that's a separate, explicitly-scoped comparison, not a silent
  substitution here.
- **Jenkins' IPO-date "origin point" as the pivot rule** — bshr-2 (chasing
  the separate "ipcycle" identification question) confirmed this is real,
  documented Jenkins terminology: his material describes using a stock's
  IPO date as the origin point for projecting planetary/Gann cycles. It's
  exactly the kind of objective, mechanical pivot rule Constraint 2 above
  needs — but it doesn't solve that constraint for any instrument actually
  in this plan, since none of SPX/gold/EUR-USD has an IPO date. Worth
  recording as the natural pivot rule IF this ever extends to individual
  stocks, not adopted here. Also worth naming the same caveat that applies
  to the rest of Jenkins' material: his exact origin-point definition is
  likely proprietary and undocumented, so — unlike the global-low pivot
  used above — it may not be independently verifiable against open source
  the way Bradley's reference was.

## What to tell the operator, in the morning

Scoped and ready to dispatch, same shape as Bradley v1: one new module
(`gann.py`), reusing most of Bradley v1's scoring infrastructure
unchanged (`turns.py`'s hit-rate-vs-chance scorer is signal-agnostic,
confirmed by reading it), and actually simpler on the data side since
this technique needs no planetary ephemeris at all — just price and
calendar-day counting. Two hard calls made explicit rather than left
implicit: which of four disagreeing formula variants to use (committing
to the one with a verifiable worked example, documented as an assumption,
not fact), and how to pick the required pivot price/date (a single
global all-time-low, chosen for having zero remaining judgment calls,
with the known tradeoff — degree-wheel staleness for recent dates — named
rather than hidden). Going in with the expectation, stated by bshr and
repeated here, that a null result is at least as likely as Bradley's own
honestly-reported underperformance — that's not a reason to skip this,
it's what "try it and see" means when done honestly.
