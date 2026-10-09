# Toddito self-check: voice-modernize the input (operator-confirmed: B, free-form inference)

- **Requested by:** operator, via gm, Telegram, 2026-10-08. Confirmed
  choice: (B) — free-form inference, explicitly "just like we did already
  with the original org diagnostic, so far it's yielding incredible
  results."
- **Research:** builder-3, `docs/BRIEF_self-check-voice-input-research.md`
  (`6f5bf78`) + two addenda (`256744d`, `97221b6`) — full findings folded
  in below, not re-derived.
- **Not urgent** — normal pace, proper process. This doc is the planning
  phase; nothing built yet.

## 0. Architecture — CONFIRMED ALREADY EXISTS, corrected twice before landing here

The operator pointed at THOR's extract→deterministic-score pattern
(`thor-extract.ts` + `thor-score.ts`) as "the thing I meant by reverse-
engineered weights." **builder-3 confirmed this is already the self-
check's own architecture** — `score.ts`'s own header comment: *"Mirrors
how THOR already splits extraction from scoring."* `prompt.ts` extracts a
1-7 rating per item from the transcript; `score.ts` computes the result
deterministically (`orientedRating`, facet means, band thresholds) with
**zero model involvement in the scoring math itself**. So the operator's
architectural instinct is correct, and the answer is "already built,"
not "needs re-architecting." Two real mistakes this seat made while first
writing this up, corrected before any build started on the wrong premise:

