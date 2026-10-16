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
  behavior) is verbatim-confirmed against the same files. **Three-way scope,
  verified not relayed (builder-3 read the bytes directly, 2026-10-16):**

  | branch | method | status |
  |---|---|---|
  | DEV / CULT | weighted count over a booleanised incidence matrix | verified |
  | Client Relationship | **unit-weighted mean per dimension** (0.2 for Trust's 5 items, 0.5 for the two-item dimensions — both exactly `1/n`) | **verified**, int16/float64 literals read directly at `102256`/`102414`/`102618` |
  | our `score.ts` | mean of oriented item ratings per facet | shipped |

  **"Structurally different from 1987's real method" was wrong for the
  branch that matters — CR is mean-based, same family as `score.ts`, not
  the DEV/CULT weighted-count.** Two real, narrower differences remain: (1)
  1987's **score map is non-linear** (`+100, +33, 0, −33, −100`), ours is a
  linear 1–7 scale — "mild agreement" is a third of the way out for them,
  not half; (2) **granularity** — 1987 means over ten dimensions, we mean
  over six facets (§2a's roll-up already accounts for this). See §3 step 1
  for the fuller writeup, including one still-open question about whether
  1987's *overall* (not per-dimension) score is a flat 16-item mean —
  unverified, and it would bear on whether our facet-mean-of-means overall
  is the same object as 1987's or a different one.
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

**test-g2 re-verified at `e10386b`, current head.** `tsc` clean, `vitest`
37/292 +2 expected-fail matches. Reproduced the CR13/CR15 swap mutant
directly: now fails **harder** than at `406d079` — 3 of 4 assertions fail,
not 1, because the item-split fix moved CR12 into `Credibility/Respect`
without moving CR13, so swapping CR13 alone now also trips the straddle
assertion (CR12 and CR13 end up on opposite sides of the access/value
boundary). Consistent with the item-split fix and the commit message.
Confirmed, mutation-catch verified independently at current head. Review's
verdict still outstanding as of this writing.

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

   **UPGRADED to verified (builder-3, same day, follow-up): CR aggregation
   confirmed as a unit-weighted mean per dimension — read directly from the
   bytes, not relayed from the agent.** `0.2` and `0.5` float64 literals sit
   beside the `100 33 0 −33 −100` int16 row at `102256`/`102414`/`102618` —
   exactly `1/5` (Trust's five items) and `1/2` (the two-item dimensions).
   No CR incidence matrix, no CR branch of `GENANSM` — CR runs through three
   separate paths (`S∆VEC∆CALC`, `S∆RELA`, the COMBO chart code),
   architecturally distinct from DEV/CULT but the *same family* (mean) as
   `score.ts`. See the §1 table for the three-way scope.

   *Still relayed from the Fable agent, not independently verified:*
   - `MV6COMBO.ASC`'s six columns are `LOW HIGH COMB RELC AVG RELA`; col 6 =
     `100×(AVG−min)/(max−min)` within section — agent reports cols 1,2,4,5,6
     verified exactly against Strategy/Dev/One-Man-Rule rows, down to the
     decimal on 13/15 One-Man-Rule cells, from raw rater answers.
   - **`S∆RELA` refuses below 13 of 16 answered.** Our `MIN_ANSWERED_OVERALL`
     is **12**. Worth someone checking whether this is coincidence or
     whether our threshold should be 13 — unresolved, not yet a decision.

   *Verified, builder-3 directly:*
   - Reverse items **4, 5, 9, 10, 15 — confirms our shipped reverse list
     exactly.**
   - A separate **pooled** block at `103298` uses `±50`, not `±33` — a
     single hit, matching the agent's earlier report of a pooled CR
     aggregate using a different weight from the ten per-dimension rows (an
     inconsistency in the 1987 source itself, not a transcription error).
     **Open question, explicitly unverified — the divisor:** no `float64` in
     `(0,1]` sits near that block, so the ±50 *map* is confirmed but not the
     `÷16` a flat whole-instrument mean would need. If 1987's *overall*
     pools all sixteen items flat, it's a different object from our
     facet-mean-of-means (unequal-weighted by construction, since facets
     have different item counts) — which would mean Addendum 2's claim that
     our facet-mean choice is "well-founded by 1987's facet-first structure"
     holds for the *per-facet* means (now strongly supported) but not
     necessarily for the *overall* number. Next thing to check, not yet
     resolved.

   **Divisor follow-up (builder-3): upgraded, still inferred, and the
   research track has hit its limit.** The literal `16` sits immediately
   after the ±50 map in the byte stream (adjacency), with no `0.0625` or
   other reciprocal constant nearby — consistent with, not proof of, an
   integer-divide. Reading the actual operation needs the APL opcode table
   decoded, not more literal-hunting — "a materially bigger job than what
   got us here," per builder-3, and explicitly flagged as **a decision
   point, not something to just start.**

   **One agent claim builder-3 could not locate at all** (recorded as
   *not located*, not *refuted* — genuinely different): a four-group
   mapping for the narrative/ladder path (`S∆RELA`), which — if real — means
   **1987 scored Client Relationship at three different granularities**:
   4 groups (narrative, unlocated), 10 dimensions (chart, **verified**), 1
   pooled row (±50, verified map / inferred divisor). Worth stating plainly:
   if this holds, "what was the 1987 CR score" doesn't have one answer, and
   that's worth knowing *before* anyone builds a comparison layer against
   "the" 1987 number rather than after.

   **None of this moves the gate.** No CR ground truth exists on disk
   regardless of how fully the formula gets decoded — a fully-decoded
   formula still ships unvalidated against a real worked example. Given
   that, **further opcode-decoding work is paused pending gm/operator's §5
   decision** — spending more research on a formula whose validation path
   is already closed doesn't change what ships.

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

**Update: the formula is now mostly verified directly by builder-3, not
relayed (see §1/§3 step 1) — CR is a unit-weighted mean per dimension, same
family as `score.ts`, not the structurally-different weighted-count method
DEV/CULT uses. That narrows this decision; it doesn't remove it.** Two
specific, now-precisely-named gaps remain between `score.ts` and 1987's real
CR method — a non-linear score map (±100/±33/0 vs our linear 1–7) and
granularity (ten dimensions vs our six facets, already handled by §2a's
roll-up) — plus one still-open question about whether 1987's *overall*
pools flat across all 16 items rather than via facet means. §3 step 1
closes with the formula substantially recovered but **zero recoverable CR
ground truth on disk** — not "not found yet," confirmed
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

**Added consideration (builder-3, same day): "the" 1987 CR score may not be
one number.** Evidence so far suggests 1987 may have scored CR at three
different granularities — a 4-group narrative path (unlocated, not
refuted), the 10-dimension chart (verified), and a separately-weighted
pooled row (±50 map verified, divisor inferred). Decoding which of these
(if any) the deterministic pass should target needs the APL opcode table
decoded — a materially bigger research job, explicitly paused pending this
decision rather than started, since **no option above requires it**: hold
and ship-labelled both work off what's already recovered, and ground truth
being absent means a fuller decode wouldn't change what can be validated
anyway. If (3) is chosen and ground truth somehow turns up, that's the
point to revisit the bigger decode, not before.

Not plan's call alone — this is a product-risk decision (ship a flagged-
unvalidated deterministic score to real consultants, or hold it), same
shape as the Keonda v6 product-direction question earlier this session.
Recommendation if asked: (2), gated on explicit "directional, unvalidated"
UI/report disclosure matching THOR's own precedent — building a comparison
layer on a formula nobody can validate contradicts the operator's own stated
reason for this initiative (divergence as clinical signal requires knowing
which side of a divergence to trust), so the disclosure isn't optional
polish, it's the thing that makes shipping honest.

**Correction, same day: "unmeetable" overgeneralized "nothing on disk" —
there is an untried option (c).** builder-3 caught their own earlier framing
(and mine, by extension) widening "no worked example exists on disk" into
"the gate is unmeetable." It isn't, necessarily: `CPCSP.EXE`, `CSPSYS.EXE`,
`GPATHOR1.EXE` are all runnable DOS MZ binaries, and `GPDD.BAT` is a
non-interactive, parameterised entrypoint (`cspsys q=gpddms s=0 h=10 c=0
z=1`) — the real shipped program, not fragments. **Option (c): run the 1987
program itself under DOS emulation, feed it real CR answers, capture its
actual output.** That's ground truth produced by the binary, not a
reconstruction — strictly stronger than anything derivable from literals,
and it would retire the gate properly rather than paper over it (the actual
point of the PR #123 precedent). Explicitly **not attempted** — no DOSBox
set up, nothing run, and whether the program needs interactive menu
navigation or a hand-built `ANSV` workspace entry is unknown. "Plausibly
meetable with emulation," not "meetable." Correctly held as a scope
decision, not started mid-research-pass.

**Operator priority redirect (via gm, 2026-10-16): pause this entire
research track, not just the opcode-decode piece.** Operator: "keep going
with the buildout, get this working toward being a voice agent rather than
1-7 scoring." This functionally resolves the hold/ship/keep-hunting
question as **hold, for now** — but on priority/timeline grounds, not
because option (c) was ruled out. The distinction matters for whoever picks
this back up: nothing here was decided as *infeasible*, it was deprioritized
against a higher-priority voice-agent buildout. Option (c) (DOS emulation)
stays on record as the correct next move if this track reopens, not as a
dead end. builder-3 reassigned off research, onto the voice-UI buildout —
see new work below.

## 6. Operator decided (via gm, 2026-10-16): option 2, build and ship labeled — plus the emulation side-quest, in parallel, not blocking

**Operator's direct call: build the CR deterministic scorer, ship it
labeled as directional/unvalidated — same posture as THOR's own `fd6e85b`
(§5 option 2, confirmed). Separately greenlit builder-3's DOS-emulation
idea (§5, "option (c)") as a parallel side-quest — explicitly not blocking
the labeled-ship work.** Sequence: build the labeled scorer now; the
emulation work, if it produces real ground truth later, is what upgrades
"directional" to "validated" — it doesn't gate shipping.

**Task, dispatched to builder-1** (builder-3 stays on the voice-UI
buildout, the higher-priority active task): build the CR deterministic
pass per §3 step 3/4's design — ten-dimension native computation (unit-
weighted mean per dimension, non-linear ±100/±33/0 score map, per §1's
table), rolled up to our six facets via `items.ts`'s mapping, compared
against the LLM pass. **The label is not optional UI polish — it is the
thing that makes this honest to ship**, per §5's own reasoning: a
divergence signal needs to know which side to trust, and this scorer has
no ground truth behind it. Concretely: disclose "directional, unvalidated"
wherever the deterministic score or a divergence flag reaches a report —
not just a code comment. Follow §2a's load-bearing precondition (the
10→6 partition is clean, PR #29 already locks it with a test) and keep the
pooled-row/overall-aggregation open question (§3 step 1) in mind — the
*per-dimension* formula is solid, the *overall* number's exact mechanics
are still one open item.

**DOS-emulation side-quest**, queued for builder-3 once the voice-UI entry
work lands (not urgent, operator explicitly said parallel/non-blocking):
set up DOS emulation for the three verified-runnable `.EXE`s
(`CPCSP.EXE`, `CSPSYS.EXE`, `GPATHOR1.EXE`), drive `GPDD.BAT`'s
parameterised entrypoint, supply real CR answers, capture the program's
actual output as genuine ground truth. If it works, that's the trigger to
revisit "directional" → "validated," not before.

**Real gap found and resolved during build (builder-1, 2026-10-16): our
scale is 7 points, 1987's score map is for 5.** `prompt.ts`'s
`SCALE_DESCRIPTION` is 1987's exact 5 anchors (strongly disagree / disagree
/ neither / agree / strongly agree) with two new "slightly" categories
inserted — ours 1,2,4,6,7 correspond exactly to 1987's 1,2,3,4,5
(−100,−33,0,+33,+100, verified). Ours 3 ("slightly disagree") and 5
("slightly agree") have **no 1987 analogue at all.**

**Decided (plan, 2026-10-16): linear interpolation at the midpoint of the
known neighbors** (3 → −16.5, 5 → +16.5), not a nearest-neighbor snap to
one side. Reasoning: snapping would make "slightly disagree" score
identical to either "disagree" or "neither," discarding the fact that the
instrument offers it as a genuinely distinct option — an invented
discontinuity, not a recovered one. Midpoint is the minimal addition that
preserves the already-verified points exactly and treats the new category
as what it is: new, not 1987's. **Explicitly not a candidate for a global
rescale of all 7 points** — that would overwrite verified 1987 values at
positions 1,2,4,6,7 with invented ones, trading something known for
something guessed. Must be labelled in code as our own interpolation, not
recovered 1987 data — same honesty standard as the formula's VERIFIED/
INFERRED split in §3 step 1.

**Compounds the disclosure requirement, doesn't replace it.** The scorer
now carries two independent layers of uncertainty: the formula has no
ground truth to validate against (§5), AND two of seven score-map points
are our own invention, not 1987's. The "directional, unvalidated" label
should account for both, not just the first.

## 7. PR #31 open (`642e9c2`, builder-1) — implementation done, one open question before review completes

`legacy-score.ts` (10-dim unit-weighted mean, non-linear score map, facet
rollup, divergence vs `score.ts`), wired into `run.ts`'s persist, disclosed
per-facet-row + closing paragraph on the one report surface. Migration 037
(renumbered from 036 after catching a collision with open PR #28).

**Both the suite count and the "pre-existing build break" premise were
wrong, corrected by test-g2's independent verification.** Suite is
**304 passed + 2 expected-fail = 306**, not 303/305 — off by exactly +1,
traced to the diff adding exactly 16 new tests in `legacy-score.test.ts`
(290 pre-PR + 16 = 306, matching test-g2's number, not builder-1's). The
"pre-existing plotly.js build break on `main`" **does not actually
reproduce** on either `main` or this PR once the environment matches its
own lockfile — `node` reported `v16.2.12` in this shared worktree while
`package.json` pins `16.3.7`; a stale `node_modules` install, not a real
type incompatibility. After `npm install` resynced the worktree: `tsc`
clean, `next build` exit 0, on both `main` and `642e9c2`. **Worth a heads
up to whoever owns `fix/plotly-annotations-type` (sitting untouched at
`fecdc66` in `/private/tmp/td-plotly`)** — if their worktree's `next` was
already on `16.3.7`, they may be carrying a branch for a problem that
doesn't exist, caused by install drift in a different, shared worktree.

**gm's follow-up: the deeper root cause was a wrong types package, not
just node_modules drift.** gm had independently verified against a stale
`@types/plotly.js` rather than `plotly.js`'s own native types (which is
what TypeScript actually resolves) and was about to have `build` ship a
fix for a bug that would have been real under the wrong types and
nonexistent under the right ones. Caught with a fresh clone + `npm ci` +
build + `tsc`, all exit 0; `build` told to stop/revert if started;
builder-1 and review corrected directly by gm.

**Resolved (builder-1, verified by plan independently): flat-item-mean does
NOT bypass dimension-level computation — it is algebraically identical to
it.** Every 1987 dimension is itself an equal (unit-weighted) mean over its
own items (confirmed: Trust ×0.2 over 5 items, the ×0.5 pairs over 2 items
each — all `1/n`, no dimension has non-uniform internal weights). Given
that, for dimension sizes `n_1..n_k` summing to facet size `N`:

```
Σ (n_i/N) × dim_mean_i  =  Σ (n_i/N) × (1/n_i) × Σ(items in dim_i)
                        =  (1/N) × Σ(all items in facet)
                        =  flat item mean
```

So flat-item-mean *is* item-count-weighted combination of 1987's own
correctly-computed dimension scores — not a different, cruder method that
happens to agree. The only real choice was ever the across-dimension
combination rule: item-count-weighted (what's built, and the only one that
adds no new free parameter — "treat every item in the facet the same,"
matching what `score.ts`'s own facets already do) vs. equal-dimension-
weighted regardless of size (the alternative, which would treat
`access`'s 2-item Credibility/Respect dimension as one-third of the facet
rather than half). They diverge only on `access` (1+1+2) — `value` and
`awareness` are both 1+1 splits where the two rules coincide. Verified
independently (re-derived the algebra, didn't take the proof on trust) and
confirmed landed: `14b599a`, proof in `legacy-score.ts`'s file header, a
test asserting both computation paths agree exactly. Suite 304/306,
typecheck/lint clean. **Partial correction below (F3) — the proof is
exactly right for complete data; I didn't check the partial-data case.**

## 8. PR #31 @ `14b599a` — CHANGES NEEDED (review, 2026-10-16), 2 blocking

**The scorer's arithmetic is right. The comparison layer built on top of
it is not — and this is the actual deliverable the operator asked for
("divergence = clinical signal"), not a side detail.**

**F1 — BLOCKING, most severe finding of this whole arc.** Both passes
land on 0-10 and are read through the *same* band ladder (7.5/5.0/3.5),
but they get there via differently-shaped transforms — linear for the LLM
pass, the non-linear ±100/±33/0 legacy map for the other. They coincide
at exactly one point (rating 4 / map 0, both → 5.0, the ladder's own
"solid" floor) and diverge everywhere else. **Verified independently,
recomputed from scratch, not taken on trust:**

```
rating  llm_10  llm_band  legacy_10  legacy_band
1       0.0     weak      0.0        weak
2       1.67    weak      3.35       weak
3       3.33    weak      4.17       thin      DIVERGE
4       5.0     solid     5.0        solid
5       6.67    solid     5.83       solid
6       8.33    strong    6.65       solid     DIVERGE   <- most likely real answer
7       10.0    strong    10.0       strong
```

Review enumerated the full answer space (not just the uniform case): 16-29%
of answer vectors diverge per facet depending on facet size, concentrated
exactly where real answers cluster (5, 6). **Combined, review estimates
roughly three reports in four would show at least one red "differs from
the read above" flag — purely from scale mismatch, not real disagreement.**
This is the inverse of the entire point of building a dual pass: instead
of "divergence is a signal to trust," the feature as built would train
consultants to ignore the divergence flag within days, because it fires
on the most common healthy-relationship answer. Root cause: `score.ts`'s
band thresholds were calibrated for the *linear* scale (5.0 chosen so
all-"Neither" lands solid, per `score.ts:118`) — that anchor survives the
move to the legacy scale by coincidence (0 maps to 5.0 too), nothing else
does. Reusing the ladder "because it's already shipped and reviewed" is
where the error enters — applying one ladder to two differently-shaped
scales *is* inventing a new comparison, just silently.

**Direction (plan, 2026-10-16): recalibrate the legacy band thresholds at
the legacy scale's own anchors, don't suppress the divergence display.**
Review correctly declined to design the fix and offered two options —
recalibrate, or stop rendering red-divergence until proven not
ladder-dominated. Suppressing the display punts the actual deliverable;
recalibrating preserves it. Not designing the exact thresholds myself
(that's an engineering judgment call requiring the same care `score.ts`'s
own 5.0-floor reasoning got) — dispatched to builder-1 with this
direction, not a specific number.

**F2 — BLOCKING, and it's why F1 shipped undetected.** No test compares a
real LLM band against a real legacy band on the same input — every
`compareFacetScores` test hand-writes fabricated bands. The one test that
runs both scorers together uses `allAt(4)`, the single uniform answer
where the two transforms coincide by construction. **Same shape as this
session's "OR-clause needs a deciding fixture" lesson** — a fixture that
can only pass is not evidence. Fix: add verdict assertions for `allAt(3)`,
`allAt(5)`, `allAt(6)` so F1 becomes structurally impossible to
reintroduce.

**F3 — the "algebraically identical" proof I verified holds only for
complete data, and I didn't check the partial case.** When a dimension is
refused for sparseness, its answered items still feed the facet's flat
mean even though the dimension itself reports null. Reproducing example
(review's, re-verifiable): `CR08=1, CR11=1, CR12=7, CR13` unanswered →
`Credibility/Respect` refused (1/2 answered) but facet `access` = −33.33,
a number no combination of *scoreable* dimension scores produces (the
weighted combination of what actually scored is −100; CR12's +100 is
leaking in through the flat-item path from a dimension declared too
sparse to score). Review calls this defensible (mirrors `score.ts`'s own
facet rule exactly) but undocumented — the header's "preserves each
dimension's own weighting exactly" is unqualified and should say
"for complete responses" plus document what happens to items in a refused
dimension. **Owning this precisely: I verified the algebra correctly for
complete data (§7, re-derived independently) — I did not think to check
the sparse/partial-answer interaction, and that's the actual gap, not the
proof itself.**

Not blocking, on record: the score-map anchors and ten-dimension partition
independently re-derived and confirmed correct by review (separately from
builder-3's derivation — two independent reads agree); a weak assertion
(`not.toBeCloseTo`) that's harmless here (carried by a `toBe` on the prior
line) but proves less than it looks like; `score.ts`'s diff is
exports-only, no logic change.

## 9. PR #31 @ `8b3d643` — F1/F2/F3 addressed, better fix than the directed one, awaiting review re-check

**builder-1 tried the direction I gave (recalibrate legacy's own band
thresholds) and it measured worse, not better** — 32-37% false-divergence
on larger facets vs the original 16-17%, caught by enumerating the full
answer space before trusting it, same discipline review used to find the
bug. **Shipped a different fix instead: same `bandFor` ladder on both
sides, unchanged, but the comparison now requires a 2+ notch gap to flag
divergence** (weak=0/thin=1/solid=2/strong=3 — adjacent bands, e.g.
solid vs thin, no longer count; only a jump of 2 or more does).
Re-checked against my own per-rating table (§8): every uniform-answer
divergence found there is exactly 1 notch — both would now read 0% false
divergence. builder-1 reports this holds across the full enumerated
answer space for all four facet sizes, 0% false-divergence everywhere.
**Worth noting I was wrong to direct "recalibrate," not just non-committal
about the number** — the actual fix doesn't touch thresholds at all, it
changes what counts as a disagreement. The better solution came from
builder-1 testing the suggested one and finding it failed, not from
better foresight on my end.

F2 (real wired-together band-comparison tests) and F3 (qualified header +
partial-data test fixture) also addressed. Suite 315/317, typecheck/lint/
build clean. **Not self-cleared** — builder-1 explicitly routed back to
review for re-check rather than treating their own fix as closing the
loop. Awaiting review's independent re-verification of the 0%-across-all-
facet-sizes claim before this is actually resolved.
