# SPEC — AstroBoys (operator's TradingView script) as a testable claim

**Status:** revision 2 — review ruling applied, all five fixes in.
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

**B must be tested against A as its control, not against an unconditional
baseline** — that is the only comparison in which the wheel, and the price-scale
confound below, cancel.

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
measured quantity:

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

**The control is phase rotation, and it is the same object as §5's.** An
earlier revision proposed a fixed-num control "matched on offset magnitude on
average" — that does **not** close the confound, because it leaves the annual
cycle intact. The control that works holds the radius path exactly as the solar
variant generates it and randomises only angular position: **phase-rotate the
sun-longitude series**. §4.1 and §5 therefore specify one control, not two.

### 4.2 Confound 4 — the cycle-count step (found in review, not by me)

`cycle_count(close)` is a **step function**. When close crosses an odd square
the count increments, all 24 levels jump ~2 in root space (~8 gaps at once),
and a cross becomes near-certain regardless of how large the price move was.
Measured: **P(cross | step day) = 0.9330** (n=851) against
**P(cross | no step) = 0.1888**, and **15.0% of all cross events are
step-driven**.

Control 1's decile matching does **not** close this — step-days correlate with
move size but are not matched on it (23% step-driven in decile 9, ~0% on
non-cross days by construction). Two acceptable closures, and the spec requires
one of them explicitly:

- the phase-rotation null of §5, **provided "hold the construction fixed"
  explicitly includes the cycle-step machinery and not merely the level
  formula**; or
- excluding step days outright, as a third mandatory control.

Silence on this point is not acceptable: a null that re-randomises levels but
regenerates the step pattern freely would leave the confound in place.

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

1. **RESOLVED by the ruling:** Claim A is descriptive-only; Claim B stays
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
