# SPEC — AstroBoys (operator's TradingView script) as a testable claim

**Status:** revision 3 — **CLAIM B IS LOCKED.** Pre-registered 2026-10-05
before any B outcome existed. Claim A is descriptive-only.
**Nothing is built against this yet.**
**Source:** `docs/reference/AstroBoys_source.pine` @ `7fbea93`, 1308 lines,
Pine v5, operator's own published script. Ported **as published, bugs
included** — per gm's explicit instruction, because a silently-corrected
version tests a script that does not exist.

---

> ## RULING, 2026-10-05 — SPLIT A/B
>
> Review ruled: **Claim A (fixed num) is descriptive-only, no verdict** — the
> matched residual is +0.0131 (SE 0.0082, z=1.60), not distinguishable from
> zero, and I have already seen it. **Claim B (solar nudge) remains
> pre-registrable**, because no *outcome* data exists for it at any num.
>
> Correction to the ruling's stated basis, confirmed against disk: there are
> **five** AstroBoys scripts, not four, and `astroboys_nudge.py` **does** call
> `all24` at num ∈ {1,2,5,9,25,100,180,290,361}. It measures **firing rate
> only** — no outcome — so the split holds, but on "no B outcome data" rather
> than "no script touched B". The nine-num firing-rate sweep is disclosed in
> §0 below.

## 0. DISCLOSURE FIRST — what I have already seen

This cannot be a clean pre-registration for the headline question, because the
cheap kill-check gm asked for ran before this document existed and it went
further than a base rate. Everything I have looked at, so a reviewer can
discount accordingly:

**Firing rates** (no outcomes): SPX 0.2146, gold 0.4314, silver 0.0451. By SPX
price era: 0.0000 (<10), 0.0444 (10–100), 0.2283 (100–1000), 0.5166 (1000+).
Across spiral offsets num ∈ {1,2,5,9,25,100,180,290,361}, SPX only:
0.1913–0.2214. **This last item is the one piece of num≠1 data I have seen.**
It is the magnitude of Confound 3, not an outcome — it says how large the
nuisance term is, not whether the signal predicts anything.

**Structural counts** (not association data, listed because "everything" should
mean everything): 5282 cross events, 2887 ground-truth turns, 24617 bars;
743 cross dates are themselves turns (14.07%) against an 11.73% unconditional
rate — the tautology check, which came back negative.

**Outcomes — this is the contaminating part.** P(price turn within ±4d | cross)
= 0.6335 against 0.5982 unconditional, lift **+0.0353** (≈5.2 binomial SD at
n=5282) — note this unconditional baseline is the wrong comparison, see §4
Control 1; the correct cross-vs-non-cross figure is +0.0449. After matching cross against non-cross days **within |Δclose| decile**,
the lift falls to **+0.0131**, inconsistently signed across deciles (4 of 10
negative, the largest positive being n=44).

So I know the approximate answer to "does a cross predict a turn" before
pre-committing. §4 is written to be a pre-registration of the **controlled**
test, not of the naive one, and a reviewer may reasonably judge that
insufficient. See §7.

---

## 1. What the script actually computes

Verified line-by-line, not from a summary (the summary differed in five
material respects).

- `calcAdjustedValue(v) = ceil(sqrt(v) + 2.0)`.
- `calcCycleCount`: from `number_value = 1`, repeat `v := adj(v); v := v*v`
  until `v >= (close - addition) * decimal_multiplier`, counting iterations.
- Pivots: a loop with a **branch** — `if cycles >= 3: for i = 0 to cycles-3`
  else `for i = 0 to cycles`. Pine's `to` is inclusive, so that is
  `cycles-2` climbs vs `cycles+1` climbs. **Discontinuous and non-monotone at
  cycles = 3** (2 cycles → 3 climbs, 3 cycles → 1 climb). Ported verbatim.
- `calcLevels(p)` → 8 levels, each with its own offset combination:
  `ceil((p+1.25)²)−h`, `ceil((p+1.5)²)−(h+v)`, `ceil((p+1.75)²)−v`,
  `ceil((p+2)²)+(h−v)`, `ceil((p+0.25)²)+h`, `ceil((p+0.5)²)+(h+v)`,
  `ceil((p+0.75)²)+v`, `ceil((p+1)²)+1−(h−v)`. The trailing **`+1` on the last
  level appears on no other level**; ported verbatim.
