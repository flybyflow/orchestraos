# Astro-Trading Algo: MVP Plan — Carney Harmonic Family v1 (signal #9)

> # ⛔ DO NOT BUILD FROM THIS PLAN — BLOCKED 2026-10-05
>
> **Layer 1 as specified is a tautology.** `price_turns` is
> `local_extrema(close, PRICE_TURN_WINDOW)`; the detector draws D from
> `peaks_and_troughs(close, SWING_WINDOW)` with `SWING_WINDOW ==
> PRICE_TURN_WINDOW` and the identical extrema test. Predicted turns are a
> **subset of the ground truth by construction**. Verified on real SPX: 25/25
> D dates are in the ground-truth set, hit rate is **1.0000 even at zero
> tolerance**, and z is a pure function of n (n≥8 clears p95 automatically).
> A placebo of 20 arbitrary swing points reproduces signal #3's published
> z=3.68 **exactly**.
>
> Run as written with all four eng-review P1 fixes applied, this plan yields
> **n=136, hit=1.000, z=9.57 full / 8.51 in-sample / 4.75 out-of-sample** —
> the project's first apparent edge, replicating out-of-sample, and **entirely
> artifact**.
>
> Two further live problems, both verified, neither created by this plan:
> - `README.md:116-118` publishes that false positive today (signal #3, z=3.68).
> - **5-bar lookahead in Layer 2.** A swing at `i` is unknowable until `i+5`,
>   but positions act on the swing date. Published → honest: eurusd +24.13% →
>   +13.08%, SPX +762.72% → +304.13%, gold +546.94% → +519.77%. Affects every
>   signal using turn-following positions.
>
> **The ENG REVIEW section below is superseded in its priorities.** Its four
> P1s are real but second-order; fixing them made the artifact look *more*
> rigorous (dedup moved z from ~10.6 to 9.57). **T4 actively defends the bug** —
> it pins `z=3.68` and `n=20` as regression literals, so anyone fixing the
> baseline fails it. Strip z-scores and hit rates from T4; pin pattern counts
> only.
>
> Needs a rewrite, not a patch. The valid reformulation is a permutation null
> over candidate swing quintuples — the fix this repo already invented four
> times in its other scorers. Awaiting operator decision, including on
> retracting the published README numbers.

- **Dispatched by:** operator via gm (msg_80b0fa87) — run the Carney harmonic
  work through the formal gstack pipeline rather than ad-hoc dispatch.
- **Research input:** bshr, `carney-harmonic-trading-20261005/answer.md` —
  ratios cross-sourced against harmonictrader.com, Carney's own site.
- **Baseline:** repo at `257cd61`, 93 tests green in 1.9s, 3774 LOC, no CI.
- **Predecessor:** `PLAN_astro-trading-mvp-gartley-harmonic.md` (signal #3).
  This plan supersedes nothing in it; it generalises its detector.

## Headline, so it is not missed: the primary result of this signal is a MEASUREMENT, not a verdict

Signals #1–#8 each asked "does this edge exist?" and answered honestly, eight
times, "no, or we cannot tell." This one asks a different question first,
because measuring the obvious one showed it cannot be answered:

> **At the precision Carney himself specifies, how often do his patterns
> actually occur on daily bars?**

I measured this before writing the plan, on real data, by monkeypatching the
existing tolerance constants and re-detecting (full table in the gm report,
msg_66ae2d4c). Gartley alone, SPX, 99 years:

| tolerance | as-shipped (.30/.28/.15/.15) | 15% | 10% | **5%** | **2%** |
|---|---|---|---|---|---|
| SPX (99y) | 25 | 12 | 4 | **2** | **1** |
| gold (26y) | 3 | 3 | 1 | 1 | 0 |
| silver (25y) | 11 | 6 | 3 | 1 | 0 |

**Tightening from the shipped tolerances to Carney's own 5% convention cuts
SPX from 25 patterns to 2.** bshr's expected 2–4x multiplier from adding
Bat/Butterfly/Crab does not come close to offsetting a ~12x cut. Both of
bshr's statements were individually correct; nobody had multiplied them out.

So implementing Carney *faithfully* makes this test **less** powerful than the
already-underpowered Gartley run, and the project would get a ninth shrug
without learning why. The reframe: make tolerance an explicit tested variable
and report the occurrence-vs-tolerance curve as a primary result. That is a
falsifiable, quantitative finding about **the method's testability**, and it
explains the thing eight previous signals never established — why harmonic
results keep coming back inconclusive.

## Free parameters, pre-committed before any backtest runs

Project discipline, fourth plan running. Every number below is fixed now and
is not to be reselected after seeing a result.

1. **Patterns in v1:** Carney's four core XABCD — Gartley, Bat, Butterfly,
   Crab. Ratios exactly as bshr sourced them (table in §"Pattern specs").
2. **Excluded, with reasons:** *Cypher* — Darren Oglesbee's pattern, not
   Carney's; including it under "Carney's method" is the misattribution this
   project exists to avoid. *Shark* — deferred to v2, not rejected: it is
   structurally different (O-X-A-B-C, completes at C, PRZ is an overlap of two
   ranges) and needs its own detector. Flagged because its failed-breakout
   mechanic is the one most likely to have *different* occurrence
   characteristics from the four narrow AND-conditioned shapes here, which
   makes it the most interesting follow-up. *Deep Crab* — a B-ratio variant,
   folded into v2 with Shark.
3. **Tolerance grid (the primary experiment):** `{0.15, 0.10, 0.05, 0.02}`
   applied flat to all four ratio constraints. 5% and 2% are the two
   conventions bshr found cited; the rest bracket the curve. Carney's own text
   states exact targets with no stated tolerance, so 2% is the strict limit
   case, not an invention.
   **`as-shipped` is NOT a point on this curve.** It is the 4-tuple
   `(0.30, 0.28, 0.15, 0.15)` — looser than flat 15% on two constraints and
   equal on two — so it does not lie on a scalar axis and must not be plotted
   as though it did. The measured numbers already show the distortion: Gartley
   on SPX gives 25 at as-shipped but 12 at flat 15%. Report it as a labelled
   reference point beside the curve, for comparability with signal #3 only.
4. **Layer-1 tolerance:** `as-shipped`, so the result is directly comparable
   to signal #3's. Every other tolerance is reported as occurrence counts only.
   Stated plainly: a Layer-1 verdict at as-shipped tolerance is **not** a
   verdict on Carney's method, it is a verdict on a 6–15x widened version of
   it. That caveat ships with the number, not in a footnote.
5. **Minimum event count, the key new commitment:** **n is the number of
   DISTINCT completion dates in a cell after the family dedup of parameter 11
   — not `n_predicted_turns` as returned by the scorer, and not the sum of
   per-pattern counts.** Those three numbers differ once two specs can claim
   the same date (measured: 22% of detections collide), and keying the rule on
   the wrong one lets a cell report n=22, clear the verdict bar, and actually
   rest on 17 distinct dates. The three bands:
   - **n ≥ 20** → report a verdict (hit rate, chance baseline, z).
   - **10 ≤ n < 20** → report directionally, labelled UNDERPOWERED, z shown
     with the n beside it every time it is quoted.
   - **n < 10** → report **"not testable"** and **quote no z-score at all.**
   This exists because signal #3 reported z=3.68 off n=20 and z=1.75 off n=5,
   and gold's n=3 produced a number that looked like a result. A z-score on
   n=3 is not a weak finding, it is a misleading one. Pre-committing the
   threshold before seeing which cells clear it is the whole point.
6. **Train/test split:** `2001-01-01`, unchanged from every prior signal.
   Note in advance: at tight tolerances splitting makes per-cell n smaller
   still, and most cells will fall under rule 5. That is a finding, not a
   failure of the design.
7. **Instruments:** SPX `^GSPC` primary. gold `GC=F`, silver `SI=F`, EUR/USD
   `EURUSD=X` secondary, occurrence counts only unless a cell clears n≥20.
8. **Chance baseline:** reuse `turns.hit_rate_vs_chance` unchanged — already
   validated, already used by #1/#2/#3. **No new scorer.** The rung signal
   needed a bespoke one and it took two separate bug fixes to get right; the
   cheapest correct move here is to not need one.
9. **Swing detector:** `turns.peaks_and_troughs`, `window=5`, unchanged.
10. **Seeds:** `turns.CHANCE_SEED`, unchanged.
11. **Family dedup — one calendar date is ONE event, regardless of how many
    pattern specs claim it.** This is a free parameter and it decides the
    headline number, so it is fixed here, before any run. Measured on real SPX
    at flat 30%: 175 raw detections, **136 distinct dates, 39 collisions
    (22%)**, with `1949-01-24` claimed by Gartley, Bat and Butterfly at once.
    - The reported occurrence count is the count of **distinct D dates**.
    - `hit_rate_vs_chance` receives **distinct dates only**. This is not
      cosmetic: `turns.py:126` draws the chance baseline with
      `rng.choice(..., size=n_predicted)`, so duplicate dates shrink
      `chance_std` and **inflate z for an unchanged hit rate** — manufacturing
      significance. `_hit_rate` itself (`turns.py:99`) divides by
      `len(predicted)` and is unbiased by duplicates, which is exactly why
      this is easy to miss.
    - The per-spec attribution (which patterns claimed each date) is retained
      and reported alongside, because "how often do the four shapes overlap"
      is itself a result about the family. Dedup governs the COUNT, not the
      bookkeeping.
    - Tie-break within a single spec stays `keep="first"`, unchanged from
      `gartley.py:118`.

## Instrument depth, corrected — SPX is the only series deep enough, and no metal fixes that

bshr recommended silver as the fix for gold's power problem, on the basis that
COMEX silver has 40–50+ years of daily data. **It does not, for anything this
pipeline can fetch.** Measured:

| ticker | first | years |
|---|---|---|
| `SI=F` | 2000-08-30 | 25.3 |
| `SLV` | 2006-04-28 | 19.7 |
| `SIL` | 2010-04-20 | 15.7 |
| `PSLV` | 2010-10-29 | 15.2 |
| `^XAG`, `XAGUSD=X` | — | do not exist on yfinance (404) |
| `GC=F` (gold, reference) | 2000-08-30 | 25.3 |
| `^GSPC` (reference) | 1927-12-30 | 98.0 |

Silver and gold share an **identical start date** — 2000-08-30 is where
yfinance's futures history begins; it is not a property of the metals. So
silver is a second ~25-year series, not a longer one. builder-1's silver infra
(already on main at `257cd61`, currently used by zero runners) is worth keeping
as a legitimate fourth instrument, but it must not be carried as the answer to
gold's power problem, because it is not one. **Any Layer-1 claim in this
project rests on `^GSPC` or it rests on nothing.**

## Pattern specs, from bshr's primary-source cross-check

| Pattern | B (retrace XA) | BC (retrace AB) | CD (proj BC) | D (XA ratio) |
|---|---|---|---|---|
| Gartley | 0.618 | 0.382 or 0.886 | 1.272 / 1.618 | 0.786 retrace |
| Bat | 0.382–0.500 | 0.382–0.886 | 1.618–2.618 | 0.886 retrace |
| Butterfly | 0.786 | 0.382 or 0.886 | 1.618 / 2.0–2.618 | 1.27 **extension** |
| Crab | 0.382–0.618 | 0.382–0.886 | 2.618–3.618 | 1.618 **extension** |

Butterfly and Crab complete **beyond** X, Gartley and Bat **inside** it.

**Correction to an earlier draft of this plan:** I wrote that this was a
structural difference `_ratios` could not model. That is wrong, checked
algebraically. For a bullish quintuple `ad_xa = (a-d)/(a-x)`, and `ad_xa > 1`
is exactly equivalent to `d < x` — D beyond X. The zigzag ordering supplies
the sign that `abs()` discards, so magnitude alone separates retracement from
extension. `_ratios` (`gartley.py:71-81`) is already pattern-agnostic and is
reused **unchanged**; only `_is_valid_gartley`'s constants are
Gartley-specific. Extensions need new numbers, not new geometry.

## What is reusable, confirmed by reading the code rather than assuming the pattern repeats

- `turns.peaks_and_troughs` / swing extraction — reused unchanged.
- `turns.hit_rate_vs_chance` — reused unchanged (parameter 8).
- `harness.run_backtest` + `stats.compute_stats` — reused for Layer 2.
- `gartley.py`'s `_ratios()` — the XABCD ratio computation is pattern-agnostic
  already; only `_is_valid_gartley()` hardcodes one pattern's constants.

**The one real refactor: make the detector registry-driven.** Replace
`_is_valid_gartley(…)` + module-level constants with a `PatternSpec` dataclass
(ratio targets/ranges + tolerance + whether D is a retracement or an
extension) and a single `find_xabcd_patterns(close, spec, tolerance)`. Four
specs replace one hardcoded validator.

This is required by the coordination state, not by taste: bshr's research
continues and a tenth pattern is likely. A registry absorbs a new pattern as
*data*; a hardcoded validator needs a new function and a new test file every
time. It also makes the tolerance sweep a loop over one parameter instead of
five monkeypatched globals, which is how I had to measure it for this plan.

`gartley.py` keeps its public API (`find_gartley_patterns`, `gartley_turns`,
`turn_following_positions`) so signal #3 and its 5 tests keep passing
untouched; it becomes a thin wrapper over the generic detector with the
Gartley spec. **If #3's numbers move at all, the refactor is wrong** — that is
the regression test, and it is a strong one because #3's results are committed
in the README.

## Carney's trading rules — the genuinely new Layer-2 content

Signal #3 entered the instant D completed and faded with an ad-hoc stop. Carney
specifies neither. Three upgrades, all from bshr:

1. **Confirmation-candle entry.** PRZ arrival is explicitly *not* a trade
   signal in Carney's own words — "an opportunity for a potential trade, not a
   signal to trade yet." Requires a pin-bar/engulfing confirmation at D, entry
   on its close. Implemented as a filter; reported **both with and without**,
   because the delta is itself the interesting number.
2. **Pattern-specific stops.** Beyond X for Gartley/Bat; beyond the D
   extension for Butterfly/Crab. Replaces the uniform fade.
3. **Profit targets — unresolved, and stay that way.** Two conventions are
   both attributed to Carney's management chapter: (a) 38.2%/61.8% retrace of
   the AD leg, (b) the C and A swing levels. bshr could not resolve them
   without the book. **Test both as labelled variants.** Do not pick one and
   present it as Carney's. This matches how the project handled every prior
   source ambiguity.

Layer 2 is subject to rule 5 as well: on a cell with n<10 patterns, a Sharpe
ratio is noise with a decimal point on it.

## Success metrics

This signal succeeds if it produces a **correct** answer, not a positive one.
Concretely, it is done when:

1. The occurrence-vs-tolerance curve exists for 4 patterns × 5 tolerances ×
   4 instruments, reproducible from a committed script.
2. Every reported cell carries its n, and every cell under the pre-committed
   thresholds says so instead of quoting a z-score.
3. Signal #3's committed numbers are unchanged by the refactor.
4. The Layer-2 Carney rules are implemented and reported with/without
   confirmation, both target conventions labelled.

## Expectation, stated before running so it can be wrong

- **The tolerance curve will show Carney-compliant patterns are too rare to
  test on daily bars.** Specific falsifiable prediction: **at 5% tolerance,
  all four patterns together produce fewer than 20 occurrences on SPX over 99
  years.** Gartley alone gives 2; bshr's 2–4x multiplier implies 4–8. If it
  comes out ≥20 this reframe was wrong and an ordinary Layer-1 test proceeds.
- **Layer 1 at as-shipped tolerance will be inconclusive**, consistent with #3
  but with more events.
- **No real, replicated edge.** Nine signals in, that is the base rate.
- **gold, silver and EUR/USD will all fall under n<10** and will be reported
  as not testable.

## The limitation that probably explains the whole thing, named but not tested

Carney's patterns may simply not be *for* daily bars. Practitioners report
seeing them constantly; a 99-year daily backtest finds 2 at his stated
precision. Both can be true if the method is applied intraday, where there are
orders of magnitude more swings. **This project has no intraday data, so this
is not testable here** — stating it as the most likely explanation of the
curve, explicitly as an untested hypothesis, not smuggling it in as a finding.

## Explicitly NOT in this plan

- No live trading, no broker, no money. Unchanged from every prior plan.
- **No dashboard.** The operator clarified "full stack" means the process.
- Not normalising the five Layer-1 scorer schemas in `turns.py`, and not
  fixing `grid_clustering_vs_chance`'s inverted polarity (its "good" result
  has a *negative* z while the other four are positive). Real, currently
  **latent** — the rung runner prints the correctly-named key and the README
  prose reads it correctly, so nothing published is wrong. It will bite the
  first consumer that reads `z_score` generically across all nine signals.
  Filed separately; deliberately not bundled here.
- No CI, though the repo has none and should.
- Not re-running or revising signals #1–#8.
- Not resolving Carney's profit-target ambiguity — testing both instead.

## What to tell the operator

The ninth signal turned out to be worth more as a measurement than as another
verdict. Carney's patterns, at the precision Carney himself specifies, occur
roughly once or twice per century on the S&P 500 — which means the method is
not falsifiable on daily data at that precision, and any published backtest
claiming otherwise is using looser tolerances than Carney specifies or a
shorter bar interval. That explains why the harmonic results keep coming back
inconclusive, which eight previous signals established as a pattern but never
explained. Two of the assumptions this plan started from were wrong when
measured: silver does not have 40–50 years of history (it has 25, the same as
gold), and tightening tolerances fights the pattern-family fix rather than
complementing it. Both were caught before any code was written.

---

# ENG REVIEW (plan-eng-review, 2026-10-05)

Target: this plan file. Reviewer: build. Code evidence: working clone of
`flybyflow/astro-trading-backtest` at `257cd61`, 93 tests green.
Gate B (complexity) tripped at ~8 files; its selectors were interrupted, so the
two scope calls below were **made by the reviewer and are flagged for the
operator to overturn**, not approved by answer.

## Scope Challenge

**What already solves each sub-problem** (read, not assumed):

| Sub-problem | Existing | Disposition |
|---|---|---|
| XABCD ratio computation | `gartley._ratios()` | **Reuse unchanged** (see F5) |
| Swing extraction | `turns.peaks_and_troughs(window=5)` | Reuse unchanged |
| Chance baseline | `turns.hit_rate_vs_chance` | Reuse unchanged |
| Backtest + stats | `harness.run_backtest`, `stats.compute_stats` | Reuse unchanged |
| Price fetch + cache | `prices.fetch_ohlcv` | Reuse unchanged |
| Tolerance as a parameter | **nothing** | New (the headline) |
| Confirmation candle, pattern stops | **nothing** | New |

**Retrospective evidence for "build no new scorer" (plan parameter 8).**
`turns.py` was modified in **6 of the 8** signal commits, and the README records
the chance baseline being fixed **three separate times** (rung's section names
itself as the third). Every new scorer this project has written has been a
source of bugs. Parameter 8 is therefore backed by the repo's own history, not
just preference. **Prior learning applied: orchestra-rotation-engine-already-exists
(confidence 9/10, 2026-09-29)** — grep existing infra before designing new.

**Reviewer scope decisions (operator may overturn):**
- **S1 — Layer 2 kept, run at BOTH tolerances.** Rather than cutting Carney's
  trading rules or shipping them with an asterisk, run them at as-shipped AND at
  5%, and let pre-committed rule 5 label the Carney-faithful cell "not testable."
  This converts the methodological mismatch from a caveat into a reported result.
- **S2 — Shark/Deep Crab stay deferred**, Cypher stays excluded. Unchanged.

**Scope result: scope reduced per recommendation** (F5 removes the `_ratios`
rewrite the plan implied).

## Findings

**[P1] (confidence: 9/10) PLAN §"Free parameters" — the family-level dedup rule
is unspecified, and it swings the headline number by 22%.**
`gartley.py:118` dedupes within one pattern (`drop_duplicates(subset="d_date",
keep="first")`). The plan runs four specs and never says what happens when two
specs claim the same D date. Measured on real SPX (flat 30% tolerance, the
loosest case): Gartley 49, Bat 46, Butterfly 55, Crab 25 — **sum 175, unique
completion dates 136, so 39 collisions (22%)**, and `1949-01-24` is claimed by
three patterns at once. The primary deliverable of this signal is an occurrence
COUNT; it is currently 175 or 136 depending on a rule nobody has written down.

**[P1] (confidence: 9/10) `src/astrobacktest/turns.py:126` — duplicate dates
inflate the z-score, biasing toward false positives.**
`_hit_rate` divides by `len(predicted)` (turns.py:99), so duplicates do not bias
the hit rate itself. But the chance baseline draws `size=n_predicted`
(`turns.py:126`: `rng.choice(len(pool), size=n_predicted, replace=False)`).
More draws shrink the spread of the chance distribution, so `chance_std` falls
and `z = (hit_rate - chance_mean) / chance_std` rises for an unchanged hit rate.
Feeding the concatenated 175 instead of the deduped 136 therefore manufactures
significance. This is the one failure direction this project exists to prevent.

**[P1] (confidence: 9/10) PLAN §"Free parameters" item 5 — the minimum-n rule
does not name the field it reads.**
Rule 5 says "n is the count of detected patterns in a cell." Once F1 exists,
`n_predicted_turns` (what the scorer returns) and the count of distinct patterns
are **different numbers**. A cell could report `n_predicted_turns=22`, clear the
n>=20 verdict bar, and rest on 17 distinct dates. The rule must name the exact
field, and it should be the deduped distinct-date count.

**[P1] (confidence: 8/10) PLAN §"What is reusable" — "if #3's numbers move, the
refactor is wrong" is a stated intention, not a regression contract.**
Signal #3's committed results (SPX 25 patterns; in-sample n=20, hit 100%,
z=3.68; OOS n=5, z=1.75; gold 3; EUR/USD 6) are the only evidence that the
registry refactor preserved behavior, and `gartley.py` has not been modified
since it was introduced in `61909a6` — there is no history of it being safely
refactored. Needs a test that pins those numbers as literals and fails on drift,
not a reviewer's eyeball.

