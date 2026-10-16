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
  behavior) is verbatim-confirmed against the same files. The **final
  aggregation formula** is now partially recovered (§3 step 1): a weighted
  count over an incidence matrix, not a mean — so `score.ts`'s current
  mean-of-facets is confirmed to be a **structurally different operation**
  from 1987's real method, not merely "unverified against" it.
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
  | Access | 11,12 | `access` | read — unambiguous |
  | Credibility/Respect | 13 | `access` | **judgement, not a read** — item 13 is "talks about long term work"; builder-3's call, not corroborated by the 1987 source itself. Worth a second opinion if the comparison layer turns out sensitive to this one. |

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

**PR #29 open (`406d079`, `brollistika/toddito`): the fixture test above,
built.** Four assertions — full item coverage, no dimension straddles two
facets (names the offender), the ten roll up to our exact shipped sizes,
the recorded mapping. `tsc`/`vitest` clean (37 files, 292 passed + 2
expected-fail).

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
   decoded: 14-entry index at bytes 8–120 (`uint32 offset, uint16 len×2`),
   chains with 0 breaks, confirms parse-not-decompile for this region. But it
   only indexes 22% of the file (51025 / 225280 bytes) — the other 78% holds
   the narrative/ladder/refusal content already verified, so there's at least
   one more structure here. ~~**Negative result:** the two long bitmaps in
   records 2/3 (960/1540 bits) are NOT an incidence matrix — tested against
   real counts, neither factors to match.~~ **OVERTURNED, see below — the
   factor test was sound but the premise (global totals) was wrong; the
   bitmaps ARE incidence data, just sectional.**

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
   matrix, multiply specific rows by integer weights, plus-reduce. **So
   `score.ts`'s mean-of-facet-means is not just unverified against 1987 — it
   is a structurally different operation** (mean vs. weighted count). The
   deterministic pass, once CR's own weights are recovered, implements a
   weighted count, not a mean.

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