- Trigger (line 1273): `ta.cross(close, L)` OR'd over all 24 levels
  (8 angles × 3 pivots). **Close-to-close, not intraday.**
- Defaults: `addition=0.0`, `decimal_multiplier=1.0`, `autoCycle=true`,
  **`useSunDegree=false`**, `manualSunDegree=1`.

### 1.1 Two bugs, ported deliberately

1. **Spiral table, num=2.** The 361-case table is a structurally perfect square
   spiral (ring *r* holds exactly 8*r* cells at nums (2r−1)²+1…(2r+1)²) except
   that num=2 returns `(1,0)`, duplicating num=4, leaving `(0,-1)`
   unreachable. Affects ~1 day/year (sun longitude 1–2°). A correct closed-form
   implementation disagrees with the literal table here; the port follows the
   table and flags the cell.
2. **The `cycles >= 3` discontinuity** above.

Both carry an inline comment naming them as source bugs reproduced on purpose.

---

## 2. The finding that holds regardless of any backtest

**The default configuration contains no astrology.** `useSunDegree` defaults
to `false` with `manualSunDegree = 1`, and num=1 maps to offset `(0,0)`. As
published and as a user first loads it, AstroBoys is a pure Gann Square-of-9
grid with zero spiral offset.

Further, its level increments {0.25…2.0} are exactly `d/180` for
d ∈ {45°…360°}, which is `gann.py`'s committed formula
(`(sqrt(center) ± d/180)²`, "a full revolution adds 2 to the root") — i.e.
**signal #2**. Default AstroBoys differs from it only by a moving centre and
integer ceiling.

**Therefore this is a variant of signal #2, not a ninth signal.** It does not
supersede `crossing_` or `secret_angle` (different constructions entirely) and
must not be folded into their count.

---

## 3. Two claims, not one

They are different hypotheses and conflating them would let a large,
scale-driven effect masquerade as solar.

- **Claim A (fixed num).** No time dependence, no ephemeris. Tests a Gann grid.
  Not an astrological claim at all.
- **Claim B (solar num).** `num = ceil(sun ecliptic longitude)`, so the offset
  changes daily. This is the only astrological claim in the script.

**B's control is PHASE ROTATION, not Claim A and not any fixed num.** An
earlier revision proposed testing B against a fixed-num control matched on
offset magnitude. That is withdrawn as *not implementable* — see §4.1.

### 3.1 INTERPRETATION CEILING — what a positive Claim B can and cannot mean

**`num = ceil(sun longitude)` is, to measurement precision, a calendar
lookup.** Stated as an exact integer fact, with no aggregation choice hiding
inside it:

> Across 1927–2025, **knowing the date pins `num` to at most 3 adjacent
> integers out of 360** — mean 2.32, always contiguous, with a single
> exception at day-of-year 79 (the March equinox) where the 0/360 wraparound
> splits the range.

Verified here independently of review, who proposed this framing. It replaces
an earlier degree/percentile table in this section: review and I had measured
that quantity differently and disagreed by ~0.5°, and the reconciliation was
two stacked methodology differences — they measured `ceil`'d `num` where I
measured raw longitude, and they took per-day-of-year maxima where I took
per-observation values. That is fully nailed down and nothing about it remains
open.

Three causes were *guessed* before that, and all three were wrong: leap-year
day-of-year alignment and calendar-vs-trading days (change the result by
<0.01°), and a span crossing 1900 — dead on both grounds, since review's range
is 1927–2025 and a century skip would add a full day of drift, predicting
1.75 × 0.9856 = **1.72°** rather than the 1.20° observed. The correct
explanation was on nobody's list, which is the argument for testing candidate
causes instead of ranking them by plausibility.

The integer statement above has no such degrees of freedom, which is why it is
the one that belongs in a locked document.

**Do not confuse this with the sampling-hour question in §4.** They look like
the same confound and are orthogonal. This statistic is measured relative to
each day-of-year's own values, so a **constant** time offset cancels in it
(verified: identical at hour 0 and hour 12). The sampling-hour question is
*nothing but* a constant offset, and flips `num` on 49.4% of days. One is
blind to constant shifts; the other is made entirely of them. Resolving
either says nothing about the other — recorded so the next reader does not
re-derive the same wrong coupling, as both gm and I initially did.

