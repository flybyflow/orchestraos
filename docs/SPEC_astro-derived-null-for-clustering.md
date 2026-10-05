# SPEC: a DERIVED null for the clustering statistic (astro-trading)

- **Status:** proposal, for review. **Nothing implemented.** No number in the
  repo has moved on the strength of this.
- **Replaces:** `turns.grid_clustering_vs_chance`'s permutation null.
- **Why a spec and not a commit:** three hand-rolled nulls have now been
  attempted for this statistic (the shipped block-shuffle, my global pool
  draw, and two repairs of that). All three are wrong. The failure mode is
  that a permutation null here is *tunable*, and tuning it is what produced
  the original defect. A derived null cannot be tuned, which is the point.
- **Revision 3** (after second review). Two blockers from revision 2, both of
  them the defect this spec exists to eliminate, hiding one level deeper than
  it was looking: the new GATE had an undeclared tunable constant, and the
  promoted HEADLINE was a full-series number the pipeline never computes whose
  measured p-value is 0.125 and which does not replicate out of sample. The
  gate is rebuilt around a criterion with no knob; the headline is withdrawn
  entirely and nothing replaces it. The derived null underneath both was
  independently verified sound.
- **Revision 2** (after first review). The first draft was wrong in the direction
  of UNDERSTATING its own finding: it claimed "the verdict does not change"
  on the strength of a full-series statistic the pipeline never computes.
  Scored across the eight cells the pipeline actually produces, **it retracts
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

## What it gives on the real data — ALL EIGHT LIVE CELLS

**Correction to the first draft of this spec.** It quoted a full-series
`z = +0.32 → +0.91` and claimed *"the verdict does not change."* Both were
wrong. `scripts/run_jenkins_rung.py` splits at 2001-01-01 and scores eight
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

## MANDATORY gate — and the criterion is the ACF TRUNCATION LAG, not a cap

**Revision 2 had a hidden tunable in the gate it introduced.** For the time
cells the autocorrelation does not decay quickly, so `n_eff` was being set by
an undeclared max-lag cap. Measured on SPX time OUT:

| cap | 50 | 500 | 1000 | 2000 |
|---|---|---|---|---|
| n_eff | 443.1 | 55.4 | **30.5** | **21.4** |

That straddles revision 2's `n_eff ≥ 30` gate, so **one of the three claimed
retractions flipped on a constant the spec never declared** — inside a
document whose selling point is "it has no tuning parameters". The defect this
spec exists to retract, one level deeper than it was looking.

### The fix removes the knob rather than declaring a value for it

Run IPS to `n/2` with **no cap**, and **report the truncation lag**. The lag
itself is the diagnostic: if the ACF needs a large fraction of the sample to
decay, the ACF summary is not a usable variance estimate for that sample.

| cell | n | truncation lag | lag / n | n_eff |
|---|---|---|---|---|
| SPX price OUT | 6,287 | 2 | **0.0003** | 5,513 |
| gold price OUT | 6,275 | 3 | **0.0005** | 5,449 |
| SPX price IN | 18,330 | 36 | **0.0020** | 2,034 |
| gold price IN | 84 | 7 | **0.0833** | 32 |
| gold time OUT | 18,525 | 1,628 | **0.0879** | 36 |
| SPX time IN | 53,075 | 4,860 | **0.0916** | 55 |
| SPX time OUT | 18,450 | 1,988 | **0.1078** | 21 |

The separation is **two orders of magnitude**, not a knife edge.

**Gate: `truncation_lag / n ≤ 0.01`.** Scoring three cells, gating four, with
no constant to tune and a 40x margin either side of the boundary.

### What that fixes beyond the cap

- **It gates the whole time claim**, resolving revision 2's internal
  contradiction: that revision's heading said the time claim "must be gated
  out" while its `n_eff ≥ 30` gate admitted two time cells.
