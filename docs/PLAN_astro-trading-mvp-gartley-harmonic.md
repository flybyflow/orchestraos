# Astro-Trading Algo: MVP Plan — Gartley Harmonic XABCD Pattern v1

- **Requested by:** operator, via gm (msg_42f437f1_70018385). Operator
  still asleep, working through the night per their own instruction — no
  rush-decision needed, report when ready.
- **Grounded in:** bshr-3's full research
  (`$ORCHESTRA_DIR/state/bshr-3/pythagorean-harmonic-geometric-20261005/answer.md`,
  read in full), a WebSearch cross-check of the exact Carney ratio rules
  (below), and the actual Bradley v1 code (`turns.py`, `harness.py`,
  `stats.py`) read directly to confirm what's reusable a third time.

## Headline, so it's not missed: plain Fibonacci retracement is already settled, and this plan does NOT rebuild it

bshr-3's sharpest finding: plain Fibonacci retracement (0.382/0.5/0.618 as
standalone support/resistance) is **already falsified** by three
independent, methodologically serious sources (a multi-thousand-stock
backtest, a G10-FX quant study on millions of minutes of data, and a
102-instrument backtest) — all converge on "statistically indistinguishable
from chance." Rebuilding that would just reconfirm a known null result.
**This plan is scoped to the genuinely untested candidate bshr-3
identified instead: the Gartley harmonic XABCD pattern** — a specific,
falsifiable geometric pattern that nobody has run a chance-baseline-
controlled backtest on yet, per bshr-3's search.

## The signal, cross-checked against a second independent source before committing to it

bshr-3 gave: B=0.618 retracement of XA, C=0.382–0.886 retracement of AB,
D=0.786 retracement of XA (the PRZ), CD extending 1.272× or 1.618× of BC.
I ran my own WebSearch cross-check before writing this plan (same
discipline as Bradley's Mars/Mercury check and Gann's formula-variant
check) — it confirms the core numbers but surfaces one thing bshr-3's
summary and gm's dispatch both omit:

**A third PRZ-convergence element exists that bshr-3/gm's summary didn't
mention: AB=CD (the CD leg should roughly equal the AB leg in price
length), described by one source as "the most important" of the three
converging elements, not optional decoration.** This is exactly the kind
of discrepancy-between-descriptions that caught real bugs on both prior
signals — **resolving it the same way: check what the reference
implementation actually computes, not what any one blog or research
summary says, and go with the code.**

## Commit to one reference source, as a stated assumption — same rule that caught real discrepancies twice already