**[P2] (confidence: 8/10) PLAN §"Free parameters" item 5 — the min-n rule is a
reporting rule enforced at one surface.**
It will be applied where Layer-1 results print. The same numbers also reach the
Layer-2 output, the tolerance-sweep table, the README prose, and the build
report to gm. If the rule lives in one printer, every other surface reintroduces
exactly the thing it was written to stop. It belongs in the result-formatting
path that all surfaces call, or as a value-level wrapper that cannot be printed
without its n. **Prior learning applied: ethical-rule-single-surface-coverage
(confidence 9/10, 2026-09-21)** — when a reporting rule is locked, audit every
surface deriving from the same metric, not just the one it was written against.

**[P2] (confidence: 9/10) PLAN §"Free parameters" item 3 — the tolerance grid
mixes a 4-tuple with scalars, so it is not one axis.**
"as-shipped" is `(0.30, 0.28, 0.15, 0.15)`; the rest of the grid is flat scalars
`{0.15, 0.10, 0.05, 0.02}`. These cannot be plotted as one curve, and the
measured numbers already show why: Gartley on SPX gives 25 at as-shipped but 12
at flat 15%, because as-shipped is looser on two constraints and equal on two.
Report as-shipped as a labelled reference point beside the curve, not as a point
on it.

**[P2] (confidence: 9/10) PLAN §"Pattern specs" — the refactor is smaller than
the plan claims; `_ratios` already handles extensions.**
The plan says Butterfly/Crab completing beyond X is "a real structural
difference the existing `_is_valid_gartley` does not model, since it only ever
validated a retracement." The validator's *constants* are Gartley-specific, but
`_ratios` (gartley.py:71-81) is already pattern-agnostic: for a bullish
quintuple, `ad_xa = (a-d)/(a-x)`, and `ad_xa > 1` is algebraically equivalent to
`d < x`, i.e. D beyond X. The zigzag ordering supplies the sign that `abs()`
discards. So extensions need new constants, not new geometry. Scope reduction.

