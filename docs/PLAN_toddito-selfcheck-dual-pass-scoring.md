# PLAN — toddito self-check: dual-pass scoring (THOR pattern)

## 0. What this is

Operator wants self-check to follow `docs/THOR_ENGINE.md`'s existing pattern
for the org-diagnostic: two independent scoring passes over the same
transcript, run side by side. Agreement = high confidence. Divergence = a
clinical signal to surface, not noise to average away.

Self-check already has the LLM pass (`src/lib/self-check/{prompt,run,score}.ts`,
shipped). This plan is for the **deterministic** pass — the role `thor-score.ts`
plays for the org-diagnostic — plus the comparison/divergence layer on top.

## 1. The gap (confirmed, not recalled)

- `GPASCORE.ASF` and `GPAQUEST.ASF` (`~/conductor/repos/mic-program-toddito/`)
  are `data`-typed (binary), not text. **Superseded, see §3 step 1:** the
  aggregation logic itself lives in `GPALIB.ASF`, the APL function library,
  which *does* survive as recoverable text — the question was never "is the
  formula readable," it was "which file is it in."
- builder-3's prior verification (items, facets, 4-rung ladder, refusal
  behavior) is verbatim-confirmed against the same files. 1987's aggregation
  for the **DEV/CULT dimensions** is a weighted count over a booleanised
  incidence matrix (integer row weights, then plus-reduce) — traced via
  `CALC`/`GENANSM`, and the Fable pass (§3 step 1) **confirmed this is
  scoped to Dev-Stage weighting only — nothing in the CR module is weighted
  that way.** Client Relationship's own method (relayed from the Fable
  agent, not yet independently verified): a **unit-weighted mean per
  dimension** — structurally closer to `score.ts`'s mean-of-facets than the
  DEV/CULT method, though not identical (per-dimension weights 0.2/0.5/0.5
  vs. our unweighted mean, plus a non-linear ±100/±33/0 score map vs. our
  linear scale). See §3 step 1 for the full verified/relayed split.
