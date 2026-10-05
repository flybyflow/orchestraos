# Astro-Trading Algo: MVP Plan — Jenkins "Rung" Formula v1 (Ch.8 Family C)

- **Requested by:** operator, via gm (msg_5abe148c_4032186) — "scope
  Family C as its own plan... your call whether to scope both halves
  together or split them."
- **Grounded in:** gm's Family-C resolution (msg_ff455f42_3805209),
  independently re-verified by me (all 3 worked examples recomputed
  exactly: 1041→16, 9800→49, 77431→139), and `turns.py`'s own documented
  history of rejected chance-baseline designs — read directly before
  designing this signal's baseline, not reinvented from scratch.

## Sequencing call: one plan, two clearly separated claims — not two documents, and not one blended test

Unlike sqrt-of-sqrt (a genuinely different *formula*), Family C's two
instances share the **same formula** (`rung(X) = round(sqrt(X)/2)`),
just applied to two different kinds of input the book itself pairs
together in the same finding: a price (support-interval claim) and a
cumulative day-count (turn-periodicity claim). Splitting these into two
full documents would duplicate the shared formula/scorer-design
discussion for no real benefit; blending them into one undifferentiated
test would hide that they're genuinely different claim shapes needing
separate pre-commitments. **This plan keeps them together under one
formula, with each claim's free parameters pre-committed separately.**

## The unifying insight: both claims are the same question in a different domain — does a rung-derived grid attract real data more than chance?

```
PRICE CLAIM:  does real price cluster near multiples of rung(price)
              more than a random spacing of the same size would?
TIME CLAIM:   do real market turns cluster near multiples of
              rung(elapsed days) apart more than chance would?
```

Recognizing this shared shape means **one new scorer design, used twice**
(different input series, different quantization unit) rather than two
unrelated builds — a real simplification once the pattern is seen, not
assumed from the start.

## Price support-interval claim — this plan's own operationalization, labeled honestly

The book's own detail here is thin: "Dow 9800 → rung ~49-50, support
every ~50 points" — no stated origin for the grid, no stated whether
`rung` is recomputed fresh each day or anchored once. **This needs more
construction than sqrt-of-sqrt did, and that's stated plainly rather
than smoothed over**, the same honesty standard applied to Jenkins-
music's Layer 2 and sqrt-of-sqrt's scorer when no more specific source
guidance existed.

**Decision: recompute `rung(close)` fresh every trading day from that
day's own price** (no historical pivot, consistent with Family C's
"applies to any number" framing and with sqrt-of-sqrt's same choice),
and **test whether `close mod rung(close)` clusters near zero** (i.e.,
real price sits unusually close to a multiple of its own rung value)
more often than chance.

**Sanity-checked this isn't degenerate by construction before proposing
it** — if `rung(price)` tracked `price` too tightly, `price mod
rung(price)` could trivially always land near zero, making the test
meaningless. Checked real SPX/gold prices:

```
SPX 7723 -> rung 44 -> 7723 mod 44 = 23   (half-rung = 22 -- near the MIDDLE, not 0)
SPX 7650 -> rung 44 -> 7650 mod 44 = 38
Gold 4185 -> rung 32 -> 4185 mod 32 = 25
Gold 4100 -> rung 32 -> 4100 mod 32 = 4   (near 0 -- this is what a real hit looks like)
```

Residuals spread across the full range, not clustered near zero by
construction — there's genuine room for the test to find a real pattern
or not, confirming the design is a real test and not a tautology.

## Time turn-periodicity claim — a genuinely new scorer shape for this project

`rung(cumulative days since a fixed origin)` changes extremely slowly
(sqrt of a large, slowly-growing number) — for any realistic backtest
window, it's close to a near-fixed interval (~139 days around the book's
own anchor), not something that needs recomputing day-by-day the way the
price claim does. **The real claim is a periodicity question: do real
market turns (using `turns.py`'s existing `price_turns()`, the same
swing detector used by every prior signal) show gaps that cluster near
this interval more than chance?** This is structurally different from
every scorer built so far (date-alignment, level-touch, crossing) — a
**fourth distinct scorer shape**, genuinely new design work, flagged
honestly before build starts.

**Origin for the day-count: NYSE's founding (May 17, 1792), the same
anchor the book's own verified worked example uses** — not invented,
taken directly from the one instance bshr verified. This avoids a second
free-parameter question (which origin to pick) by anchoring to the
single externally-verifiable source available, the same resolution
pattern used for Family A/B/sqrt-of-sqrt's single-worked-example
anchors.

## Chance baseline — empirical resampling, not a theoretical shortcut, because this project has already seen why that fails twice