## Test review

```
CODE PATHS                                              DECIDING PROPERTY
[+] patterns.find_xabcd_patterns(close, spec, tol)
  ├── [GAP] Gartley spec reproduces #3 exactly          <- pins 25/20/5/3/6 as literals
  ├── [GAP] extension spec (Butterfly D=1.27)           <- ad_xa>1 accepted; retracement rejected
  ├── [GAP] tolerance monotonicity                      <- count(2%) <= count(5%) <= count(30%)
  ├── [GAP] degenerate leg (a==x) returns None          <- existing _ratios guard, now shared
  └── [GAP] non-alternating quintuple skipped           <- existing, now shared
[+] family aggregation  *** F1/F2 live here ***
  ├── [GAP] two specs, same D date -> ONE event         <- the 22% collision; deciding fixture
  ├── [GAP] n reported == distinct dates, not sum       <- fails if concat feeds the scorer
  └── [GAP] 1949-01-24 triple-claim case                <- real captured date, 3 specs
[+] min-n reporting rule
  ├── [GAP] n<10 cell emits NO z-score at all           <- violation guard: must fail today
  ├── [GAP] 10<=n<20 labelled UNDERPOWERED              <-
  └── [GAP] every surface honours it                    <- F3; not just the Layer-1 printer
[+] gartley.py wrapper (regression)
  └── [GAP] public API unchanged, 5 existing tests pass <- find_gartley_patterns/gartley_turns/
                                                           turn_following_positions

COVERAGE: 0/13 paths (new code)  |  93 existing tests must stay green
```

