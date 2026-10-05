# SPEC — Carney harmonic family: ratio-tolerance pre-commitment

> ## ⚠️ REVISION 2 — REVISION 1'S HEADLINE CLAIM WAS WRONG
>
> Revision 1 concluded "no valid tolerance exists". **That was an error of
> mine, caught by my own distinguishability test**, which returned zero
> overlapping detections at 10% where revision 1 predicted some.
>
> **The mistake:** I computed the distinguishability ceiling on the D ratio
> ALONE (Gartley 0.786 vs Bat 0.886 → 5.98%). But a run is double-counted
> only if **both** its B and D windows overlap. Gartley's B (0.618) and Bat's
> B (0.382–0.5) do not overlap until **10.55%**. I had reasoned "B doesn't
> discriminate" from the fact that Crab's wide 0.382–0.618 range contains
> Bat's — and over-generalised one pair's property to the whole family.
>
> **True ceiling = 10.55%** (Gartley vs Bat, both ratios). Power needs 10%.
> **10% < 10.55%, so a valid tolerance DOES exist**, in the narrow window
> [10%, 10.55%). The §2 impossibility result is withdrawn. §1's rarity
> result is unaffected and still stands on its own.
>
> Pre-commitment revised accordingly in §3.

**Status:** revision 2. Written **before any outcome is scored**.
**Supersedes the Layer-1 design in** `PLAN_astro-trading-mvp-carney-harmonic-family.md`,
which carries a live ⛔ DO-NOT-BUILD banner ("needs a rewrite, not a patch").

---

## 0. Disclosure

I have seen **pattern counts** at tolerances 0/1/2/5/5.9/10% on SPX, gold and
silver, and the arithmetic of when pattern windows overlap. I have **not**
scored any outcome — no hit rate, no forward return, no z. Choosing a tolerance
on the basis of counts is sample-size planning, which is legitimate; it is
recorded here because the counts were seen first and that fact travels.

---

## 1. The headline result, which needs no null and no tolerance choice

**At faithful precision, Carney's patterns do not occur.**

| tolerance | SPX (98y) | gold (25y) | silver (25y) |
|---|---|---|---|
| **0%** | **0** | **0** | **0** |
| 1% | 4 | 0 | 1 |
| 2% | 5 | 0 | 3 |
| 5% | 19 | 4 | 9 |
| 10% | 54 | 21 | 22 |

Zero on every instrument at exact ratios. This is a direct count, not an
inference — it needs no chance baseline, no split, and no verdict. gm's relayed
figure of "~1–2 per century at full precision" corresponds to roughly 1–2%
tolerance; at genuinely full precision it is nothing at all.

## 2. The structural result: a valid tolerance exists, but the window is narrow

Tolerance is bounded from **above** by distinguishability and from **below** by
power. Revision 1 claimed the bounds did not meet; that was wrong.

**Lower bound — power.** This project's own precedent (Gartley) called SPX
in-sample **n=20** "the one adequately-powered cell" and ruled n=2 and n=6
cells not-findings. Reaching n≈20 on all three instruments requires **t=10%**.

**Upper bound — pattern distinguishability.**
~~D is the discriminator; the tightest adjacent D pair is Gartley 0.786 vs Bat
0.886, colliding at t = 5.98%.~~ **Struck — this was revision 1's error.** The 5.98% figure is the ceiling on
the D ratio alone. Distinguishability requires BOTH B and D to overlap, and the
binding pair is Gartley vs Bat at **10.55%**:

| pair | D overlaps at | B overlaps at | BOTH (binding) |
|---|---|---|---|
| **Gartley vs Bat** | 5.98% | 10.55% | **10.55%** |
| Butterfly vs Crab | 12.05% | 11.97% | 12.05% |
| Bat vs Butterfly | 17.81% | 22.24% | 22.24% |
| Gartley vs Butterfly | 23.54% | 11.97% | 23.54% |
| Bat vs Crab | 29.23% | never (Crab contains Bat) | 29.23% |
| Gartley vs Crab | 34.61% | never | 34.61% |

**10% < 10.55%, so the admissible window is [10%, 10.55%).** Verified
empirically: `overlapping_detections` returns 0 at both 10% and 10.5% on all
three instruments.

For the record, counts at revision 1's withdrawn 5.9% — kept because it shows
what the error would have cost: every per-pattern cell ≤8, gold at 4 total, and
a false conclusion that the signal could not be tested at all.

| instrument (t=5.9%, superseded) | Gartley | Bat | Butterfly | Crab | total |
|---|---|---|---|---|---|
| SPX | 3 | 8 | 5 | 8 | 24 |
| gold | 2 | 1 | 0 | 1 | 4 |
| silver | 3 | 4 | 1 | 2 | 10 |

