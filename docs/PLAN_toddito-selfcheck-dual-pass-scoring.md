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
  are genuinely compiled, not text — `file` reports `data` on both, 225KB /
  53KB. There is no source to read the aggregation formula from directly.
- builder-3's prior verification (items, facets, 4-rung ladder, refusal
  behavior) is verbatim-confirmed against the same files. Only the **final
  aggregation formula** was never recovered — `score.ts`'s current mean-of-facets
  is structurally well-founded but not verified byte-for-byte.
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
- The derived 10→6 map (exact, lossless 10→6 direction):

  | 1987 dimension | 1987 items | our facet |
  |---|---|---|
  | Trust | 1,2,3,4,5 | `trust` — identical |
  | Realistic Expectations | 6 | `expectations` — identical |
  | Network | 14,16 | `network` — identical |
  | Aware of Services | 9 | `awareness` |
  | Use of Competitors | 10 | `awareness` |
  | Perceived Relevance | 7 | `value` |
  | Price | 15 | `value` |
  | Time Invested | 8 | `access` |
  | Access | 11,12 | `access` |
  | Credibility/Respect | 13 | `access` |

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
partition happens to be clean, not by construction. **Whoever writes the
roll-up code should add a test asserting this partition stays clean** — same
shape as `MIN_ANSWERED_OVERALL`'s "emergent property, now locked by a test"
in `score.ts`: a future `items.ts` facet reassignment could break this
silently otherwise, and nothing today would flag it.

Net: **recover at 10** (the formula that actually exists), **convert 10→6**
via the table above, **display at 6** (unchanged, per gm), **compare
dual-pass at 6** (noise reason above). Ground-truth validation tests operate
at whatever granularity the actual worked examples turn out to have.

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
   one more structure here. **Negative result, tested not assumed:** the two
   long bitmaps in records 2/3 (960 and 1540 bits) were the obvious
   item-to-dimension incidence-matrix hypothesis — tested against real counts
   (59 scored dims in `MV6COMBO.ASC`, ≤245 item records), neither factors to
   match. Ruled out rather than kept refining toward a fit (that refinement-
   until-it-fits move is exactly the failure mode to avoid here).
   No weight tables, no arithmetic in the indexed 22%. Fable-pass target
   order, updated: (1) APL workspaces (`MGP*.ASF`, confirmed `APL*PLUS/PC
   RTSVERS 7.1`) + `GPATHOR?.EXE` — interpreted, often recoverable without
   decompilation; (2) the unindexed 78% of `GPASCORE.ASF`; (3) `CPCSP.AWS`/
   `GPCSP.AWS` (89861 bytes each, same size — paired, worth one look).
   Ground truth: still none. `MV6COMBO.ASC` confirmed not sufficient (§2).
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