**Mistake 1 — wrong scale.** First draft said the extraction should emit
THOR's own `-2/-1/+1/+2/null` scale. `score.ts`'s `MIN=1, MAX=7` and its
input sanitizer reject anything outside `1-7` — emitting THOR's scale
would make every item fail validation and null out, refusing every
report. **Self-check's extraction must emit 1-7, in the item's own
stated polarity** (the scorer's `orientedRating()` does the reverse-item
flip; the model answers the item's literal statement, not an "is this
facet healthy" judgment).

**Mistake 2 — no weight matrix exists to port.** THOR has a real 438-pair
weight matrix (migration 012) to port into TypeScript. **Self-check has
no equivalent matrix** — no `self_check_weights` table, nothing in
`supabase/`. The 1987 aggregation formula is *compiled* in `GPASCORE.ASF`,
not recovered as readable logic (confirmed, `97221b6`). There's nothing
to port because `score.ts` already IS the deterministic scorer, built
directly from the facet structure builder-3 verified against the source
(§2 below) — not a THOR-style weight-matrix computation, a different
(simpler, already-shipped) one.

**Mistake 3, the one that would have done real damage if it had landed:
architecture does not resolve the four gates in §1. The gates are entirely
about MODEL BEHAVIOUR; no architecture choice changes model behaviour.**
`score.ts` already accepts `null` per item — that makes null
*representable*. It does not make the extraction model *use* null, honor
reverse polarity, or preserve within-facet disagreement. **Representability
is not behaviour** — same shape as this project's own guard-testing lesson
earlier tonight (an affordance nobody exercises is indistinguishable from
no affordance). Worse: modeling the new extraction prompt directly on
`thor-extract.ts`'s own instructions would import a line that actively
fights GATE 1 — *"be decisive — pick +2 or -2"* — written for THOR because
180 questions and a tolerant weight matrix can absorb some noise. Self-
check has 16 items and gates that depend on the model declining when it
should. **Do not inherit that instruction.** GATE 1 is elevated risk under
a thor-extract-modeled prompt specifically because of this, not resolved
by one.

**Bottom line scope, corrected:** the only new component is the voice-
transcript extractor (a new `prompt.ts`-style extraction step, 1-7 per
item, the item's own polarity, modeled on `thor-extract.ts`'s SHAPE but
NOT its decisiveness instruction). `score.ts` stays genuinely unchanged —
that part of the original claim holds and is still a real, valuable scope
reduction. All four gates below remain live, un-resolved, go/no-go
requirements on the new prompt.

## 1. The go/no-go gates on the extraction prompt — not optional, not resolved by architecture (GATE 5, on the voice agent itself, is in §3c — more severe than all four of these, found later, testable sooner)

**gm's explicit instruction: these are GO/NO-GO gates on the build plan,
not something `test` runs at the end for a report.** A prompt draft that
fails any one does not proceed to voice infrastructure. None needs infra,
a voice agent, or an API key — all four are checkable against the
existing pure `scoreSelfCheck`/synthetic transcripts.

```
GATE 1 -- null-emission survives (ELEVATED RISK under a thor-extract-
          modeled prompt, see Mistake 3 above -- do not inherit
          "be decisive")
  Severity, corrected by enumeration (all 64 nulling patterns): the
  refusal gate is vacuous in only 6/64 (fabricate everything, or null
  exactly 1 of the 5 smaller facets) -- it regains FULL power once 2+
  facets are nulled. Real bar: the prompt must be ABLE to null 2 facets
  when genuinely untouched, not null often. Also found: the ITEM gate
  (MIN_ANSWERED=12) does more real catching than the FACET gate here --
  `access` (4 items) vanishing lands exactly on the 12-answer threshold,
  `trust` (5 items) tips it over. FAIL = prompt cannot null even 2 facets
  on a transcript that genuinely never covers them; do not proceed.

GATE 2 -- polarity / raw-emission contract
  Score a transcript of unambiguous, one-sided praise. Check `awareness`
  (both items reverse-coded) does NOT come back `weak` while the overall
  reads `solid` -- that specific signature means the prompt emitted
  already-oriented values instead of raw per-item agreement, and
  score.ts's orientedRating() double-flipped it. Contract: model emits
  RAW agreement with the item's own (possibly negative) statement;
  score.ts does ALL orientation, unchanged, already mutation-tested on
  all five reverse items. FAIL = prompt is polarity-blind; do not
  proceed.

GATE 3 -- within-facet variance survives
  On a transcript with genuine mixed signal within one facet, confirm
  the model emits disagreeing item-level ratings rather than smoothing
  to one facet-level impression, and confirm a `thin`-band result is
  reachable at all (needs facet mean 3.10-3.99 via real item
  disagreement -- no uniform fill can produce it). FAIL = the 1987
  ladder's "uneven relationship" rung is dead on arrival; do not
  proceed.

GATE 4 -- `expectations` can be returned unscored, AND IS ALREADY DISCLOSED
  Single-item facet, 1/6 of the headline weight when SCORED. Confirmed
  via self-test + code read: `score.ts`'s `omittedFacets` is populated
  on the SUCCESS path (not just refusal) and the report UI
  (`page.tsx:188`) already surfaces it when `omittedFacets.length > 0` --
  a correct null is NOT silently indistinguishable from fabrication to
  the reader. This was nearly misreported as an open gap; it isn't one.
  Remaining requirement, narrower than first framed: confirm the model
  abstains on this item when untouched (same mechanism as GATE 1) --
  the disclosure half is already solved.
```

**Sharpening GATE 3's framing, from the self-test's own arithmetic:**
"expectations is 1/6 of the headline" describes a SCORED item moving the
mean; it does NOT describe the cost of an UNSCORED one, which is a
different operation and much cheaper on average: `(omitted facet's value
− mean of the others) / 6`. Measured example: correctly nulling
`expectations` moved the overall by 0.23 (same band) when the facet
wasn't an outlier; had it been (e.g. a badly-managed-expectations case
scored 1.67 against a 6.95 mean elsewhere), the same omission would have
moved it 0.88 — enough to cross a band. **Omission is cheap on average
and expensive exactly when the omitted facet would have been the
outlier** — the two "1/6" framings invite contradictory intuitions if
stated without this distinction.

