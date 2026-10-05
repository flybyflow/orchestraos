# Astro-Trading Algo: MVP Plan — #44 "Secret Angle Method" (Half/Third/Quarter/Eighth-Angle Harmonics)

- **Requested by:** operator, via gm (msg_14b1ffe4_4165813) — "finalize
  with one fraction choice... this should be ready to scope now."
- **Grounded in:** bshr's page-level read of the BIDU worked example
  (p.32), which resolved the two axes I flagged as unresolvable from the
  earlier one-line summary, plus a new numeric check run specifically for
  this plan (below) that the dispatch didn't anticipate.

## Three axes, now all resolved — two from bshr's page read, one by revising my own earlier guess against better evidence

**1. ANCHOR — resolved, not arbitrary.** Both the main angle and every
sub-angle line are drawn from the **same single origin point** (the
impulse's own starting low) — confirmed directly from the BIDU example,
not invented.

**2. RETRACEMENT STYLE — resolved, not arbitrary.** The retracement grid
is sized to the **sub-angle's own price range**, not the full original
impulse range — confirmed by the book's own caption ("price retracements
of that amount," referring to the sub-angle) and consistent with the
book's general statement elsewhere (p.11: "a price retracement grid from
the high to the 1/2 angle point").

**3. FRACTION — resolved by revising my own earlier position, not by
picking between the two options as presented.** My original #44
determination (msg_b2d943c6_3487834) proposed divide-by-2 as the
pre-committable default, reasoning from the technique's informal name
("half-angle harmonic method"). **That reasoning is now superseded by
better evidence and should be corrected, not defended:** bshr's page
read shows the book's own clearest, fully-verified worked example (the
same BIDU/p.32 instance that resolved axes 1 and 2) uses **1/3**, not
1/2. Anchoring all three axes to the one single verified example is more
internally consistent than anchoring two axes to that example and the
third to a vaguer "commonly-cited" or name-derived justification — the
exact mistake already caught and corrected once this session (Jenkins-
triangle's C-value: "more commonly cited" lost to "verified from the
book's own stated inputs"). **Decision: 1/3.**

**Honest residual risk, not fully resolved by this choice:** anchoring
1/3 to a real worked example answers "can this be pre-committed
non-arbitrarily" (yes), but doesn't fully answer the book's own p.30
admission that fraction choice is *itself* the fishing risk — 1/3 may
have been the fraction the author found fit BIDU specifically, from
trying several. **Mitigation: run 1/3 as the pre-committed PRIMARY test,
and 1/2, 1/4, 1/8 as a SECONDARY, Bonferroni-corrected exploratory
check** — the same primary/secondary, corrected-multiple-comparisons
design Jenkins-triangle already used and validated this session (its
own just-landed result showed exactly why: a clean null on the
corrected primary bar, a misleadingly-positive-looking uncorrected
secondary number). Reusing a design this project has already proven
catches real false positives, not inventing a new one.

## A fourth thing, not in gm's "2 of 3" framing, checked before finalizing: the angle itself needs a defined price/time scaling convention, and it's not scale-neutral

"Measure the actual slope angle" requires converting a price-change and
a day-count into a single angle via `atan(price_change / days)` — which
depends entirely on what counts as one unit of price per one unit of
time. The traditional Gann convention (the same one underlying the
already-built `gann.py` signal's whole tradition) is **1 point per 1
trading day**. Checked what that convention actually produces on real
recent data, since this is exactly the kind of scale-dependency that
broke sqrt-of-sqrt on EUR/USD and Family C on the same instrument:

```
SPX:  a real 247-point swing over 34 days -> slope 7.27 pts/day -> 82.2 deg
Gold: a real 536-point swing over 39 days -> slope 13.73 pts/day -> 85.8 deg
Book's own 58 deg example implies:            ~1.6 pts/day
```

**Not degenerate the way EUR/USD was for the other two signals** (sub-
angles still differentiate: 1/3 of 83° ≈ 28°, 1/2 ≈ 41°, 1/8 ≈ 10° — a
real spread, not collapsed to near-zero or near-total). **But a real,
honestly-stated property of the test:** SPX and gold's large point-
ranges relative to a one-day step mean their measured angles will
systematically cluster in a narrow 80-87° band, structurally different
from the ~50-65° range the book's own lower-priced-stock examples work
in. This isn't disqualifying, but it means a result on SPX/gold is a
test of this technique in a price regime the book never actually
demonstrates it in — stated plainly as a scope caveat, not discovered
after results come in.

## Impulse/pivot selection — explicitly stated now for completeness, same resolution as every prior signal

Not separately called out in gm's "2 of 3 axes" framing, but needs
stating for a complete plan: **which low-to-high move counts as "the
first impulse"** is resolved the same way as every pivot-needing signal
this session — reuse `peaks_and_troughs()` to generate every detected
swing, and run the method from each one, not a single hand-picked
"special" impulse.

## The falsifiable claim

Does a sub-angle line (origin at the impulse's own start, sloped at
1/3 — primary — or 1/2, 1/4, 1/8 — secondary, Bonferroni-corrected — of
the full impulse's measured angle) act as support/resistance: does price
later touch that line within its sized retracement-grid range, at a
rate better than chance? Same two-layer shape as the date/level/crossing
signals before it, but the "level" here is a **sloped line**, not a
fixed point — closer in spirit to the sqrt-of-sqrt and Family C
designs' need for a new scorer than to a drop-in reuse.

## What's reusable vs. new

```
REUSABLE AS-IS:
  turns.py's peaks_and_troughs() -- impulse/swing source (5th reuse)
  prices.py -- no change

NEW THIS SIGNAL:
  jenkins_secret_angle.py -- slope measurement (1-point-per-day
               convention, stated explicitly), sub-angle line
               construction at the pre-committed fraction(s), the
               sized-to-sub-angle retracement grid
  turns.py: a sloped-line-touch scorer -- the "level" moves over time
               (a linear function of elapsed days from the origin),
               genuinely new, not a reuse of the fixed-level scorer
               from Jenkins-music or the crossing scorer from
               sqrt-of-sqrt
```

## Expectation

Running scoreboard unchanged: 5 signals built, zero real replicated
edges (Jenkins-triangle's own Bonferroni-corrected primary test came
back clean null, with a misleading uncorrected secondary number
correctly not counted as a positive). This signal carries extra risk
flagged in its own primary source (the p.30 fitting admission) on top of
the usual in-sample/out-of-sample concern — the primary/secondary
Bonferroni design exists specifically to keep that risk from quietly
producing a false "it works" read.

## What to tell the operator

All three axes resolved — two directly from a page-verified worked
example (anchor, retracement style), one by correcting my own earlier
guess once better evidence arrived (1/3, not 1/2, because it's the
fraction the verified example actually uses). Running 1/3 as the primary
pre-committed test and 1/2/1/4/1/8 as a secondary, corrected check,
reusing the exact Bonferroni design that already proved its worth on
Jenkins-triangle this session. One new thing caught before build starts,
not in the original ask: the slope-angle calculation needs an explicit
price/time scaling convention, and SPX/gold's real angles cluster
tightly near 80-87° under the standard one — not degenerate, but a real,
stated difference from the lower-priced-stock regime the book's own
examples actually come from.