A tempting shortcut for both claims: assume a theoretical uniform null
(if real data were random, residuals mod a fixed Q would be uniform on
`[0, Q)` by construction, no simulation needed) and run a straightforward
goodness-of-fit test. **Deliberately not taking that shortcut.**
`level_hit_rate_vs_chance()`'s own docstring (read directly before
designing this) documents two separate real chance-baseline failures
from assuming a convenient theoretical distribution instead of
resampling from the real empirical data — both produced implausible
z-scores in the hundreds from pure scale mismatch, not signal, caught
only by sanity-checking against a null random walk. **Same discipline
here: both claims' chance baselines resample from the real, empirical
data** — the price claim shuffles which trading day's rung value gets
paired with which day's actual closing price; the time claim resamples
real inter-turn gaps from the empirical set of all possible day-gaps in
the dataset, not an assumed uniform distribution. Verified against a
null random walk before trusting any real result, same sanity check
Jenkins-music's scorer used.

**One interpretive caution for the price claim specifically, named now
rather than discovered after a result looks exciting:** real markets are
independently known to cluster near generic round numbers (100s, 1000s)
for psychological reasons that have nothing to do with Jenkins' rung
formula. Since `rung(price)` isn't itself a round number (44, 32, etc.),
a genuine finding here is less easily confused with that known
phenomenon than a round-number test would be — but worth stating
explicitly as the alternative explanation to rule out before reading any
positive result as support for the rung formula specifically.

## EUR/USD excluded — confirmed, same root cause as sqrt-of-sqrt, checked before this plan was written

```
SPX (~7723):     rung = 44   (plausible, real-volatility-scale)
Gold (~4185):    rung = 32   (plausible, real-volatility-scale)
EUR/USD (~1.12): rung = 1    (degenerate -- a "support every ~1 point"
                               claim on an instrument that has never
                               traded outside roughly a 0.5-point range
                               in its entire quoted history)
```

Same exclusion, same reasoning as sqrt-of-sqrt: not a blanket call, just
this formula family's scale-dependence near price-1.0 instruments.

## What's reusable vs. new

```
REUSABLE AS-IS:
  turns.py's price_turns() -- real-turn source for the time claim
               (same swing detector used by every prior signal)
  prices.py -- SPX, gold already cached; EUR/USD excluded

NEW THIS SIGNAL:
  jenkins_rung.py -- rung() itself, the daily price-grid computation,
               and the day-count-since-1792 computation
  turns.py: a new grid-clustering scorer (mod-Q residual distribution
               vs. an empirically-resampled chance baseline) -- used
               twice, once per claim, with different inputs

NOT NEEDED: ephemeris.py, peaks_and_troughs() (price claim needs no
             swing detection -- same "computed fresh daily" elegance
             as sqrt-of-sqrt), harness.py (no Layer 2 -- see below).
```

## Layer 2 — declined for the same reason as sqrt-of-sqrt

Neither claim is directional. "Price clusters near a grid" and "turns
cluster near an interval" are both structural/periodicity claims, not
buy-or-sell signals. Same call as sqrt-of-sqrt, same reasoning: inventing
a trading rule here would be further from the source than any prior
signal's Layer 2 construction.

## Expectation

Six signals in (five built, sqrt-of-sqrt just dispatched), zero have
shown a real, replicated edge — and Jenkins-triangle's just-landed result
(commit `c50b070`, read fresh before finalizing this plan) is a concrete,
timely example of exactly why that bar matters: its primary,
Bonferroni-corrected test came back a clean null (0 of 42 cells clear the
corrected bar), while the easier, uncorrected pooled number DID clear
chance's 95th percentile and even replicated out-of-sample for two of
three instruments — exactly the kind of misleading-looking positive the
stricter pre-committed bar exists to catch, and was correctly reported as
NOT the project's first real positive rather than the easier number being
allowed to stand in. Family C adds two genuinely new scorer shapes to the
project rather than reusing an existing one twice — more new-engineering
surface area than most signals, which is itself a reason for extra
scrutiny of the chance-baseline design specifically (hence the explicit
empirical-resampling decision above, not a theoretical shortcut) before
trusting any result either direction.

## What to tell the operator

Family C scoped as one plan with two clearly pre-committed claims
sharing the same formula — a price support-interval question and a
genuinely new (for this project) turn-periodicity question, both framed
as "does a rung-derived grid attract real data more than chance,"
needing one new clustering-style scorer used twice rather than two
unrelated builds. EUR/USD excluded again, same root cause as sqrt-of-
sqrt, checked before any code runs. The price claim needed real
construction beyond the book's one thin example — labeled honestly as
this plan's own operationalization, sanity-checked numerically to
confirm it isn't trivially degenerate before being proposed. Chance
baselines deliberately use empirical resampling, not a theoretical
shortcut, specifically because this project has already documented two
real failures from that shortcut on the Jenkins-music signal.
