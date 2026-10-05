# Astro-Trading Algo: MVP Plan — Jenkins Triangle/Pythagorean Hypotenuse Method v1

- **Requested by:** operator, via gm (msg_6fecf2e0_1972455) — fifth signal,
  operator wants to keep going.
- **Grounded in:** bshr's direct read of Jenkins' Ch. 7
  (`$ORCHESTRA_DIR/state/bshr/astro-trading-gann-jenkins-20261005/jenkins-geometry-study.md`,
  already read in full while scoping the music-ratio signal), my own
  independent recomputation of the disputed C value (below), and the four
  signals already built and landed (`~/conductor/repos/astro-trading-backtest`,
  through commit `491e295`) — read fresh, not from memory.

## The direct answer: back to Bradley/Gann/Gartley's claim shape (date-alignment), with the same pivot risk as Gann — already resolved the same way Gartley and Jenkins-music resolved it

This is a date-alignment claim — **turns.py's existing
`hit_rate_vs_chance()` is directly reusable, no new scorer needed**,
unlike the music-ratio signal (which needed a new price-level scorer).
The one real risk, same class as Gann's: the formula needs a chosen
low-to-high move to compute A (days) and B (price) from, before C
(the hypotenuse) and its ratio-projections can be computed. **Resolved
the same way Gartley's and Jenkins-music's reference-point questions
were: reuse `turns.py`'s existing `peaks_and_troughs()` to generate every
detected swing, and run the method from EACH one — not a single chosen
"special" pivot the way Gann's center was.** gm's own dispatch already
named this exact resolution; confirming it's consistent with the
established pattern, not a new design.

## A correction to the C-value instruction, verified by recomputing it myself, not accepted on description

gm's dispatch says to use C=240.90 because it's "the more commonly
repeated value" in the book. **I checked this claim against the book's
own stated inputs rather than taking the justification as given:**

```
A = 76 days, B = 228.60 points (the book's own stated inputs)
C = sqrt(A^2 + B^2) = sqrt(76^2 + 228.60^2) = sqrt(58033.96) = 240.9024
```

I ran this in Python myself. **240.90 isn't just the more commonly cited
figure — it's the mathematically correct value for the book's own stated
A and B.** 240.96 doesn't fall out of that computation at all; it's a
separate, actually-wrong number that appears elsewhere in the book's own
worked example. This is a stronger, more precise basis for the same
decision gm already reached — using 240.90 — and worth stating precisely
rather than deferring to "more commonly repeated," which implies a
popularity count rather than a checkable fact. **Per gm's own point 4,
not resolving which the author "meant"** — just confirming which one the
arithmetic actually produces from the inputs everyone agrees on, and
using that.

## The ratio list — confirmed as 7 values, not 6; gm's written formula paragraph dropped 1x but the stated "2 of 7" result depends on it

gm's dispatch lists six ratios (1.27×, 1.382×, 1.618×, 2.236×, 3.618×,
4.236×) in the formula description, but also says bshr's re-derivation
"matched exactly on 2 of 7 projected dates." Checked against bshr's
original doc directly: the full list is **seven** ratios, including
**1× itself** (the un-scaled hypotenuse projection) — and 1× is one of
the two exact matches (the other being 1.618×). **Using the full 7-ratio
list in this plan, not the 6 written in the dispatch**, since the "2 of
7" figure only makes sense with 1× included, and dropping it would
silently lose one of the two cleanly-verified projection lines.

## Multiple ratios — gm's point 3: tested separately as primary, with an explicit multiple-comparisons correction, plus a pooled number as a simple secondary

**Decision: score each of the 7 ratios' hit rate separately** (not
pooled as the only analysis) — the book presents them as seven distinct
projection lines, not one blended signal, and pooling would hide exactly
the kind of "one ratio works, the others are noise" or "one lucky ratio
inflates an otherwise-flat pool" pattern that matters for an honest read.