- **It independently catches gold price IN** (lag/n = 0.083), which revision
  2 caught only via the period-span criterion. Revision 2's `n_eff ≥ 30` did
  **zero work** on the cell it was built for: that cell's `n_eff` is 31.9 and
  passes.
- `n_eff ≥ 30` is retained only as a backstop, and **not** on revision 2's
  stated grounds. The claim "below which the normal z→p mapping is not
  available" was wrong — the mean of bounded symmetric `U(0,0.5)` variates is
  near-normal well below 30. The real issue is power: at `n_eff = 30` the
  minimum detectable effect is a 17% shift in `mean(d)`. **Any scored cell
  must report its minimum detectable effect alongside z**, or a "False"
  reads as evidence of absence when it is absence of evidence.

### The ≥2-distinct-moduli criterion was the wrong diagnosis, and is dropped

Under the derived null, grid variety is irrelevant: `d ~ U(0,0.5)` holds for a
single fixed modulus too. What actually breaks gold price IN is **coverage** —
84 serially-correlated closes sweeping `v/m` over less than two periods. A
cell with 2 moduli, 2.1 periods and `n_eff = 32` would pass all of revision
2's criteria and fail identically. Replaced by the lag/n rule above plus the
period-span requirement, which together target coverage rather than variety.

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
  has SD 0.09x the derived SE), and the claim in revision 2 that it
  would "reject a correct conditional null" rested on a phase-randomisation SD
  of 0.09x the derived SE. **That figure was wrong by ~10x** — measured 0.86
  to 0.98 across three standard surrogate constructions, which the floor
  ACCEPTS. No carve-out is needed, though the 7% margin is worth stating.
  Revision 2 corrected revision 1's floor arithmetic and introduced a new
  wrong number in the same bullet.

## How to validate it — NOT with `|z| < 3`, and NOT with the first draft's checks either

The first draft proposed false-positive rate ≈5% plus power against a planted
effect. **Its own design passes both** (FPR 0.025–0.072 across configurations,
power 0.91 at λ=0.05) while carrying a +0.40σ centre shift under the
unconditional ensemble and a 30x SE error at the other call site of the same
function. So "better than `|z| < 3`" was a low bar and clearing it proved
nothing.

Five assertions, each catching something the previous set missed:

- **C1. Calibrate at every real call-site configuration**, not one generic
  series. There are eight: {SPX, gold} × {price, time} × {in, out}. Only this
  catches the time claim, whose SE is 30x wrong while a generic series looks
  fine.
- **C2. Assert both tails and the centre**: `|mean(z)| < 0.2`, and *both*
  one-sided rates in [0.025, 0.08]. A single-tail bound cannot see a centre
  shift — the upper-tail rate here runs 0.090–0.125, 2–2.5x nominal, and the
  first draft's check never looked.
- **C3. Assert the SE estimator tracks the truth, per call site**:
  `0.85 < SE_est / MonteCarlo-SD < 1.2`. IPS scores 1.0 on the price claim and
  **29.7 on the time claim**. Revision 2 proposed [0.7, 1.4]; that band is
  both non-binding (C2 already implies [0.854, 1.19], strictly tighter) and
  wrong on the dangerous side — a ratio of 0.7 means the SE is 30% too small,
  running a nominal 5% test at 12.5%, which is the exact defect class this
  spec exists to kill. This is the single assertion that would have
  stopped the time claim being reported.
- **C4. Pin the centre conditionally, not by simulation**: assert a
  phase-randomisation reference mean is within 3e-04 of 0.25 at each call
  site. Exact, model-free, independent of any price model.
- **C5. Require the real grid to be an outlier in its own placebo family**
  (below), not merely against the theoretical null.

### C6 — the one assertion that needs no generator and no seed

C1–C3 all calibrate against a no-structure DGP that is never named, which is
the hole revision 1 fell through: choose the generator and you choose the
false-positive rate. One check escapes that entirely.