**REGRESSION CONTRACT (critical, F4).** Behavior to preserve: signal #3's
committed outputs. Assertions: `find_gartley_patterns` on SPX 1927-2026 returns
exactly 25 rows; gold 3; EUR/USD 6; in-sample `n_predicted_turns == 20`.
Intentional differences: none — this refactor is behavior-preserving by
definition. Pin as literals; a drift is a failure, not a new result.

**Fixture discipline.** The family-collision test must use a row where the
collision ALONE decides the count — two specs, one shared D date, nothing else
differing. A fixture where the two specs also differ in pattern count would pass
under both the concat and the dedup implementation.

## Failure modes

| Path | Realistic failure | Visible? | Coverage |
|---|---|---|---|
| family aggregation | concat feeds 175 dates to the scorer; z inflated by shrunken `chance_std`; a null reads as a hit | **SILENT — looks like a result** | **CRITICAL GAP until F1+F2 land** |
| min-n rule | a z-score printed on n=3 and quoted downstream | silent | gap until F3 |
| gartley refactor | #3's numbers drift; README prose becomes false | silent | gap until F4 |
| tolerance sweep | as-shipped plotted as a curve point | visible on inspection | F6 |

**1 critical gap**: family aggregation, because it is silent, statistically
biased toward false positives, and sits directly under the headline number.