**But testing 7 things separately is 7 simultaneous hypothesis tests,
and that needs its own pre-committed correction, not just an
acknowledgment.** Pre-committing a Bonferroni-adjusted bar: instead of
"beats chance's 95th percentile" (the single-test bar every prior signal
used), a given ratio's result only counts as a real finding here if it
clears chance's **(1 − 0.05/7) ≈ 99.3rd percentile** — the standard
correction for testing 7 things at once and still holding a 5%
false-positive rate overall. This is a stricter bar than any prior
signal used, by design, because this is the first signal that runs
multiple parallel tests on the same data rather than one.

**Also report a simple pooled number** (did ANY of the 7 ratios' projected
dates land a hit, treating the union of all 7 as one combined prediction
set) as a secondary, easy-to-read headline figure — gm's "simpler"
alternative, kept as a supplement rather than the only view, with its own
unmodified chance baseline (same methodology, applied to the pooled
prediction set).

## What's reusable vs. new

```
REUSABLE AS-IS:
  turns.py's peaks_and_troughs() -- pivot/reference-point source (same
               function, same pre-committed window, third reuse)
  turns.py's price_turns() + hit_rate_vs_chance() -- Layer 1 scoring,
               unmodified, same as Bradley/Gann/Gartley (this signal is
               back to the date-alignment shape, confirmed)
  harness.py, stats.py -- Layer 2, unmodified, same turn-following
               position-flip rule pattern as Bradley/Gann (this method,
               like Bradley/Gann, is direction-agnostic -- it flags WHEN
               a turn is likely, not which way, same as those two)
  prices.py -- no change

NEW THIS SIGNAL:
  jenkins_triangle.py -- compute A/B/C from each swing-to-swing move
               (via peaks_and_troughs), project forward by each of the 7
               ratios as a new day-count from the pivot, emit the 7
               per-ratio predicted-turn-date sets plus the pooled union

NOT NEEDED: ephemeris.py -- pure price/calendar arithmetic, same as
             Gann/Gartley/Jenkins-music.
```

## Expectation, read honestly against what the project has actually found so far, not treated as a fresh coin flip

Fresh context pulled from the four landed results, not assumed: Bradley
— clean underperformance. Gann — cleared chance in-sample, failed
out-of-sample (the exact false-positive shape the split exists to
catch). Gartley — underpowered by pattern rarity, inconclusive rather
than negative. Jenkins music-ratio — hit rate matched its chance
baseline almost exactly, the cleanest null yet, despite having the best
formula-verification pedigree of any signal so far. **Zero of four
signals have shown a real, replicated edge.** That's not a reason to
skip this fifth one — it's cheap, uses fully-reused infrastructure, and
a null result here adds real information to an honestly-building picture
— but it is the right prior to state plainly rather than treating each
new signal as a fresh 50/50. If this one clears both the single-ratio
Bonferroni bar AND replicates out-of-sample, that would be the first
real positive in the whole project and should be treated with
commensurately more scrutiny, not less, precisely because it would be
the outlier against four honest nulls/false-positives.

## What's NOT in this plan

- **Nothing else from Ch. 7** — the chapter's content (per bshr's read) is
  this one triangle/hypotenuse method; no other distinct technique in it
  is being separately scoped.
- **Re-litigating which C value the author "really meant"** — per gm's
  point 4, using 240.90 because it's what the stated inputs actually
  produce, not adjudicating the book's own internal inconsistency beyond
  that.

## What to tell the operator

Fifth signal, same pivot-resolution pattern now used three times
(Gartley, Jenkins-music, this one) — every detected swing, not one
chosen pivot, avoiding Gann's exact problem by construction. One
precision upgrade over the dispatch: recomputed the disputed C value
myself from the book's own stated inputs (240.90 is mathematically
correct for A=76/B=228.60, not just "more commonly cited" — 240.96 is
the book's own error). Testing all 7 ratio lines (the dispatch's written
list dropped 1× but the stated results depend on it) separately, with an
explicit Bonferroni correction for running 7 tests at once rather than
one — stricter than any prior signal's bar, by design. Worth saying
plainly before this runs: four signals in, none have shown a real,
replicated edge — Gann's one in-sample pass didn't survive
out-of-sample. That's the honest prior for a fifth, not a reason to
stop, and if this one does clear its (harder) bar, it earns more
scrutiny for being the outlier, not less.
