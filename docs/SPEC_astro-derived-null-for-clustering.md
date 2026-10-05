# SPEC: a DERIVED null for the clustering statistic (astro-trading)

- **Status:** proposal, for review. **Nothing implemented.** No number in the
  repo has moved on the strength of this.
- **Replaces:** `turns.grid_clustering_vs_chance`'s permutation null.
- **Why a spec and not a commit:** three hand-rolled nulls have now been
  attempted for this statistic (the shipped block-shuffle, my global pool
  draw, and two repairs of that). All three are wrong. The failure mode is
  that a permutation null here is *tunable*, and tuning it is what produced
  the original defect. A derived null cannot be tuned, which is the point.
- **Revision 2** (after review). The first draft was wrong in the direction
  of UNDERSTATING its own finding: it claimed "the verdict does not change"
  on the strength of a full-series statistic the pipeline never computes.
  Scored across the seven cells the pipeline actually produces, **it retracts
  all three published positive results.** It also needed a degeneracy gate it
  did not have, without which it manufactures a new false positive of its own.
  Both corrections are recorded in place rather than silently folded in.

## The problem, restated precisely

`grid_clustering_vs_chance` asks whether `value mod modulus` sits closer to a
multiple than chance would put it. Its null sorts observations by modulus and
then **permutes the modulus within rank blocks** — it stratifies on the very
quantity it shuffles. `rung()` maps a huge value range onto few distinct
moduli (42 across 24,617 SPX observations), so most blocks are
modulus-constant and the permutation is the **identity**.

Measured: `chance_std` swings 12x with `block_size` alone (4.3e-05 → 5.4e-04)
while the numerator never moves.

And the criterion used to tune it — `|z| < 3` on pure noise — is satisfied
**more** easily the more degenerate the null becomes, so the documented tuning
of `block_size` downward was hill-climbing toward the identity.

## The derived null

Under the no-structure hypothesis, `u = (v mod m)/m` is uniform on `[0,1)`,
and the statistic per observation is `d = min(u, 1-u)`.

For `x ∈ [0, 0.5]`: `P(d ≤ x) = P(u ≤ x) + P(u ≥ 1-x) = 2x`.

So **`d ~ Uniform(0, 0.5)`** exactly, giving

```
E[d]  = 0.25
SD[d] = 0.5 / sqrt(12) = 0.1443375
```

**Verified numerically**, 5,000,000 draws: `E[d] = 0.250079`, `SD = 0.144359`.
Not taken on the algebra alone.

### The part that is not free: observations are not independent

Daily closes are serially correlated, so `n` is not the sample size. Measured
on the real SPX `d` series: `rho_1 = 0.489`, `rho_5 = 0.194`, `rho_20 = 0.041`.

Effective sample size by initial-positive-sequence truncation,
`n_eff = n / (1 + 2*Σρ_k)`, truncating at the first non-positive `ρ`:

```
n      = 24,617
Σρ     = 3.0  (truncated at lag 38)
n_eff  = 3,486        ~7x reduction
```

### The test

```
SE = SD[d] / sqrt(n_eff)
z  = (mean(d) - 0.25) / SE
```

Negative `z` means more clustered than chance; the signal's claim is a
one-sided test on that tail.

## What it gives on the real data — ALL SEVEN LIVE CELLS

**Correction to the first draft of this spec.** It quoted a full-series
`z = +0.32 → +0.91` and claimed *"the verdict does not change."* Both were
wrong. `scripts/run_jenkins_rung.py` splits at 2001-01-01 and scores seven
cells; it never computes the full series, so the first draft validated
against a number the system does not produce.

| cell | n | distinct moduli | n_eff | published | derived | gate |
|---|---|---|---|---|---|---|
| SPX price IN | 18,330 | 20 | 2,034 | **z=−2.02, clusters=TRUE** | **z=+0.91** | scored |
| SPX price OUT | 6,287 | 30 | 5,513 | z=+0.51, False | z=+0.12 | scored |
| SPX time IN | 53,075 | 28 | **55** | z=−0.24, False | z=+0.06 | scored, no power |
| SPX time OUT | 18,450 | 9 | **21** | **z=−1.59, clusters=TRUE** | z=−0.03 | **GATED** |
| gold price IN | 84 | **1** | 32 | z=nan (guard fires) | z=−2.42 | **GATED** |
| gold price OUT | 6,275 | 27 | 5,449 | **z=−3.14, clusters=TRUE** | **z=+0.55** | scored |
| gold time IN | 45 | **1** | 3 | z=nan | z=+0.14 | **GATED** |
| gold time OUT | 18,525 | 9 | 36 | z=−0.39, False | z=−0.00 | scored, no power |