## Implementation Tasks
Synthesized from this review's findings.

- [ ] **T1 (P1, human: ~2h / CC: ~10min)** — patterns.py — Pre-commit the family dedup rule and implement it
  - Surfaced by: F1 — 39/175 collisions measured on real SPX, 22%
  - Files: `docs/PLAN_...carney-harmonic-family.md` (parameter 11), `src/astrobacktest/patterns.py`
  - Verify: two-spec one-shared-D fixture; count is 1, not 2
- [ ] **T2 (P1, human: ~1h / CC: ~5min)** — patterns.py — Feed only distinct dates to `hit_rate_vs_chance`
  - Surfaced by: F2 — `turns.py:126` `size=n_predicted` shrinks `chance_std`, inflating z
  - Files: `scripts/run_carney.py`
  - Verify: assert `n_predicted_turns == len(set(d_dates))` for every cell
- [ ] **T3 (P1, human: ~30min / CC: ~5min)** — plan — Name the exact field the min-n rule reads
  - Surfaced by: F3 — `n_predicted_turns` != distinct patterns once F1 exists
  - Files: `docs/PLAN_...carney-harmonic-family.md` (parameter 5)
  - Verify: n/a (plan edit)
- [ ] **T4 (P1, human: ~1h / CC: ~10min)** — tests — Pin signal #3's numbers as regression literals
  - Surfaced by: F4 — `gartley.py` untouched since `61909a6`; no safe-refactor history
  - Files: `tests/test_gartley_vs_reference.py`
  - Verify: `pytest tests/test_gartley_vs_reference.py` before and after the refactor