**Deterministic ramp.** Take `v` linear, `m = rung(v)`, assert
`mean(d) = 0.25`. No market model, no randomness, no seed. Verified:
0.250193 / 0.250237 / 0.250053 across three ramps, all within 0.21 iid-SE.
It isolates the grid arithmetic from any price-process assumption, and it is
the only check here that cannot be gamed by choice of generator.

### Live evidence that the runtime floor is needed

The identity detector shipped in `ce1a9cb` does **not** catch SPX time OUT:
its `chance_std` is `2.22e-06`, which is **0.0021x** the iid SE — 475x too
narrow — and it still reports `degenerate=False`, because the detector tests
float-identity (`NULL_IDENTITY_ATOL = 1e-12`) and near-identity slips through.
The dispersion floor rejects it (floor `9.20e-04`).

That is the concrete case for running the floor at runtime rather than only
against synthetic data in tests, and it is also the strongest single piece of
evidence that a published positive was manufactured by a degenerate baseline.

## Multiplicity — absent from the first draft entirely

Eight live z-scores, no correction anywhere in the repo. gold price OUT
currently ships p=8e-04 uncorrected, p=6e-03 after an 8-way Bonferroni. Any
rewrite must state the family size. This project already applies Bonferroni to
jenkins-triangle's seven ratios, so the precedent exists and was simply not
carried across.

## WITHDRAWN: the neighbour-rank "headline" is not a finding

Revision 2 promoted "the real rung ranks 7 of 7, worst in its own
neighbourhood" to the primary result. **It is withdrawn, on three independent
grounds, any one of which is sufficient.**

**1. It is not significant. p = 0.125, measured.** 200 GBM surrogates matched
to SPX's n, μ, σ and start: `P(rank == 1) = 0.125`, against `1/7 = 0.143`
under exchangeability. The neighbours are close to exchangeable, so the naive
combinatorial answer was right all along — rank-1-of-7 is one-in-seven.
Against this spec's own multiplicity requirement it is p ≈ 1.

Revision 2 called it "the strongest evidence available", "a result", and
"quotable", and **never computed its null**. The promotion rested on the
statistic being *deterministic* and *scale-exact*. Both are true and neither
is relevant: deterministic means no seed dependence, which says nothing about
how often chance produces the same arrangement.

**2. It is a full-series statistic the pipeline never computes.** The sweep
runs on the full SPX series (`mean(d) = 0.25222`); no pipeline cell has that
value (SPX price IN is 0.25290). **This is the exact defect revision 2 was
written to retract**, relocated from a supporting number to the primary
finding.

**3. It does not replicate out of sample.**

| cell | rank |
|---|---|
| SPX price FULL | 1 / 7 |
| SPX price IN | 1 / 7 |
| **SPX price OUT** | **3 / 7** |
| **gold price OUT** | **4 / 7** |

The arrangement exists only in the 1927–2001 in-sample span.

**"Scale-exact" was also wrong.** Price-claim moduli run 1–20 in-sample, so a
±3 shift is a 15%-to-300% perturbation per observation, and `k = −2, −3`
produce non-positive moduli requiring an undisclosed clip-to-1 that generates
the quoted values (dropping instead of clipping moves them by ~0.002, which is
the size of the whole claimed effect).

### What replaces it: nothing, and that is the finding

There is no headline for this signal. The honest statement is:

> Three published positive clustering verdicts are retracted. No surviving
> evidence for the rung formula in either direction, and the one piece of
> apparently-strong counter-evidence does not survive examination either.

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

## On the ±1 perturbation figure, finally

The first draft carried `z = +8.86` as "indicative, not a result" because its
null was unstable on noise. Revision 2 claimed the neighbour-rank sweep
discharged that caveat. **It did not** — see the withdrawal above. Both the
±1 figure and the rank sweep are now retired. Neither is evidence.

This is the third framing of the same underlying observation (the real rung
clusters no better than its neighbours), and each framing has been weaker than
the last on examination. That pattern is itself worth noting: an observation
that needs reframing three times to look like evidence is probably not
evidence.