**Status:** computable halves of GATES 1-3 done without a model call
(enumeration, structural reachability); GATE 4's disclosure half
confirmed already-shipped. Behavioural halves (does a real model
actually fabricate, does it actually reach band extremes under real
inference) need a model call — no `ANTHROPIC_API_KEY` available to this
fleet yet. A one-sided self-test (builder-3 answering their own draft
prompt on a transcript with a deliberate expectations-adjacency trap —
heavily caveated, N=1, primed, a pass proves nothing) ran clean:
correctly nulled the untouched item, and separately validated GATE 2's
raw-emission contract on real prose (a reverse-coded item's raw
agreement correctly inverted to the right answer; emitting an already-
oriented value instead would have produced the exact acquiescence
fingerprint computed earlier). The one thing still genuinely open is
whether the PRODUCTION model does this unprompted and untested — that
needs the key, not more self-testing.

## 2. Self-check's structure, corroborated against the real 1987 source — different risk shape from THOR's F8

builder-3 checked THOR's own known-bug warning (F8, below) against the
actual 1987 program (`GPASCORE.ASF`, `~/conductor/repos/mic-program-
toddito`) rather than assuming it transfers either way. Verified, not
inferred:

- The refusal message is **verbatim** 1987 ("Too many items were omitted
  to permit the generation of an overall score or description").
- The 6 **facets** and a facet's item count (e.g. `network` = 2 items)
  match 1987's own wording exactly.
- The 4-rung **ladder** is 1987's own language (*"has done a good job" /
  "a slightly greater effort" / "a greater effort" / "a much greater
  effort"*).
- 1987 had per-facet partial-answer branches — **more** granular than
  self-check's facet-level scored/unscored; a faithful simplification,
  not a deviation.

**Only the final aggregation formula is unverified** (compiled in the
1987 binary, not recovered as logic). Different risk shape from THOR:
THOR's weight matrix is unverified AND known-wrong against real ground
truth (F8, below). Self-check's inputs check out against the source;
only the last combination step is open.

**Real consequence: this reframes the `expectations`-carries-1/6-of-
headline item** (already accepted by the operator for v1, ship-as-is-
iterate-later) as a property **inherited from 1987's own facet-first
design**, not an arbitrary artifact of this build — 1987 treats facets
as first-class units with their own scores/ladders/narratives, so an
overall built from facet-level means is the natural reading of the
source. If ever revisited, the real question is "do we want to depart
from 1987 here," not "should we fix our mistake."

## 2a. F8 — real, pre-existing, already-tracked bug on the ORG-DIAGNOSTIC side; checked whether it transfers (it doesn't, directly)

`docs/ROADMAP.md`: "THOR ground-truth harness: legacy runs as fixtures;
**weights diverge from the legacy program (F8)** — documented via
`it.fails` tests; THOR = directional," and "Parked: re-derive THOR
weights from the legacy SCORE.ASF binaries" — explicitly unresolved,
predates this initiative entirely.

**Doesn't transfer directly** — F8 is the ORG-DIAGNOSTIC's weight matrix
(migration 012, 438 pairs, derived from THOR's own ground truth). Self-
check's weights come from a different 1987 instrument and were
independently verified during PR #2 (facet-weighting math re-derived,
reverse-scoring mutation-tested). **The cautionary precedent transfers
directly though:** a ported 1987 process silently produced wrong
rankings, caught only by deliberate ground-truth tests against real
legacy output, not by type-checking. Self-check's new extraction step
needs that same discipline applied to itself.

## 3. Claims-framing — DECIDED, final (operator delegated, 2026-10-08T23:30 UTC)

Operator: "bshr and make the call, I trust your recommendation." The
layered framing below is now **final, not provisional**. Original
question was a binary "does the report claim 1987 provenance, yes/no" —
caught as wrong before it went out, since **provenance is layered, not
binary**, checked against `GPASCORE.ASF` layer by layer:

| layer | 1987? | basis |
|---|---|---|
| the 16 items | yes | recovered verbatim, `GPAQUEST.ASF` offset 42276 |
| the 6 facets + membership | yes | named narrative blocks in source |
| the four-rung ladder | yes | 1987's own wording |
| refusing sparse data | yes | refusal string verbatim |
| aggregation into the overall | ours | well-founded by 1987's facet-first structure, but unverified (arithmetic compiled, not recovered) |
| the ratings under (B) | no | model-inferred from speech, not self-reported |

**Final report copy, this exact framing — checked against the already-
shipped form, two real refinements found:**

**1. ADD to the existing copy, don't replace it.** The shipped form
(`dashboard/self-check/[id]/page.tsx:285`) already says *"This is your
own read of the relationship, not {client}'s. It is a prompt for a
conversation, not a measurement of one. The 16 questions come from the
Client Relationship module of a 1987 consulting diagnostic, recovered
verbatim and reworded for plain English."* Already layered correctly
(1987 claimed for the questions only), and "not a measurement of one" is
a STRONGER disclaimer than the locked sentence alone carries — it's what
stops a consultant treating the number as a measurement at all. Swapping
the locked sentence IN PLACE OF this line would be a net downgrade in
honesty. The locked sentence explains provenance; the existing line
manages the claim. Ship both.

**2. The copy cannot be one static string — it must vary by input
modality.** "The voice-inferred ratings are ours" is only true for
voice-completed reports; the shipped form correctly says "your own read"
because on the FORM the ratings genuinely are the consultant's own. Once
both input paths coexist, applying the voice sentence to a
form-completed report would wrongly tell a consultant their own
self-ratings were ours — exactly the downgrade §3 point 1 warns about,
in the other direction. **Key the sentence on the same `output_kind`-
style discriminator the pipeline already uses for routing:**

```
form:   ... the four-step interpretation are verbatim 1987; the final
        score's formula is ours, and the ratings are your own.
voice:  ... the four-step interpretation are verbatim 1987; the final
        score's formula and the voice-inferred ratings are ours.
```

Nothing blocking, nothing shipped needs changing today — this is a build
requirement for whenever the voice path actually ships, flagged now so a
single hard-coded string doesn't get written later by whoever builds it
without this context.

## 3b. Extraction prompt draft v1 — committed, two real design choices worth recording

`docs/BRIEF_self-check-extraction-prompt-draft.md` (builder-3). Reasoned
entirely from the instrument's structure; **nothing run against a model
yet** — all four gates are the acceptance tests and all need a key, so
this draft is exactly as unvalidated as the architecture it serves.

- **Deliberately omits THOR's own "do NOT default to null" instruction.**
  That instruction is a correct inference from THOR's structure (180
  questions, a noise-tolerant weight matrix — a null there genuinely
  costs signal) and the exact wrong inference for self-check (16 items,
  no redundancy, nulling IS how the instrument refuses, recovered
  verbatim from the 1987 source). Same instruction, opposite
  correctness — GATE 1 stays elevated specifically because this is the
  trap a thor-extract-modeled prompt would walk into.