**Therefore, a ceiling on what any positive Claim B result could mean:**
at best it is evidence that *this particular day-of-year function beats other
day-of-year functions*. It is **never** evidence of astronomy specifically.
A solar-longitude signal and a calendar signal are not distinguishable on this
data by any test, however well controlled.

This is written **before any Claim B outcome exists**, and it is a constraint
on interpretation rather than on the test — the test itself is unchanged.
It is recorded here rather than in §4.1 because §4.1's existing point ("a
naive test would find seasonal structure, correctly, and it would be
arithmetic") is about **firing rate**; this is about what a positive
**outcome** may be claimed to mean. Different claims.

---

## 4. Claim A is descriptive-only. Claim B is pre-registered here.

**CLAIM A (fixed num) — NO VERDICT, descriptive findings only.** I have already
seen its answer: matched residual **+0.0131, SE 0.0082, z=1.60**, not
distinguishable from zero. A has no confirmatory test and will not be given
one. Report the numbers with their standard errors and stop. The four confounds
below are reported as **descriptions of why A's naive lift is not evidence**,
not as controls for a test A will not receive.

**CLAIM B (solar num) — pre-registered below, before any B outcome exists.**

> **Claim B.** With `num = ceil(sun ecliptic longitude)`, a cross event
> predicts a price turn (`turns.price_turns`) within ±4 calendar days at a rate
> exceeding a **phase-rotation** control, which holds the entire construction —
> including the radius path and the cycle-step machinery — exactly as the solar
> variant generates it, and randomises only angular position.

All four confounds below are mandatory controls for B, each justified by a
measured quantity.

> #### ⚠️ ONE PARAMETER OF CLAIM B IS NOT YET PINNED: THE SAMPLING HOUR
>
> `num` is `ceil` of the sun's longitude **at some instant of the day**, and
> this spec does not yet say which. Until it does, "Claim B" names roughly two
> dozen different tests rather than one, so **the lock is incomplete on this
> axis** — stated plainly rather than discovered later.
>
> It is a spec gap, **not a validity bug**: phase rotation shares whatever
> hour is chosen between the real series and every surrogate, so the null
> stays honest either way.
>
> Why it is load-bearing, measured: this repo's `ephemeris.py` uses
> `DEFAULT_HOUR = 12.0` (noon UT); the script uses
> `AL.J2000(AL.JDN(time, 0, tz))`, sampling off the bar's own timestamp with
> `tz` defaulting to 0 — **not noon**. That convention difference flips `num`
> on **49.4%** of days. A genuine ephemeris *precision* difference flips it on
> ~0.9%. The hour is a **50× larger** effect than the choice of ephemeris.
>
> The "Observer Location" lat/long inputs are a red herring for ecliptic
> longitude: solar parallax matters on ~0.2% of days and both default to 0.
> `tz` is the only load-bearing argument.
>
> **Resolution:** the operator has been asked to read sun-degree values off
> their own chart for known dates. Whatever hour the published script actually
> uses will show up there regardless of theory — the same oracle pattern that
> caught a 346/361-cell error in the spiral. The resolved hour gets recorded
> here explicitly, **stated rather than inherited by default** from this
> repo's convention just because it is familiar. Nothing is scored until then.

**Control 1 — move size.** A cross *requires* `|Δclose|` to exceed the distance
to the nearest level, so crosses select for large moves, and large moves sit
near turns for reasons unrelated to Gann. Measured: median `|Δclose|` is
**2.5× larger** on cross days.

The correct baseline is cross vs **non-cross**, not cross vs all bars — the
unconditional group *contains* the cross days, which understates the effect
being removed. Cross 0.6335 vs non-cross 0.5886 = **+0.0449** (SE 0.0075,
z=5.97). Against that, the decile-matched residual of +0.0131 is a **70.8%**
removal, not the 63% an earlier revision claimed.

**Every residual is reported with its SE from here on.** A bare point estimate
of +0.0131 reads as "small but present"; with SE 0.0082 (z=1.60) it is not
distinguishable from absent, and those are different claims.

