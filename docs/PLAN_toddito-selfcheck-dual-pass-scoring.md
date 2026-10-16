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
dimension granularity**, since that's what any real ground truth will be
shaped like and what the source actually computes. Roll the recovered
ten up to our shipped six **using the existing `items.ts` facet
assignments as the mapping** (that mapping already defines which items —
and therefore which of 1987's ten constructs — belong to which of our six
facets; don't re-derive it from scratch). The comparison/divergence layer
(step 4 below) operates at our six-facet granularity for the report-facing
side; any ground-truth validation tests (step 2 below) operate at whatever
granularity the actual worked examples turn out to have, which is likely ten.

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
