# SPEC — AstroBoys (operator's TradingView script) as a testable claim

**Status:** revision 1, awaiting review. **Nothing is built against this yet.**
**Source:** `docs/reference/AstroBoys_source.pine` @ `7fbea93`, 1308 lines,
Pine v5, operator's own published script. Ported **as published, bugs
included** — per gm's explicit instruction, because a silently-corrected
version tests a script that does not exist.

---

## 0. DISCLOSURE FIRST — what I have already seen

This cannot be a clean pre-registration for the headline question, because the
cheap kill-check gm asked for ran before this document existed and it went
further than a base rate. Everything I have looked at, so a reviewer can
discount accordingly:

**Firing rates** (no outcomes): SPX 0.2146, gold 0.4314, silver 0.0451. By SPX
price era: 0.0000 (<10), 0.0444 (10–100), 0.2283 (100–1000), 0.5166 (1000+).
Across spiral offsets num ∈ {1,2,5,9,25,100,180,290,361}: 0.1913–0.2214.

**Outcomes — this is the contaminating part.** P(price turn within ±4d | cross)
= 0.6335 against 0.5982 unconditional, lift **+0.0353** (≈5.2 binomial SD at
n=5282). After matching cross against non-cross days **within |Δclose| decile**,
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

## 4. Pre-committed claim and the two controls it REQUIRES

> **Claim.** A cross event predicts a price turn (`turns.price_turns`) within
> ±4 calendar days at a rate exceeding a matched control, where the control
> holds constant both the price era and the size of the move that produced the
> cross.

Both controls are mandatory, and each is justified by a measured confound:

**Control 1 — move size.** A cross *requires* `|Δclose|` to exceed the distance
to the nearest level, so crosses select for large moves, and large moves sit
near turns for reasons unrelated to Gann. Measured: median `|Δclose|` is
**2.5× larger** on cross days. Matching on `|Δclose|` decile already removed
~63% of the naive lift. Not controlling for this measures "big days happen near
turns."

**Control 2 — price era.** Firing rate runs 0.0000 → 0.5166 monotonically
across SPX's own price bands. The relative level gap is `0.5/sqrt(price)`, so
levels tighten against volatility as price grows. This is the same
non-scale-invariance that made `jenkins_entry_stop` degenerate.

**Consequence: the project's standard 2001 split is NOT safe here.** Pre-2001
SPX is overwhelmingly the sub-1400 regime and post-2001 above it, so an
in/out-of-sample comparison measures price era rather than time stability.
Report the split **stratified by price band**, or not at all.

### 4.1 A third confound, specific to Claim B

Spiral ring radius is a deterministic function of num, and num is the sun's
longitude — so **the solar variant has a built-in annual cycle in its own
firing rate, generated by Ulam geometry and containing no astronomy.** Measured
spread across num: 0.1913–0.2214, ≈11.5 binomial SD.

A naive test would find seasonal structure in Claim B, correctly, and it would
be arithmetic. **The fixed-num control must therefore be matched on offset
magnitude**, not merely set to num=1.

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

1. **Is §0's contamination acceptable?** I have seen both the naive and the
   volatility-matched lift. A reviewer may hold that no pre-registration by me
   is now meaningful for this question and that the honest output is the
   descriptive findings (§2, §4's confounds) with no verdict. That is a
   legitimate call and costs little, since §2 stands on its own.
2. Are two controls enough, or does the residual +0.0131 have a further
   explanation that should be controlled before anything is scored?
3. Is "turn within ±4d" the right outcome at all, given the script makes no
   directional claim and `±4d` is inherited from other signals rather than
   derived from this one?
4. Should a bug-corrected variant be a separate later claim? gm's call was to
   not block the as-published test on it; this spec follows that.
