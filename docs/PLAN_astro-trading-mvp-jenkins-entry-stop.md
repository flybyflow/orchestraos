# Astro-Trading Algo: MVP Plan — Jenkins Sqrt-of-Sqrt Entry/Stop Rule v1

- **Requested by:** operator, via gm (msg_f6f372b4_3429857) — "go ahead on
  sqrt-of-sqrt whenever ready," following the redundancy determination
  (msg_aecc9781_3260050) that confirmed this is genuinely new ground, not
  a restatement of the already-null Jenkins music-ratio signal.
- **Grounded in:** bshr's `jenkins-full-sweep.md` finding #9c (verified:
  `49 − 49**0.25 = 46.35`), my own prior algebraic check that this is a
  *different operation* from the Music ratio (confirmed: the shared
  constant 1.68179 = 8^0.25 = 2^0.75 is a coincidence of the specific
  number 8, not evidence the two rules compute the same thing), and a new
  numeric check run specifically for this plan (below) that surfaces a
  real problem the dispatch didn't anticipate.

## The headline finding, verified just now, not assumed: this formula is NOT scale-invariant, and it's degenerate on one of the project's three default instruments

The rule is `level = price − price^0.25`. I computed this against the
book's own $49 example and against the project's three actual current
instrument prices:

```
Book's own example ($49 stock):  level = 46.35   (offset = 5.40% of price)
SPX  (~7723):                    level = 7713.35  (offset = 0.12% of price)
Gold (~4185):                    level = 4176.56  (offset = 0.19% of price)
EUR/USD (~1.12):                 level = 0.0925   (offset = 91.75% of price)
```

**EUR/USD is degenerate, not just imprecise.** Because EUR/USD is quoted
near 1.0, `price^0.25` lands almost as large as `price` itself
(1.0291 vs. 1.1216), so the computed "level" is 0.0925 — EUR/USD would
need to collapse by over 90% for this level to ever be touched. That's
not a stop or an entry trigger, it's a number with no real market
meaning at this instrument's price convention. **SPX and gold aren't
degenerate but are both far tighter than the book's own example** —
0.12%/0.19% vs. the book's 5.4% — meaning this formula, tested on these
instruments at today's price levels, is really testing a very tight,
near-term level, not the kind of distance the book's own worked example
implies. This is a real scale-dependency problem with the technique
itself, not a flaw in how it's tested — the formula was demonstrated on
a $49 stock and doesn't carry its real-world meaning to instruments
priced in the thousands or near 1.0.

**Decision: exclude EUR/USD for this signal specifically** (not a
blanket exclusion — it's fine for every other signal in this project,
this is specific to this one formula's scale-dependence). **Keep SPX and
gold as primary**, with the tightness named plainly as a real property
of the test, not hidden. **Bonus, using existing infra, no new ticker
needed:** SPX's own ~99-year history spans price levels from the single
digits (1930s) to the thousands (today) — stratifying results by era
tests the formula closer to the book's own $49-stock context using data
already fetched for every other signal, cheaper than pulling in a new
individual-stock ticker and more directly informative about whether the
scale-dependency actually matters empirically.

## The claim shape is a third, genuinely new kind — not date-alignment, not level-touch-from-a-historical-pivot

```
Bradley/Gann/Gartley/Jenkins-triangle: does a signal predict WHEN a turn
  happens (date-alignment, turns.py's hit_rate_vs_chance())
Jenkins-music: does a price PROJECTED FROM A PAST SWING get touched
  later (level-touch, turns.py's level_hit_rate_vs_chance())
This signal: does TODAY's own price predict a NEAR-TERM support level
  computed from itself, with no historical reference point at all
```

**No swing-point/pivot-selection question exists for this signal at
all** — the first signal in the project where that's true. The rule is
evaluated fresh from every single trading day's own close, not from a
detected swing high/low. That removes one whole free-parameter axis
every prior signal needed to resolve (peaks_and_troughs, global pivot,
etc.) — a genuine simplification, named explicitly so it isn't mistaken
for an oversight.

## What counts as a "hit" — simpler than Jenkins-music's, by the nature of the claim

**Decision: a one-sided crossing check, not a ± tolerance band.** A
stop/entry level is naturally about price reaching down to or through a
threshold — unlike Jenkins-music's projected target (approached from
either direction), "hit" here means: **the Low of any trading day in the
forward window reaches at or below the computed level.** This needs no
tolerance-percentage parameter at all — one fewer free parameter than
Jenkins-music needed, a real simplification worth stating plainly.