**Control 2 — price era.** Firing rate runs 0.0000 → 0.5166 monotonically
across SPX's own price bands. The relative level gap is `0.5/sqrt(price)`, so
levels tighten against volatility as price grows. This is the same
non-scale-invariance that made `jenkins_entry_stop` degenerate.

**Consequence: the project's standard 2001 split is NOT safe here.** Pre-2001
SPX is overwhelmingly the sub-1400 regime and post-2001 above it, so an
in/out-of-sample comparison measures price era rather than time stability.
Report the split **stratified by price band**, or not at all.

### 4.1 Confound 3 — the Ulam annual cycle, specific to Claim B

Spiral ring radius is a deterministic function of num, and num is the sun's
longitude — so **the solar variant has a built-in annual cycle in its own
firing rate, generated by Ulam geometry and containing no astronomy.**

The argument is structural and needs no statistic. (An earlier revision quoted
"≈11.5 binomial SD" across the num sweep; **withdrawn** — it compares
correlated rates computed on the same series against a single-rate binomial SD,
which is not a valid test. The measured spread 0.1913–0.2214 stands as a
description; the inference drawn from it does not.)

A naive test would find seasonal structure in Claim B, correctly, and it would
be arithmetic.

**The control is phase rotation, and it is the same object as §5's.**

An earlier revision proposed a fixed-num control "matched on offset magnitude".
That is withdrawn for two reasons, the first fatal:

**1. It is not implementable — there is no well-defined target to match on.**
Firing rate is not a function of |offset|. My own nine-num sweep is the dataset
that refutes it:

All nine measured nums, not a subset — the two endpoints the surrounding
prose cites (num=2 is the max, num=361 the min) are rows here:

| num | offset | \|offset\| | firing rate |
|---|---|---|---|
| 1 | (0,0) | 0.00 | **0.2146** |
| 2 | (1,0) | 1.00 | **0.2214**  ← max |
| 5 | (1,1) | **1.41** | **0.2178** |
| 9 | (−1,−1) | **1.41** | **0.2148** |
| 25 | (−2,−2) | 2.83 | **0.2146** |
| 100 | (5,4) | 6.40 | 0.2123 |
| 180 | (4,−7) | 8.06 | 0.2200 |
| 290 | (−8,−9) | 12.04 | 0.2000 |
| 361 | (−9,−9) | 12.73 | **0.1913**  ← min |

Same magnitude, different rate (rows 1–2) means rate is not a function of
|offset| at all. Same rate, different magnitude (rows 3–4) means the inverse
map is not defined either. And rate is not even monotone in magnitude
(6.40→0.2123, 8.06→0.2200, 12.04→0.2000). "Match the control on offset
magnitude" therefore names no procedure.

**2. Choosing any fixed num at all is a selection risk.** All nine candidate
nums have measured firing rates, so picking one — even unintentionally — could
favour B, since rate correlates with move-size mix and that projects onto the
B-minus-A contrast at an order comparable to the whole effect that killed
Claim A. Phase rotation makes this moot: **no num is ever chosen.**

The control that works holds the radius path exactly as the solar variant
generates it and randomises only angular position: **phase-rotate the
sun-longitude series**. §4.1 and §5 specify one control, not two.

### 4.2 Confound 4 — the cycle-count step (found in review, not by me)

`cycle_count(close)` is a **step function**. When close crosses an odd square
the count increments, all 24 levels jump ~2 in root space (~8 gaps at once),
and a cross becomes near-certain regardless of how large the price move was.
Measured: **P(cross | step day) = 0.9330** (n=851) against
**P(cross | no step) = 0.1888**, and **15.0% of all cross events are
step-driven**.

Control 1's decile matching does **not** close this — step-days correlate with
move size but are not matched on it (23% step-driven in decile 9, ~0% on
non-cross days by construction).

**WHO CLOSES IT: §5, not §4.** Responsibility is assigned, not left open.
The phase-rotation null of §5.1 is the mechanism, and it closes Confound 4
because under phase rotation the `cycle_count` step pattern is a function of
the price path alone and is therefore held fixed by construction. §5.1's
definition of "hold the construction fixed" explicitly names the cycle-step
machinery for exactly this reason.

§4's controls (move size, price era) do **not** close it and are not expected
to. Excluding step days outright is a **fallback only**, engaged if and only if
an implementation cannot preserve the step pattern under rotation — it is not a
co-equal option to choose between.