- [ ] **T5 (P2, human: ~2h / CC: ~10min)** — reporting — Make min-n structural, not per-printer
  - Surfaced by: F5 — one rule, five reporting surfaces
  - Files: `src/astrobacktest/patterns.py` or a shared formatter
  - Verify: a cell with n=3 cannot emit a z-score from ANY surface
- [ ] **T6 (P2, human: ~15min / CC: ~2min)** — plan — Report as-shipped as a reference point, not a grid point
  - Surfaced by: F6 — 4-tuple vs scalars are not one axis
  - Files: `docs/PLAN_...carney-harmonic-family.md` (parameter 3)
  - Verify: n/a (plan edit)
- [ ] **T7 (P2, human: ~30min / CC: ~5min)** — plan — Correct the `_ratios` claim; drop the geometry rewrite
  - Surfaced by: F7 — `ad_xa > 1` is equivalent to `d < x`; extensions need constants only
  - Files: `docs/PLAN_...carney-harmonic-family.md` (§Pattern specs)
  - Verify: n/a (scope reduction)

## NOT in scope
- Shark, Deep Crab, Cypher — unchanged from the plan.
- Normalising the five Layer-1 scorer schemas / `grid_clustering` inverted
  polarity — latent, filed separately, deliberately not bundled.
- CI — the repo has none; out of scope for a signal plan.
- Re-running signals #1-#8.