- **GATE 3 solved by STRUCTURE, not instruction:** the draft presents
  the 16 items flat and never names the facets to the model. `thin`
  only exists via within-facet disagreement; showing the model its own
  groupings invites it to reason "how is trust going" and smooth 5
  items into one impression, deleting the band silently. Not handing it
  the grouping at all is a strong control; instructing it not to
  generalize would have been a weak one. `score.ts` needs the facet
  structure; the model doesn't.
- The silence-handling block names four specific do-not-infer patterns,
  two of which (absence-of-complaint, adjacent-topic) are exactly the
  traps the self-test transcript used — aimed at a demonstrated failure
  mode, not a hypothetical one.

**New risk surfaced, bigger than the extraction prompt itself, nobody
has started it:** the extraction prompt only covers half the problem.
**The voice AGENT's own side — how it covers 16 topics conversationally
without reading them aloud as a checklist — is a separate, harder design
question**, unstarted. This may be the real risk to (B) producing usable
coverage at all, more than the extraction prompt's correctness. Flagging
as its own scope item, not yet assigned.

## 3c. Voice agent design v1 — committed, one NEW HARD GATE found, plus a real unblock

`docs/BRIEF_self-check-voice-agent-design.md` (builder-3). Ready for gm
to create the actual ElevenLabs agent from.