**Decision: `crypto10kx/harmonic-pattern-detection`** — bshr-3's
recommended pick, the only one of three reference implementations found
(`djoffrey/HarmonicPatterns`, `crypto10kx/harmonic-pattern-detection`,
`ubermachine/HarmonicsPy`) that both claims Carney-compliance (Scott
Carney is the pattern family's codifier) and ships its own backtest
scripts (`BACKTEST_RESULTS.md`) to cross-check against. **Explicit
caveat bshr-3 flagged and this plan repeats: none of the three reference
repos publish Bradley-grade rigor themselves (no visible chance
baseline) — they're the right source for pattern-detection geometry, not
evidence the pattern itself works.** That evidence is exactly what this
backtest is for.

**Build instruction, same as both prior signals: when the reference code
and any description (bshr-3's, mine, gm's, or the plan's own numbers
above) disagree — including on whether AB=CD is a hard gate or a soft
PRZ-convergence factor, and on the exact tolerance band — the reference
code wins, and the resolution gets documented in the commit the way
Bradley v1 documented its two corrections.**

## Free parameters, pre-committed before any backtest runs — gm's point 3 and 4, both addressed

```
1. SWING-POINT / PIVOT DEFINITION (gm's point 4 — does detection itself
   introduce a free parameter?)
   ALREADY SOLVED. turns.py's peaks_and_troughs(series, window) is a
   general local-extrema swing detector, already used and already
   pre-committed (PRICE_TURN_WINDOW = 5 trading days) for Bradley and
   Gann's price-turn definition. X, A, B, C, D are nothing more than five
   consecutive alternating swing highs/lows — reuse this function
   unmodified rather than inventing a second swing definition. This
   directly answers gm's concern: the free-parameter risk in swing
   detection was already identified and pre-committed two signals ago,
   confirmed by reading turns.py again just now.

2. PRZ TOLERANCE BAND (how close to 0.618/0.786/etc. counts as a "hit")
   Deferred to whatever `crypto10kx/harmonic-pattern-detection` hardcodes
   — same "don't invent a number, use the reference's" rule as the
   source-commitment above. Documented once build reads the actual code.

3. WHICH PATTERN FIRST
   Gartley only — not Bat/Butterfly/Crab/Shark/Cypher. It's the original
   1935 pattern (H.M. Gartley's own sketch, later Carney-codified) and
   the one both bshr-3's numbers and the reference repo's primary rule
   set describe. The other four are the same XABCD skeleton with
   different ratios in the same slots — worth a v1.1 pass only once
   Gartley's result is in hand, not implemented in parallel.

4. HIT-RATE MATCH WINDOW
   Reuse the same +/-4 calendar day tolerance turns.py already uses for
   Bradley and Gann (MATCH_TOLERANCE_DAYS), for direct comparability
   across all three signals rather than inventing a pattern-specific
   window with no stated justification.
```

## What's reusable a third time, confirmed by reading the code again, not assumed from the pattern repeating

```
REUSABLE AS-IS:
  turns.py  -- peaks_and_troughs() for swing detection (new use),
               price_turns() + hit_rate_vs_chance() for Layer 1 scoring
               (same use as Bradley/Gann, signal-agnostic, unmodified)
  harness.py, stats.py -- Layer 2 (Sharpe/drawdown/win_rate vs.
               buy-and-hold), unmodified, same as both prior signals
  prices.py -- no change

NEW THIS SIGNAL:
  gartley.py -- the actual pattern-detection algorithm: scan
               peaks_and_troughs() output for consecutive alternating
               swing quintuples, check each against the Gartley ratio
               rules (resolved against reference code per above) within
               the pre-committed tolerance, emit a "pattern completed at
               D" event per match -- this is genuinely new work, a
               different shape of problem than Bradley/Gann's pure-
               formula signals (gm's point 4), but it only has to solve
               the matching logic, not swing detection itself.

NOT NEEDED: ephemeris.py -- pure price geometry, same as Gann.
```

## One real structural difference from Bradley/Gann worth naming: Gartley patterns are directional, not just turn-flags

Bradley and Gann's turns are direction-agnostic — they flag *when* a turn
is likely, not *which way*, so both signals' Layer 2 position rule was a
generic "flip exposure" at each turn. **A completed Gartley pattern comes
in two mirror-image variants (bullish: predicts a reversal UP at D;
bearish: predicts a reversal DOWN at D) determined directly by which way
the XA leg moved.** This means Layer 2's position rule can be more
specific than Bradley/Gann's — go long after a bullish-pattern D, short
after a bearish-pattern D, rather than alternating flip-flop — which is a
cleaner test of the pattern's actual directional claim, not a weaker one.

## Success metrics — same two-layer structure, third time, same reused scorer

```
LAYER 1: does a completed Gartley pattern's D point predict a real price
         reversal within +/-4 calendar days, at a rate better than chance?
         -> turns.py's hit_rate_vs_chance(), fed gartley_turns() (the
            dates each pattern completes) instead of bradley_turns() or
            gann_turns(). Same chance-baseline methodology.

LAYER 2: Sharpe ratio, max drawdown, win_rate vs. buy-and-hold, using the
         directional long/short rule above instead of a generic flip.
```

## Data depth: unlike Gann, no global-pivot dependency — all three existing instruments are usable without a caveat

Gann's formula needed one all-time pivot, which made SPX's 99-year depth
load-bearing and gold/EUR-USD's shorter history a real limitation. Gartley
patterns are local and windowed (each XABCD quintuple is self-contained,
no dependency on a fixed historical anchor) — so SPX, gold, and EUR-USD
are all equally usable here with no instrument-depth caveat needed.

## Expectation — stated honestly, not borrowed from the other two signals' precedent

Bradley had zero free parameters (precedent: honest underperformance,
reported plainly). Gann has a real free parameter and no cross-source
formula agreement (precedent: bshr/gm both stated a null result is likely
or more likely than Bradley's). **Gartley sits in a different place than
either** — its free parameters are now pre-committed (swing definition
reused, tolerance deferred to reference code, pattern fixed to one
variant), closer to Bradley's discipline than Gann's, but it's also a
pattern genuinely popular in real retail/prop trading for decades with,
per bshr-3's own search, **no prior chance-baseline-controlled test found
anywhere** — unlike Fibonacci retracement, which has three. That's
neither a reason to expect a positive result nor a negative one — it's
simply the first real answer to a question nobody has rigorously asked
yet, and the honest framing is exactly that, not a borrowed precedent
from either prior signal.

## Explicitly NOT in this plan

- **Bat, Butterfly, Crab, Shark, Cypher** — same XABCD skeleton, different
  ratios, deferred to a v1.1 pass once Gartley's result is in hand.
- **Plain Fibonacci retracement** — already decisively falsified by three
  independent sources per bshr-3; not rebuilt here.
- **The AB=CD convergence rule as a design decision made in this doc** —
  not pre-decided here as hard-gate vs. soft-factor; explicitly left to
  resolve against the reference code during build, per the "reference
  wins" instruction above, rather than guessed at from conflicting
  secondary sources.

## What to tell the operator, in the morning

Third signal scoped with the same discipline as the first two: committed
to one named reference implementation rather than guessing between
disagreeing descriptions (and caught a real omission before build even
started — the AB=CD convergence rule bshr's summary left out), and
pre-committed every free parameter in writing, including reusing an
already-pre-committed swing-point definition from the Bradley/Gann work
rather than inventing a new one. One genuine first for this project:
unlike Fibonacci retracement (already falsified three times over) or
Bradley/Gann (both have a stated expected-null precedent either from
zero-free-parameters discipline or from bshr's own stated likelihood),
nobody has run a real chance-baseline test on the Gartley pattern before
— this is a first real answer, not a confirmation of something already
known either way.