**Forward window: 10 trading days (two calendar weeks), proposed here as
this plan's own default — no reference implementation or book-stated
holding period exists for this rule, same honest-disclosure situation as
Jenkins-music's tolerance/window.** Reasoning: the book's own framing
("entry/stop level," computed fresh from today's price) implies a
near-term, actionable level, not a multi-year target the way the Music
signal's projected ratios were — 10 trading days is a deliberately short,
round, round-number default consistent with that framing, open to the
operator's override.

## The chance baseline needs a new design — Jenkins-music's "resample from the real ratio pool" trick doesn't transfer

`level_hit_rate_vs_chance()`'s chance baseline (read directly before
writing this) works by resampling from the exact discrete set of real
ratios used (1.05946's 12 steps, 1.68179) — a permutation test that's
valid specifically because those ratios are FIXED constants, identical
for every reference point. **This signal's effective ratio
(`price^0.25 / price`) is NOT fixed — it changes with price every single
day**, so there's no discrete pool to resample from. Reusing the
existing function's baseline design here would silently reintroduce one
of the two broken chance-baseline bugs that function's own docstring
documents catching during Jenkins-music's build (scale mismatch between
the real displacement distribution and an arbitrary stand-in).

**Proposed design: a date-permutation test, not a ratio-pool resample.**
For each of 1000 trials, randomly reassign which trading day's *observed*
offset (`price^0.25` in absolute terms, not a fixed ratio) gets paired
with which OTHER day's reference price, recompute the shuffled level,
and check the same crossing rule in the same forward window. This
preserves the real, empirical distribution of offset sizes exactly (so
it can't manufacture a scale-mismatch false signal the way a
continuous-range or wrong-pool baseline did for Jenkins-music) while
genuinely testing whether a day's own price and its own computed offset,
paired together as the rule specifies, beats a realistic-sized but
mispaired offset. This is new design work, not a parameter swap — flagged
honestly as such before build starts, same as Jenkins-music's new scorer
was flagged last time.

## Layer 2 — explicitly declined, not stretched to fit

Every prior signal either had a natural Layer 2 (Bradley/Gann/
Jenkins-triangle: a turn flip directly implies a position) or a
labeled, honestly-flagged construction (Jenkins-music's support/
resistance bounce rule, explicitly marked as this project's own
invention). **This signal has no directional claim at all — just a
proposed stop/entry PRICE, not a buy-or-sell signal.** Building a Layer 2
here would require inventing a full entry strategy (when do you buy, in
order to need this stop?) with no basis in bshr's finding — further from
the source material than even Jenkins-music's Layer 2 stretch.
**Recommend: Layer 1 only for this signal.** If the operator specifically
wants a risk-management-efficacy framing (e.g., "does this stop distance
produce better realized outcomes than a fixed-percentage stop, assuming
some baseline entry rule"), that's a different, separately-scoped
question, not an extension of this plan.

## What's reusable vs. new

```
REUSABLE AS-IS:
  prices.py -- SPX, gold already cached; EUR/USD excluded (see above)
  stats.py  -- not used this signal (no Layer 2)

NEW THIS SIGNAL:
  jenkins_entry_stop.py -- compute level = close - close**0.25 for every
               trading day (no swing detection needed)
  turns.py: a new crossing-based scorer with the date-permutation chance
               baseline described above -- genuinely new design, not an
               adaptation of level_hit_rate_vs_chance's ratio-pool logic

NOT NEEDED: ephemeris.py, peaks_and_troughs() (no pivot/swing question
             for this signal at all), harness.py (no Layer 2).
```

## Expectation, continuing the project's honest running scoreboard

Five signals in, zero have shown a real, replicated edge (Bradley clean
underperformance; Gann in-sample pass failed out-of-sample; Gartley
underpowered; Jenkins-music matched chance almost exactly; Jenkins-
triangle not yet run). This signal adds a new kind of risk to watch for
beyond the usual in-sample/out-of-sample concern: **the scale-dependency
finding above means a result here is also contingent on SPX/gold's
*current* price level**, which won't hold the same way across SPX's own
price history — the era-stratified bonus analysis exists specifically to
surface that, not as an afterthought.

## What to tell the operator

Confirmed genuinely new ground, not a restatement of the Music signal's
null — but surfaced a real problem before any code runs: the formula
isn't scale-invariant, and produces a degenerate, meaningless level on
EUR/USD at its current price (a "stop" requiring a 90%+ collapse) —
excluded for this signal specifically. SPX and gold stay in, with the
honest caveat that at today's prices the computed level is far tighter
(~0.1-0.2% away) than the book's own $49-stock example (5.4% away) — a
bonus analysis using SPX's own ~99-year price history (no new data
needed) tests the formula closer to its original context by era. No
pivot/swing-selection question exists for this signal at all — a first
for the project, genuine simplification. Needs one new scorer design
(a crossing check with a date-permutation chance baseline, since there's
no fixed ratio to resample from the way Jenkins-music had) — real new
engineering, flagged honestly rather than assumed free. Layer 2 declined
outright rather than stretched to fit, since this is a risk-management
level with no directional claim, not a turn or target signal.