### The headline: this retracts all three published positives

The repo currently ships **three** `clusters_beyond_chance_p05=True` verdicts
from this scorer. The derived null retracts every one — two by returning a
benign z (SPX price IN, gold price OUT) and one by gating (SPX time OUT).

That is the opposite of the first draft's claim. This is not a case of
"tested incorrectly and got the right answer by accident"; it is a case of
**three positive results produced by a degenerate baseline**.

The degeneracy is visible in the shipped output and was read by six review
passes without anyone checking it: `chance_mean` tracks `mean_dist` to four
decimals in every row (0.2529 vs 0.2531, 0.2513 vs 0.2513, 0.2499 vs 0.2499).

## MANDATORY: a degeneracy gate, or this spec manufactures its own positive

The first draft had no analogue of the existing `chance_std == 0` guard, and
would therefore have **created a new false positive where the current code
correctly refuses one**: gold price IN is 84 consecutive closes with **one
distinct modulus**, for which the shipped scorer returns `nan` and this
spec's formula returns **z = −2.42**, past the bar.

Required preconditions, returning `nan` rather than a number:

- **≥ 2 distinct moduli.** With one modulus there is no grid variety to test.
- **`v/m` spanning ≥ 2 full periods**, so the circular residual actually wraps.
- **`n_eff ≥ 30`**, below which the normal z→p mapping is not available.

Replacing a permutation with a formula silently removed a safety the
permutation had. Any derived null must re-create the guard it displaces.

## The time claim must be gated out, not given a number

Its `n_eff` collapses to **21–55** from n of 18k–53k, and the derived z's are
+0.06, −0.03, −0.00 — a test with no resolution in either direction. The
dependence is structural overlap across the concatenated k-step blocks
(k=1..25), not serial along the array, so **no stationary-series variance
estimator can fix it**, ACF or block bootstrap alike.

Gate it. A z computed on 21 effective observations is not a weak result, it
is not a result.

## Why this is better than any permutation here

- **It has no tuning parameters.** No `block_size`, no `seed`, no trial count.
  The dominant failure mode of every previous attempt is removed by
  construction rather than guarded against.
- **It is falsifiable in the right place.** The only judgement left is the
  `n_eff` estimator, which is an explicit, standard, separately-checkable
  choice rather than a buried constant.
- **The dispersion-floor claim in the first draft was WRONG.**
  `tests/test_null_dispersion_floor.py` uses `0.5/sqrt(n)`, which is
  `sqrt(12) = 3.46x` SD[d] — not "this same theoretical SE". With
  `MIN_DISPERSION_RATIO = 0.25` the real margin is **13%**, not the "factor of
  4, generous" the file's own comment claims. It remains a valid floor, but
  the arithmetic and the comment both need correcting, and it would **reject a
  correct conditional null** (an exact phase-randomisation reference on gold
  has SD 0.09x the derived SE), so it needs a carve-out before any exact
  randomisation test can coexist with it.

## How to validate it — NOT with `|z| < 3`, and NOT with the first draft's checks either

The first draft proposed false-positive rate ≈5% plus power against a planted
effect. **Its own design passes both** (FPR 0.025–0.072 across configurations,
power 0.91 at λ=0.05) while carrying a +0.40σ centre shift under the
unconditional ensemble and a 30x SE error at the other call site of the same
function. So "better than `|z| < 3`" was a low bar and clearing it proved
nothing.

Five assertions, each catching something the previous set missed:

- **C1. Calibrate at every real call-site configuration**, not one generic
  series. There are seven: {SPX, gold} × {price, time} × {in, out}. Only this
  catches the time claim, whose SE is 30x wrong while a generic series looks
  fine.
- **C2. Assert both tails and the centre**: `|mean(z)| < 0.2`, and *both*
  one-sided rates in [0.025, 0.08]. A single-tail bound cannot see a centre
  shift — the upper-tail rate here runs 0.090–0.125, 2–2.5x nominal, and the
  first draft's check never looked.