**The natural-conversation-vs-checklist tension dissolved, against
builder-3's own first instinct:** the org agent's real production
history (`TUL-34`, `TUL-41`) already tried the "adaptive, latitude-given"
version and paid for it specifically — temp 0.7→0.3 after improvised
off-script follow-ups, and the agent literally self-answering its own
probe on Haiku. The scripted sequence isn't timidity, it's the residue of
trying the alternative. Resolution: the org diagnostic's 25 probes are
open QUESTIONS, not items to rate, with no 1:1 question-to-dimension map
— so self-check gets **10 fixed conversational questions in order**
whose natural answers cover all 16 items, no item text ever read aloud,
naturalness living in the questions themselves, not agent latitude.
Production's own fixes carried forward verbatim: the CRITICAL ROLE RULE
block, Sonnet (not Haiku), temp 0.3, no invented follow-ups.

**GATE 5 (NEW, HARD) — the agent can fabricate the transcript, and
already has (TUL-41, observed, not hypothetical).** This is the most
severe gate found so far: all four existing gates operate downstream of
the transcript, so a fabricated respondent answer (the agent generating
speech nobody said) is invisible to every one of them — worse, it makes
`answered` go UP, pushing the refusal gates toward PASSING rather than
refusing the exact thing they exist to catch. More severe here than on
the org diagnostic: 180 THOR questions with a noise-tolerant weight
matrix absorb one bad answer; 16 self-check items have no redundancy,
and `expectations` is a single item — one fabrication scores a sixth of
the headline outright, invented. **GATE 5 belongs on the AGENT, not the
extractor** — nothing downstream can detect it once it happens.