---

## 3. THE PRE-COMMITMENT

**Tolerance = 10.0%**, fixed, applied symmetrically to every ratio bound.
(Revision 1 said 5.9%, on the withdrawn ceiling.)

Grounds, in order:

1. It is the **smallest** value that reaches adequate power while the patterns
   remain distinguishable — the admissible window is [10%, 10.55%), and 10% is
   its floor. Choosing the floor keeps fidelity to Carney's ratios maximal
   subject to the power constraint, rather than harvesting the extra
   detections available at 10.5%.
2. It is therefore a **minimum under a hard constraint**, not a tuned value:
   "smallest tolerance that is both adequately powered and distinguishable" has
   exactly one answer. No search, no optimisation.
3. Everything below 10% fails power: 0% gives n=0 everywhere, 1% and 2% leave
   gold at 0, 5% leaves gold at 4, 5.9% leaves gold at 4 and every per-pattern
   cell at ≤8.

Counts at the pre-committed 10% (0 overlapping detections on all three):

| instrument | Gartley | Bat | Butterfly | Crab | total |
|---|---|---|---|---|---|
| SPX | 12 | 16 | 11 | 15 | 54 |
| gold | 6 | 6 | 4 | 5 | 21 |
| silver | 7 | 7 | 4 | 4 | 22 |

**On loosening:** gm's standing instruction is that rarity is a finding, not a
reason to loosen the rules, and that still binds. 10% is not chosen to harvest
detections — it is the floor of the admissible window, and the §1 rarity result
is reported as the headline regardless of what the 10% cells show. What changed
between revisions is a fact about where the ceiling is, not a decision to relax
anything.

### 3.1 The verdict, pre-committed now rather than discovered later

**Expected outcome: weakly powered; treat any per-pattern result as
provisional.** At 10%, per-pattern n is 11–16 on SPX and 4–7 on gold/silver,
against this project's n≈20 precedent. SPX per-pattern cells are now within
reach of a verdict where revision 1 said none was possible; gold and silver
remain under-powered per pattern. This is stated
here, before scoring, so that a post-hoc "promising but not significant" framing
is unavailable.

Pooled cells (SPX 54, gold 21, silver 22) clear the n≈20 bar comfortably, but
they answer a strictly weaker question: *did the ratio family as a whole do
anything*, not *does the Gartley pattern work*. Precedent from
`jenkins_triangle`: a pooled test across 7 ratios had **no power** against a
single-ratio alternative (planted one-ratio effect, 0/20 detections). The same
dilution applies here with 4 patterns, so a null pooled result must not be
reported as evidence against any individual pattern.

---

## 4. Layer 1 is the forward-magnitude question, not date alignment

The plan's Layer 1 is the Gartley tautology. Carney's D comes from
`peaks_and_troughs`; ground truth is `price_turns` on the same window, so
predicted turns are a subset of ground truth by construction. Verified earlier
for Gartley: hit rate 1.0000 even at zero tolerance, and
`candidate_conditional_hit_rate_vs_chance` correctly reports the question
degenerate.

Built as the plan specifies — with all four eng-review P1 fixes applied — it
yields **hit=1.000, z=9.57** full / 8.51 in / 4.75 out: a new apparent edge that
replicates out-of-sample and is entirely artifact. **This is not to be built.**

Instead: `turns.forward_move_vs_chance` with `knowable_lag = PRICE_TURN_WINDOW`,
scoring the signed forward move anchored 5 bars after D, against a
direction-matched permutation of the same candidate swing quintuples. That is
the substitution that worked for Gartley, for the same reason.

## 5. Other fixed choices

- Instruments: SPX, gold, silver. Split 2001-01-01 where n permits; where a
  split leaves a cell under n=10 it is reported as unsplit with that stated.
- The four eng-review P1 fixes still apply (including the duplicate-completion-
  date dedup: 175 raw → 136 unique). They are correct but second-order; the
  banner's point stands that applying them made the artifact look *more*
  rigorous, which is why §4 matters more than they do.
- **Shark is excluded** from the four-pattern tolerance analysis above: it
  completes at C on an O-X-A-B-C structure, a different shape than the XABCD
  quintuple the candidate pool enumerates. It needs its own detector and its own
  count before any claim; not folded in silently.

## 6. What review should decide

1. Is 5.9% the right reading of "largest distinguishable", or should the ceiling
   be computed on a different pair / a non-symmetric tolerance?
2. Given §2, is there any point scoring the pooled-SPX cell at all, or is the
   honest deliverable §1 + §2 alone — "this method does not occur often enough
   at its own stated precision to be tested"?
3. Is excluding Shark correct, or does it need building before anything is
   reported?