- `GPAQUEST.ASF` strings confirm "Client Relationship" is THOR's own name for
  this module ("THE CLIENT RELATIONSHIP MODULE renders a diagnosis of the
  extent to which you have managed to build trust and credibility...").

## 2. Ground-truth requirement — MV6COMBO lead was WRONG, corrected by builder-3

The operator is explicit: build validation tests against real 1987
worked/ground-truth examples **before** trusting any reverse-engineered
formula — same rigor as THOR's F8 harness (`src/lib/scoring/thor-score.test.ts`),
which found THOR's own reverse-engineered weight matrix produces **wrong**
rankings vs ground truth, and still ships `it.fails` tests documenting the
known divergence rather than silently patching it.

~~`MV6COMBO.ASC` Client Relationship column is usable ground truth~~ —
**dead end, confirmed by builder-3.** `strings` only confirmed the column
*header* exists; it does not confirm the cell data. All 10 CR rows carry one
single distinct value-tuple (`0.0 0.0 0.0 100.0 0.0 100.0`) — a degenerate
"unanswered module," not real variance (contrast `CULTURE` in the same file,
which varies properly). Column 6 does decode cleanly against THOR_ENGINE.md's
own cited numbers, so this genuinely is the fixture THOR uses — just with no
Client Relationship signal in it. The ground-truth hunt is still open:
untried per builder-3 — `COMBO.PRN`/`WILC.PRN`, the other `GP?SCORE.ASF`
variants, `CPCSP.AWS`/`GPCSP.AWS` (same size, paired, worth checking as a pair).

## 2a. Two more corrections from builder-3's first pass (2026-10-16)

- **1987 scored TEN Client Relationship dimensions, not six**: Trust,
  Credibility/Respect, Network, Realistic Expectations, Perceived Relevance,
  Aware of Services, Time Invested, Access, Price, Use of Competitors. Our
  shipped six (`src/lib/self-check/items.ts`) is a **collapse** of these ten
  (e.g. `Price` + `Perceived Relevance` → our `value`; `Use of Competitors` +
  `Aware of Services` → our `awareness`). The facet *names* and ladder are
  still verbatim-1987 (unchanged finding) — only the dimension *count* was a
  wrong assumption on my (plan's) part, not builder-3's.
- **`GPASCORE.ASF` is likely a data/resource container, not compiled code.**
  No APL signature (unlike the `MGP*.ASF` rater files, which carry
  `APL*PLUS/PC RTSVERS 7.1`); it has a header offset/length table (LE word
  pairs) and plaintext section identifiers (`DEV`, `STRUC`, `CULT`, `LAUNCH`,
  `ACCELERATION`, ... ). Reads as a resource file the APL workspaces/`.EXE`s
  consume, not machine code to decompile. Not fully confirmed — header walked,
  not yet parsed — but changes the method if it holds: parsing a documented
  container, not x86 disassembly.

**Decision (plan, 2026-10-16): target the recovery at 1987's native ten-
dimension granularity**, roll up to our shipped six for the report-facing
comparison. **Resolved with evidence by builder-3, same day** — not just a
judgement call anymore:

- Our 16 items are the **complete** 1987 module, 1:1 by ordinal
  (`GPAQUEST.ASF` offset 42276, 204-byte fixed-width records, exactly 16
  before the next section starts) — CR01–CR16 against 1987 items 1–16. We
  are not a subset; a recovered formula applies directly to our data.
- The derived mapping — **a dated derivation snapshot, not a second source
  of truth.** `items.ts` is canonical for item→facet; it just doesn't carry
  the 1987 dimension name, which is the one column below it cannot supply.
  The `our facet` column is redundant with `items.ts` (kept for readability);
  if it ever disagrees with `items.ts`, that's a visible flag to resolve, not
  two systems silently diverging:

  | 1987 dimension | 1987 items | our facet | source |
  |---|---|---|---|
  | Trust | 1,2,3,4,5 | `trust` | read — unambiguous |
  | Realistic Expectations | 6 | `expectations` | read — unambiguous |
  | Network | 14,16 | `network` | read — unambiguous |
  | Aware of Services | 9 | `awareness` | read — unambiguous |
  | Use of Competitors | 10 | `awareness` | read — unambiguous |
  | Perceived Relevance | 7 | `value` | read — unambiguous |
  | Price | 15 | `value` | read — unambiguous |
  | Time Invested | 8 | `access` | read — unambiguous |
  | Access | 11 | `access` | **corrected 2026-10-16** — was `[11,12]`, wrong |
  | Credibility/Respect | 12,13 | `access` | **corrected 2026-10-16** — was `[13]` only, flagged as judgement, and the judgement was wrong. `GPDDMS.AWS`'s `# Relationship` block (question list @102103–102143, group vector immediately after) gives the literal 1987 split: Access=[11], Credibility/Respect=[12,13]. Both still land in `access` so the roll-up's facet sizes are unchanged by luck, not design — see PR #29 §ii below. |

- **Why compare at 6, not 10**: seven of 1987's ten dimensions are
  single-item. A divergence signal computed over single-item dimensions is
  dominated by one-rating-step noise, which undermines "divergence = clinical
  signal." At 6, every facet except `expectations` absorbs noise across 2+
  items. Our collapse doesn't lose fidelity — it *reduces* a fragility 1987
  already had. `expectations` stays single-item on both sides regardless,
  so it's the one facet where a divergence signal is weakest.

**Load-bearing precondition on the roll-up method (builder-3, verified
2026-10-16): every one of 1987's ten dimensions lands entirely inside a
single one of our six facets — none straddles two.** That is *why* "roll up
via `items.ts`'s existing facet assignments, don't maintain a second
mapping" is valid, not just convenient — if a dimension ever split across
two facets, the roll-up would be ambiguous (which facet gets the
contribution?) with no rule to resolve it. The method works because the
partition happens to be clean, not by construction, and the §2a table above
makes a future drift *visible* rather than silent (it would disagree with
`items.ts`) — detectable beats silent, so this is a downgrade from "could
break silently," not a non-issue.

**Approved now, ahead of the scorer (builder-3's proposal): a ~20-line test
fixture** carrying the 1987 `dimension → item ordinals` mapping, asserting
that rolling it up through `items.ts`'s facet assignments reproduces our
shipped facet sizes (`trust 5, access 4, awareness 2, value 2, network 2,
expectations 1`). This is gate-shaped, not scorer code — it validates a
recovered-structure claim against the shipped instrument, which the
tests-before-scorer gate already asks for, and it is cheap enough to build
during the research phase rather than waiting for step 3.

Net: **recover at 10** (the formula that actually exists), **convert 10→6**
via the table above, **display at 6** (unchanged, per gm), **compare
dual-pass at 6** (noise reason above). Ground-truth validation tests operate
at whatever granularity the actual worked examples turn out to have.

**PR #29 open, head moved `406d079` → `e10386b` (`brollistika/toddito`): the
fixture test above, built, then corrected for the Access/Credibility-Respect
item split fix.** Four assertions — full item coverage, no dimension
straddles two facets (names the offender), the ten roll up to our exact
shipped sizes, the recorded mapping. `tsc`/`vitest` clean (37 files, 292
passed + 2 expected-fail). **Honest note from builder-3, written into the
fixture's header, not just this doc:** the three structural assertions did
NOT change when the item split was corrected, and that's luck, not design —
items 11, 12, 13 are all `access`, so the wrong split and the right split
land in the same facet either way. The identical class of error on a
dimension spanning two facets would have made the fixture assert a false
partition while still passing every test in it. Re-review/re-test needed
against `e10386b`, not `406d079` — docs/fixture only, mutants re-verified by
exit code after the correction per builder-3, independent re-verification
still worth doing given the head moved.

**Worth keeping as its own lesson: builder-3's first version of this test
claimed a guarantee it didn't provide, and only mutation testing caught it.**
The original 3 assertions were structure-only, commented as "guard the
reverse direction." A size-preserving facet swap (CR13↔CR15: `Price`→`access`,
`Credibility/Respect`→`value`) changes no size, creates no straddle, and
passed all three — the exact case the comment claimed was covered. Fixed by
hardcoding the facet column as the 4th assertion, which necessarily encodes
builder-3's one judgement call (item 13) as asserted fact — acceptable
*because* §2a already frames that mapping as a dated, visibly-flaggable
snapshot rather than a silent truth. Same error class as this session's
"OR-clause needs a deciding fixture" lesson: a guard's comment described
what was intended, not what the assertions actually excluded, and only
running the adversarial case (not reasoning about it) revealed the gap.

**Independently verified by test-g2, but pinned to `406d079` — now stale,
head moved to `e10386b` above, needs re-pin:** reproduced the mutation-catch
claim from a clean worktree — `tsc` clean, `vitest` 37/292 +2 expected-fail
matches, and re-applied the CR13/CR15 swap directly to confirm it now fails
(the 4th assertion specifically, exit 1). Good verification of the commit it
checked; does not cover the item-split correction at `e10386b`.

## 3. Task sequencing

1. **builder-3 — research, no scoring code yet.** ~~Reverse-engineer
   GPASCORE.ASF via disassembly~~ corrected: first **characterise the
   container** — walk the header offsets, see whether sections resolve to a
   parseable definition rather than code. Cheap, and decides parse-vs-decompile
   before the Fable-model pass is scoped. Then run the Fable-model pass aimed
   at whichever artifact (container or the APL workspaces/`.EXE`s) actually
   holds the arithmetic — not guessing from the instrument's documented
   structure. Keep hunting ground truth per §2's untried list.
   Deliverable: a brief naming the recovered formula (or the honest limit of
   what's recoverable, at ten-dimension granularity) and whatever ground-truth
   cases exist, same "confirmed vs inferred" discipline as the rest of this arc.

   **Container characterisation done (builder-3, 2026-10-16).** `GPASCORE.ASF`
   decoded: index at bytes 8–120, chains with 0 breaks, confirms
   parse-not-decompile for this region. ~~Only 14 entries, 22% of the file
   (51025 / 225280 bytes), so there's at least one more structure here.~~
   **CORRECTED by the Fable pass: 46 live components, 99% coverage.** The
   22%/"one more structure" read came from breaking the index-walk loop on
   the first gap instead of skipping it — there wasn't a second structure to
   find, the first parse just stopped early. ~~**Negative result:** the two
   long bitmaps in records 2/3 (960/1540 bits) are NOT an incidence matrix —
   tested against real counts, neither factors to match.~~ **OVERTURNED, see
   below — the factor test was sound but the premise (global totals) was
   wrong; the bitmaps ARE incidence data, just sectional.**

   **Breakthrough (builder-3, 2026-10-16): APL source recovered as text —
   the real aggregation is a WEIGHTED COUNT over an incidence matrix, not a
   mean.** `GPALIB.ASF` (the APL function library) survives as text — line
   numbers, labels, localised-variable headers; the glyphs are lost but
   control flow is legible. Recovered so far (DEV/CULT branch, not yet CR):
   `GENANSM` builds an incidence matrix (`ANSM`) from the answer vector via
   `FREAD STN,n` component reads (`n=2,3,5,7` seen) — this is why the earlier
   factor test against *global* counts never matched: the bitmaps are
   **per-section**, not file-wide. `CALC`'s arithmetic:
   `R←R='1' ... R[7;]×4 ... R[9 23;]×2 ... R←+/R` — booleanise the incidence
   matrix, multiply specific rows by integer weights, plus-reduce. **This is
   the DEV/CULT pipeline only — whether Client Relationship aggregates the
   same way is unestablished** (corrected 2026-10-16, caught by builder-3
   one message after this entry was first written; `CRG`, the CR-adjacent
   function, is a renderer reading a different component (31), not a traced
   scorer). Do not yet conclude `score.ts`'s mean-of-facets is structurally
   different from 1987's *CR* method — it's plausible, given the shared
   `GENANSM`/`CALC` machinery, but unconfirmed, and the Fable pass is
   targeting exactly this.

   **Self-correction worth keeping, builder-3's own words:** "a failed factor
   test is not evidence of absence... I should have said inconclusive, not
   not the incidence matrix." Declining to fit noise toward a hypothesis is
   right; a failed test only refutes the specific thing tested (global
   totals), not the broader hypothesis (incidence data in general).

   Fable pass launched, targeting (in order): the CR analogue of
   `CALC`/`GENANSM` (may be in one of 7 sibling `GP?LIB.ASF` files), the
   actual CR weights, the normalisation behind `MV6COMBO.ASC`'s six columns,
   confirm-or-refute on the `CALC` reading above. Briefed to label every
   claim VERIFIED/INFERRED/GUESSED, that "not recoverable" is an acceptable
   result, and explicitly not to fit a plausible formula to look complete —
   a formula that reproduces one example isn't recovered unless it's
   distinguished from the alternatives. Given what was just gotten wrong in
   the *other* direction (declaring absence too early), that instruction is
   load-bearing in both directions now.

   Ground truth: still none for CR specifically. Gate unmet.

   **Fable pass returned (builder-3, 2026-10-16). Split by what builder-3
   verified from the raw bytes directly vs what the agent reported and
   builder-3 is relaying unverified — do not collapse this distinction.**

   *Verified by builder-3, independently, from the bytes:*
   - The item→dimension split above (§2a table) was wrong; corrected to the
     literal 1987 grouping via `GPDDMS.AWS`.
   - **The per-item score map is non-linear: `100, 33, 0, −33, −100`** (int16
     literals), not a linear Likert step — so "mild agreement" is ±33, not
     the ±50 a linear 5-step map would imply.
   - Container coverage corrected to 46 components / 99% (above).
   - The `CALC` weighted-count-over-incidence-matrix finding is **confirmed
     scoped to Dev-Stage weighting only** (demographic q7 ×4, q9/dev-q23 ×2)
     — **"nothing in the CR module is weighted that way."** This settles
     (doesn't just hedge) the §1 correction: CR does NOT use the DEV/CULT
     method.

   *Relayed from the Fable agent, NOT yet independently verified by
   builder-3 — treat as INFERRED, not VERIFIED, until someone checks it:*
   - **CR aggregation = unit-weighted mean per dimension**, not a weighted
     count: `Trust ×0.2, Credibility/Respect ×0.5, Network ×0.5`, the other
     seven single-item dimensions presumably ×1. No CR incidence matrix and
     no CR branch of `GENANSM` — CR is scored by three separate paths
     (`S∆VEC∆CALC`, `S∆RELA`, and the COMBO chart code), architecturally
     distinct from DEV/CULT.
   - `MV6COMBO.ASC`'s six columns are `LOW HIGH COMB RELC AVG RELA`; col 6 =
     `100×(AVG−min)/(max−min)` within section — agent reports cols 1,2,4,5,6
     verified exactly against Strategy/Dev/One-Man-Rule rows, down to the
     decimal on 13/15 One-Man-Rule cells, from raw rater answers.
   - Reverse items **4, 5, 9, 10, 15 — confirms our shipped reverse list
     exactly.** (Low-risk, worth taking as settled even unverified-by-us —
     it corroborates existing shipped code rather than informing new code.)
   - A separate **pooled** CR aggregate row uses a ±50 mild weight,
     *different* from the ten rows' ±33 — an internal inconsistency in the
     1987 source itself, not a transcription error on our side.
   - **`S∆RELA` refuses below 13 of 16 answered.** Our `MIN_ANSWERED_OVERALL`
     is **12**. Worth someone checking whether this is coincidence or
     whether our threshold should be 13 — unresolved, not yet a decision.

   **Ground truth is structurally absent, not merely unfound — the Fable
   agent independently confirms why.** All 14 M/S rater files have CR
   answered at the default value (3 = "unanswered" to the program). Three
   TGP raters answered CR items 1–3 only, and no T-combo output for CR
   survives anywhere on disk. This is *why* `MV6COMBO.ASC`'s CR column was
   the degenerate all-identical tuple found in §2 — not a different bug, the
   same absence surfacing twice. The agent derived example values under the
   recovered formula but labelled them DERIVED, not observed — i.e. not
   ground truth, a worked example of the formula is not a worked example
   of 1987's actual output. **The hard gate (real tests against real
   ground truth, before trusting the formula) cannot be met for CR from
   anything on disk.** This is now a decision point, not an open research
   thread — see §5.

2. **Build real tests against that ground truth FIRST**, before the
   deterministic scorer is trusted anywhere near a real session. Same
   shape as THOR's F8: if the reverse-engineered formula doesn't reproduce
   known cases, that's a finding to ship as `it.fails` and surface, not a
   reason to quietly adjust the formula until it passes. If no ground truth
   is recoverable at all, the honest deliverable is "not recoverable" — not
   a scorer validated only against itself, which is how PR #123 shipped
   wrong rankings.
3. **Deterministic pass**: computes at 1987's native ten-dimension
   granularity, mirroring `thor-score.ts`'s split of extraction vs scoring.
   Reads the same `responses` shape `score.ts` already produces. Rolls up
   to our six facets via `items.ts`'s existing mapping for comparison.
4. **Comparison/divergence layer**: same philosophy as THOR's dual-pass —
   agreement raises confidence, divergence is flagged as clinically
   interesting on the report, not averaged into a single number. Operates
   at our six-facet granularity (report-facing shape, per the decision above).
5. Normal pace: plan → build → review → ship. Not a quick fix — this is a
   real initiative, same cadence as the original self-check voice arc.

## 4. Guardrail, stated once so it isn't re-litigated

A plausible-looking reverse-engineered formula that is actually wrong
repeats THOR's PR #123 failure (`fd6e85b`) — wrong rankings vs ground truth,
shipped anyway, now permanently flagged "directional until weights
re-derived." The gate against that here is step 2: tests against real
ground truth exist and pass *before* step 3 lands, not after.

## 5. Decision point (escalated to gm, 2026-10-16) — the gate is unmeetable for CR, not just unmet

§3 step 1 closes with the formula substantially recovered (part verified by
builder-3 directly, part relayed-from-agent and labelled as such) but **zero
recoverable CR ground truth on disk** — not "not found yet," confirmed
structurally absent (every rater file has CR unanswered; no CR program
output survives). The plan's own fallback ("if no ground truth is
recoverable, the honest deliverable is 'not recoverable'") was written for
formula-not-recoverable; this is the other gap — formula recovered, nothing
to validate it against. Options, not yet decided:

1. **Hold.** Don't build the deterministic CR pass. Document the recovered
   formula as the deliverable; no scorer code ships.
2. **Ship labelled, same posture as THOR's own `fd6e85b`.** Build the
   deterministic pass on the relayed formula, but flag it in code and on
   the report as "directional, unvalidated" rather than presenting
   agreement/divergence as equally trustworthy to the LLM pass.
3. Continue hunting for ground truth outside `~/conductor/repos/mic-program-toddito/`
   — lower odds given the hunt inside it is now exhausted (MV6COMBO, all 14
   M/S rater files, the 3 TGP partial raters), but not literally zero.

Not plan's call alone — this is a product-risk decision (ship a flagged-
unvalidated deterministic score to real consultants, or hold it), same
shape as the Keonda v6 product-direction question earlier this session.
Recommendation if asked: (2), gated on explicit "directional, unvalidated"
UI/report disclosure matching THOR's own precedent — building a comparison
layer on a formula nobody can validate contradicts the operator's own stated
reason for this initiative (divergence as clinical signal requires knowing
which side of a divergence to trust), so the disclosure isn't optional
polish, it's the thing that makes shipping honest.