- **C3. Assert the SE estimator tracks the truth, per call site**:
  `0.7 < SE_est / MonteCarlo-SD < 1.4`. IPS scores 1.0 on the price claim and
  **29.7 on the time claim**. This is the single assertion that would have
  stopped the time claim being reported.
- **C4. Pin the centre conditionally, not by simulation**: assert a
  phase-randomisation reference mean is within 3e-04 of 0.25 at each call
  site. Exact, model-free, independent of any price model.
- **C5. Require the real grid to be an outlier in its own placebo family**
  (below), not merely against the theoretical null.

## Multiplicity — absent from the first draft entirely

Seven live z-scores, no correction anywhere in the repo. gold price OUT
currently ships p=8e-04 uncorrected, p=6e-03 after a 7-way Bonferroni. Any
rewrite must state the family size. This project already applies Bonferroni to
jenkins-triangle's seven ratios, so the precedent exists and was simply not
carried across.

## Two-sided, with neighbour-rank as the PRIMARY report

The one-sided framing cannot express the strongest evidence available. Sweeping
the modulus by k (scale-exact, deterministic, no seeds):

| k | −3 | −2 | −1 | **0 (real)** | +1 | +2 | +3 |
|---|---|---|---|---|---|---|---|
| mean(d) | 0.24604 | 0.24544 | 0.24804 | **0.25222** | 0.24521 | 0.24887 | 0.24177 |

**The real rung is the only grid above 0.25, and ranks 7 of 7 — worst in its
own neighbourhood**, deterministically and independently of which SE is used.
This supersedes the unstable ±1 figure the first draft carried as "indicative";
it is now a result. Make neighbour-rank the headline and the theoretical z a
supporting statistic.

Second-order caution from the same table: 6 of 6 neighbour grids sit *below*
0.25, and two clear the one-sided bar under the derived SE. So "mean(d) < 0.25"
is reachable by generic sqrt-scaled grids on this series, and a negative z
alone is not evidence for *this* formula.

## Resolved — the first draft's three open questions

1. **`n_eff` estimator:** use IPS **for the price claim** — no bandwidth knob,
   inside the moving-block-bootstrap plateau, within 7% of an exact
   phase-randomisation reference. For the **time claim, neither works** (IPS
   29.7x too large, MBB 3.5–20x and monotone in L with no plateau). They
   disagree catastrophically, and that disagreement *is* the finding: gate the
   time claim out.
2. **Does it transfer to `crossing_` / `sloped_line_`?** **No — and not for
   the reason the first draft guessed.** It is not that the distribution is
   binomial rather than `U(0,0.5)`; it is that **the null does not exist**.
   In both, the shuffled quantity is a deterministic monotone function of the
   covariate conditioned on (`offset = close**0.25`;
   `slope = tan(angle/fraction)`), so there is no randomness in the treatment
   to permute at all. A binomial route also fails: the no-structure hit
   probability depends on volatility and barrier depth, with no parameter-free
   `p`. **Recommended instead:** randomise what is actually arbitrary — the
   line's *origin* for `sloped_line_`, and relative depth stratified by
   *realised volatility* for `crossing_` (precondition checked:
   Spearman(depth, 20d realised vol) = **+0.091**, near-independent, so that
   stratification is non-degenerate unlike price rank). Failing that, a
   placebo-family rank. And drop the word "chance" from those two scorers —
   they are specification tests, not chance tests.
3. **One-sided framing:** no. See the two-sided section above.

## Open question that remains

The derived centre is exact *conditional on the real path* (phase
randomisation confirms 0.25 to 6e-05) but is ~0.4σ optimistic under the
unconditional GBM ensemble, because paths lingering at small moduli shift it.
Roughly 40–50% of a reported +0.91 is therefore ensemble artifact;
bias-corrected, SPX price IN reads ≈ +0.5. Whether to report the conditional
or the unconditional figure is a real choice and I have not made it.

## Supersedes the first draft's "indicative, not a result"

The first draft carried a ±1 perturbation figure of z=+8.86 with an explicit
caveat that the ±1 null was itself unstable on noise (+1.79, −6.54, +2.09),
and instructed that it not be cited as more than indicative. The
neighbour-rank sweep above replaces it: **rank 7 of 7, deterministic,
scale-exact, no seeds, no SE dependence.** The caveat is discharged, and the
underlying claim — the real rung clusters *worse* than its own neighbours —
survives in a quotable form.
