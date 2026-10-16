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

## 2. Non-obvious lead for the ground-truth requirement

The operator is explicit: build validation tests against real 1987
worked/ground-truth examples **before** trusting any reverse-engineered
formula — same rigor as THOR's F8 harness (`src/lib/scoring/thor-score.test.ts`),
which found THOR's own reverse-engineered weight matrix produces **wrong**
rankings vs ground truth, and still ships `it.fails` tests documenting the
known divergence rather than silently patching it.

**`MV6COMBO.ASC`** (`~/conductor/repos/mic-program-toddito/`, the same
8-rater combo file THOR's F8 memo already uses) has a **"Client Relationship"
column** alongside Development Stage / Strategy / Structure / Culture /
Leadership Style — confirmed via `strings`, not assumed. This may be real
ground-truth percentile data for exactly this module, sitting in a file
already being parsed for THOR's own ground truth. Check this before hunting
for a separate worked-example source — it would be the self-check equivalent
of THOR's F8 fixture.

## 3. Task sequencing

1. **builder-3 — research only, no scoring code yet.**
   - Reverse-engineer `GPASCORE.ASF`'s real aggregation logic via
     disassembly/decompilation-style reasoning (use a Fable model for this —
     operator's explicit instruction), not guessing from the instrument's
     documented structure.
   - Check whether `MV6COMBO.ASC`'s Client Relationship column is usable
     ground truth for this module specifically (dates, rater count, scale —
     confirm it's the same construct before trusting it).
   - Deliverable: a brief naming the recovered formula (or the honest limit
     of what's recoverable) and whatever ground-truth cases exist, with the
     same "confirmed vs inferred" discipline as the rest of this arc.
2. **Build real tests against that ground truth FIRST**, before the
   deterministic scorer is trusted anywhere near a real session. Same
   shape as THOR's F8: if the reverse-engineered formula doesn't reproduce
   known cases, that's a finding to ship as `it.fails` and surface, not a
   reason to quietly adjust the formula until it passes.
3. **Deterministic pass**: `self-check-score.ts` (or similar), mirroring
   `thor-score.ts`'s split of extraction vs scoring. Reads the same
   `responses` shape `score.ts` already produces.
4. **Comparison/divergence layer**: same philosophy as THOR's dual-pass —
   agreement raises confidence, divergence is flagged as clinically
   interesting on the report, not averaged into a single number.
5. Normal pace: plan → build → review → ship. Not a quick fix — this is a
   real initiative, same cadence as the original self-check voice arc.

## 4. Guardrail, stated once so it isn't re-litigated

A plausible-looking reverse-engineered formula that is actually wrong
repeats THOR's PR #123 failure (`fd6e85b`) — wrong rankings vs ground truth,
shipped anyway, now permanently flagged "directional until weights
re-derived." The gate against that here is step 2: tests against real
ground truth exist and pass *before* step 3 lands, not after.