Silence on this point would not be acceptable: a null that re-randomises levels
but regenerates the step pattern freely would leave the confound in place.

### 4.3 Resolution ceiling on the outcome variable

**59.8% of all bars** are already within ±4 days of a turn, so the maximum
possible lift is 0.40 against a naive observed 0.035. The test is largely
**resolution-limited by window width**.

The ±4d window is a project standard, not a per-signal dial, so it is **not**
changed here. But the ceiling is recorded so that a small lift is not read as a
small effect when it may be a saturated measurement. **Flagged as a
project-wide question, out of scope for this spec:** does the standard ±4d
window saturate for other signals too? The same arithmetic applies to Claim B.

---

## 5. Null design

Not specified here beyond its required properties, deliberately — this project
has repeatedly shipped nulls that were chosen by a criterion that rewarded
degeneracy.

The null must: (a) hold the construction fixed and randomise only the claimed
quantity (the pattern that worked for `jenkins_triangle`); (b) be **calibrated
on no-structure series before use**, reporting mean z, SD z and false-positive
rate; (c) be **power-tested against a planted effect at realistic density**,
not a saturated one; (d) report
`turns.rate_null_is_inert` / `null_sd_over_sampling_sd`, since three scorers in
this project shipped nulls whose dispersion was an order of magnitude below the
statistic's own sampling floor.

**Explicitly rejected in advance:** tuning any null parameter to hold `|z| < 2`
on noise. That criterion is satisfied most easily by the most degenerate null
and has already produced three defective scorers here.

### 5.1 The null is phase rotation, and "hold the construction fixed" is defined

The null for Claim B is **phase rotation of the sun-longitude series**: keep
the real `num` trajectory's shape and therefore its radius path, and shift only
where in the year it starts. This is the same object as §4.1's control — one
mechanism, not two.

**"Hold the construction fixed" explicitly includes the cycle-step machinery**
(§4.2), not merely the level formula. A null that re-randomises levels while
regenerating `cycle_count` steps freely would leave Confound 4 wide open, since
step days carry P(cross)=0.9330 on their own. Under phase rotation the step
pattern is a function of the price path alone and is therefore held fixed by
construction — which is the reason this null is chosen over any that
re-derives levels independently.

If an implementation cannot preserve the step pattern, the fallback is
**excluding step days outright** as a third mandatory control. One or the other
must be in place; neither being present is a defect, not a judgement call.

---

## 6. Scope and reporting

- Instruments: SPX, gold, silver. No EUR/USD (the ladder is degenerate near
  price 1).
- Report the firing rate per price band alongside every result; it is the
  dominant term and hiding it would repeat the sqrt-of-sqrt writeup's error.
- No Layer 2. The script is an alert indicator with no directional claim;
  inventing a position rule would be a larger interpretive leap than the
  Jenkins-music construction already flagged as one.

---

## 7. What review should decide

1. **RESOLVED — B does not contaminate; B is LOCKED.** Review's reasoning,
   worth keeping: the test is whether what I learned was derivable *a priori*.
   The Ulam construction predicts rate variation from no data at all, unlike
   Claim A's measured +0.0131, which is derivable from nothing. Sharper form:
   firing rate is **exposure**; the claim is about **outcome conditional on
   exposure**; and no amount of P(cross) constrains P(turn | cross).
   Superseded detail below.

   **(superseded)** Claim A is descriptive-only; Claim B stays
   pre-registrable. One correction to the ruling's basis is recorded in the
   banner — `astroboys_nudge.py` did run num≠1, but firing-rate only. **Open
   sub-question for the reviewer:** does having seen the nine-num firing-rate
   sweep (i.e. Confound 3's magnitude) contaminate B? My read is no — knowing a
   nuisance term's size is not knowing the answer — but it is their call, and
   if yes, B collapses to descriptive-only alongside A.
2. Are the four confounds enough for Claim B, or is there a fifth? Confound 4
   was found in review and not by me, which is evidence the list may not be
   closed.
3. Is "turn within ±4d" the right outcome at all, given the script makes no
   directional claim and `±4d` is inherited from other signals rather than
   derived from this one?
4. Should a bug-corrected variant be a separate later claim? gm's call was to
   not block the as-published test on it; this spec follows that.