**Real unblock: GATE 5 is testable right now, no human respondent, no
Anthropic key.** `docs/ELEVENLABS_AGENT.md` documents a validation
harness (EL's simulate-conversation API + eval criteria) already used to
validate the Lite agent as "8/8 probes in order, no self-answering,
clean end_call" — "no self-answering" is already an eval criterion
there. Coverage is half-testable the same way: simulate N conversations,
measure which facets come back scored, two-facet-refusal as the pass
bar. **This makes GATE 5 the first gate that can be validated, ahead of
the extraction-side gates which still need the key.**

**Probe design reasoning, not arbitrary:** all 5 reverse-coded items
need event-based probes ("tell me about a time...", "how do you know
that?"), never self-assessment questions — nobody volunteers "my client
doesn't trust my full range" as a self-report, but a reverse-coded item
exists precisely where free conversation would systematically
underperform if asked directly. Two probes do specific, non-obvious
work: P8 asks for a specific EVENT (not "do they know your full range,"
which invites "yes"); P10's "...and how do you know that?" clause is
load-bearing (the self-test transcript's own trap failed exactly here —
satisfaction is not evidence of deliberate expectation-setting).

**Open, stated honestly, not guessed past:** can the agent track
coverage mid-call (no, not reliably on a system prompt alone — the
10-fixed-probes design deliberately doesn't require it); whether 10
probes can shrink to match Lite's 8 if needed (merge 5+6 if forced,
never cut 8/9/10 — they're the only route to 4 of 6 facets); whether the
event-recall probes actually land in practice (measurable by
simulation). **Nothing here is validated against a real conversation
yet** — reasoned from the instrument and from documented production
failures, ready to build an agent from, not yet confirmed correct.

## 4. Sequencing

```
1. GATES 1-4 on the extraction prompt, iterating on synthetic transcripts
   (praise-only, criticism-only, mixed, silence-on-one-facet,
   silence-on-expectations) until all four pass. Pure prompt engineering
   against the existing `scoreSelfCheck` -- no infra, no voice agent.
   Must NOT be gated on the voice agent existing yet.

2. Only once all four gates pass: move to voice infrastructure.

3. THEN the build-time blockers, which don't block steps 1-2:
   - **ElevenLabs agent — UNBLOCKED, 2026-10-09T09:57 UTC.** gm has live
     ElevenLabs MCP access against the real toddito/Pulse workspace
     (confirmed via agents_list showing Pulse Lite/Full), can create the
     self-check voice agent directly via `agents_create` once the
     voice-agent conversational design (§3b's flagged risk) exists. No
     dashboard access needed from anyone else.
   - **ANTHROPIC_API_KEY — still open.** Operator says it's set on
     Coolify, but that only means the deployed app can call Claude, not
     that the fleet's local test harness can. gm asking for the actual
     value or another path directly.
   - Real validation needs more production self-check data than exists
     (1 account, 0 self-check rows as of tonight) -- synthetic
     transcripts carry the validation burden until usage accumulates.

**Update 2026-10-09T10:06 UTC — agent created, NOT ready, one real
blocker needs dashboard access.** gm created `agent_3101m4g20d5ce9tb0fmw7sfb65wa`
("Pulse Self-Check") via ElevenLabs MCP using builder-3's approved
design/probes — name/voice/language/first_message/prompt are correct.
**The MCP connector's advanced-settings escape hatch is broken** ("Unexpected
argument(s): body" on every attempt), so four settings defaulted WRONG and
would reproduce the exact production failures GATE 5 exists to prevent if
tested as-is:

```
llm: qwen35-397b-a17b           needed: claude-sonnet-4-5 (GATE 5 -- this
                                 exact model fixed TUL-41 self-answering)
temperature: 0                  needed: 0.3 (GATE 5 -- fixed TUL-34
                                 improvised off-script follow-ups)
tools: []                       needed: end_call system tool, or the
                                 agent can't hang up after probe 10
dynamic_variable_placeholders:  needed: consultant_name, client_name --
  {}                            referenced throughout the prompt
```

**5-minute manual fix, needs ElevenLabs dashboard access:** Agent settings
→ LLM: Claude Sonnet 4.5, Temperature: 0.3, add the `end_call` system
tool, add the two dynamic variables. Correctly NOT reported as ready or
tested against — gm flagged this rather than claiming false progress.
This is now THE blocker on GATE 5 testing specifically (the one gate that
was supposed to be testable without further operator action).

**Operator deferred the fix (2026-10-09T10:23 UTC) — no rush, will do
later. GATE 5's simulate-conversation eval is explicitly HELD until the
fix lands** (testing against qwen/temp-0 now would validate the wrong
model and wouldn't predict the real agent's behavior). Design, probes,
and prompt content stay approved and don't wait on this.
```

## 5. What's reusable vs. new

```
REUSABLE AS-IS:
  ElevenLabs voice-call infrastructure (signed-URL minting, webhook
    receipt pattern) -- same shape as the org-diagnostic's, new agent ID
  FOCUS EVIDENCE's absence-is-affirmative-evidence invariant (PLAN §14,
    production-proven on the org-diagnostic side)
  self_check_reports table / migration 034 (already live) -- schema
    doesn't change, only how `responses` gets populated
  score.ts entirely -- orientedRating, facet means, band thresholds,
    all four refusal gates -- genuinely unchanged

NEW:
  The voice-transcript extraction prompt (1-7 per item, item's own
    polarity, modeled on thor-extract.ts's SHAPE but explicitly NOT its
    decisiveness instruction)
  GATES 1-4 as explicit acceptance tests on that new prompt
  A new ElevenLabs agent + voice UI replacing the current Likert form
```

## What to tell the operator

Architecture confirmed as already-built (extract→deterministic, matching
the THOR precedent) — not new work, and `score.ts` (the most-tested code)
doesn't change at all. The real new work is a voice-transcript extraction
prompt, and it must NOT be modeled too literally on THOR's own extraction
prompt (THOR's "be decisive" instruction would actively work against
self-check's refusal gates). Four go/no-go gates on that new prompt, none
needing a voice agent or API key to check computationally; the behavioural
halves need a real model call. Self-check's structure independently
corroborates the real 1987 source on four of six layers — only the final
aggregation formula and (under voice) the ratings themselves are new.
Provenance claim question is with the operator now, properly layered.
Real build blocked on: a new ElevenLabs agent (dashboard access), an API
key (same standing ask), and more production usage to validate against.