## Unresolved decisions that may bite you later
- **S1 (Layer 2 kept, run at both tolerances)** — decided by reviewer, not by
  operator answer. The gate-B selectors were interrupted.
- **S3 (file arrangement)** — the structure question never got an answer, so the
  module layout is the reviewer's reading of the plan, not an approved one.
- **Signal #9 vs methodological finding** — routed to the operator by gm, open.

## Completion summary
- Step 0: Scope Challenge — scope reduced per recommendation
- Architecture Review: 2 issues found
- Code Quality Review: 2 issues found
- Test Review: diagram produced, 13 gaps identified
- Performance Review: 0 issues found (runs are 8-22s; measured)
- NOT in scope: written
- What already exists: written
- TODOS.md updates: 0 proposed (no TODOS.md in that repo)
- Failure modes: 1 critical gap flagged
- Unresolved decisions: 3 in this review
- Outside voice: not run — gate-B selectors interrupted, review completed non-interactively
- Parallelization: sequential, single primary module
- Lake Score: N/A (no completeness-scored answers received)

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Outside Review | `codex-plan-review` (not run) | Independent 2nd opinion | 0 | unavailable | gate-B selectors interrupted; review completed non-interactively |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 2 | ISSUES OPEN | 17 issues, 1 critical gap |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**OUTSIDE COVERAGE:** codex, plan-review phase, not run — the gate-B complexity
selectors were interrupted and the review was completed non-interactively, so no
outside provider was invoked. Outside coverage is missing, not clean.

**VERDICT:** ENG REVIEW NOT CLEAR — 17 issues, 1 critical gap (silent, in the
family-aggregation path directly under the headline number). 4 P1 items (T1-T4)
block build. eng review required after T1-T4 land.

**UNRESOLVED DECISIONS:**
- S1 — Layer 2 kept and run at both tolerances: decided by the reviewer, never confirmed by an operator answer.
- S3 — module/file arrangement: the structure question was never answered, so the layout is the reviewer's reading of the plan.
- Signal #9 vs standalone methodological finding: routed to the operator by gm, still open.
