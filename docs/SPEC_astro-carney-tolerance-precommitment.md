# SPEC — Carney harmonic family: ratio-tolerance pre-commitment

**Status:** revision 1. Written **before any outcome is scored**.
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

## 2. The structural result: no valid tolerance exists

Tolerance is bounded from **above** and **below**, and the bounds do not meet.

**Upper bound — pattern distinguishability.** D is the discriminator between
the four patterns (the B ranges already overlap at 0% tolerance: Crab's
0.382–0.618 fully contains Bat's 0.382–0.5 and touches Gartley's 0.618). The
tightest adjacent D pair is Gartley 0.786 vs Bat 0.886, whose windows collide at

    t = (0.886 − 0.786) / (0.886 + 0.786) = 5.98%

Above that, a detected pattern cannot be attributed to one Carney pattern
rather than another, so "which pattern fired" stops being a well-posed question.

**Lower bound — power.** This project's own precedent (Gartley) called SPX
in-sample **n=20** "the one adequately-powered cell" and ruled n=2 and n=6
cells not-findings. Reaching n≈20 on all three instruments requires **t=10%**.

**5.98% < 10%. There is no tolerance that is both distinguishable and
adequately powered.**

At the largest distinguishable tolerance (t = 5.9%):

| instrument | Gartley | Bat | Butterfly | Crab | total |
|---|---|---|---|---|---|
| SPX | 3 | 8 | 5 | 8 | 24 |
| gold | 2 | 1 | 0 | 1 | 4 |
| silver | 3 | 4 | 1 | 2 | 10 |

**No single pattern on any instrument reaches n=20; the maximum is 8.** Only
pooled SPX (n=24) clears the bar, and pooling is precisely what the
distinguishability constraint exists to protect.

---

## 3. THE PRE-COMMITMENT

**Tolerance = 5.9%**, fixed, applied symmetrically to every ratio bound.

Grounds, in order:

1. It is the **largest** value that keeps the four patterns distinguishable
   (ceiling 5.98%). Anything larger answers a different question than the one
   Carney's method poses.
2. It is chosen as a **maximum under a hard constraint**, not tuned. There is
   exactly one defensible value in [0, 5.98%) once the goal is "most data while
   the patterns remain distinct", and this is it. No search, no optimisation.
3. Lower values are strictly worse on power with no offsetting gain: 0% gives
   n=0 everywhere, 1% leaves gold at 0, 2% leaves gold at 0.

**Why 10% is rejected despite being the only adequately-powered option:** at 10%
the Gartley and Bat D-windows overlap, so the four "patterns" are no longer four
patterns. Loosening to reach n would be answering an easier question and
reporting it as the hard one — and gm's standing instruction is that rarity is
a finding, not a reason to loosen the rules.

### 3.1 The verdict, pre-committed now rather than discovered later

**Expected outcome: underpowered, no per-pattern verdict.** With per-pattern
n ≤ 8, no individual pattern can be tested on any instrument. This is stated
here, before scoring, so that a post-hoc "promising but not significant" framing
is unavailable.

The **only** cell with arguable power is pooled SPX (n=24), and it answers a
strictly weaker question: *did the ratio family as a whole do anything*, not
*does the Gartley pattern work*. Precedent from `jenkins_triangle`: a pooled
test across 7 ratios had **no power** against a single-ratio alternative
(planted one-ratio effect, 0/20 detections). The same dilution applies here with
4 patterns, so a null pooled result must not be reported as evidence against any
individual pattern.

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
