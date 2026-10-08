# Toddito self-check: voice-modernize via free-form inference (B)

- **Requested by:** operator, via gm, Telegram, 2026-10-08. Confirmed choice:
  (B) — free-form inference, explicitly "just like we did already with the
  original org diagnostic, so far it's yielding incredible results."
- **Research:** builder-3, `docs/BRIEF_self-check-voice-input-research.md`
  (`6f5bf78`) + addendum (`256744d`) — full findings folded in below, not
  re-derived.
- **Not urgent** — normal pace, proper process. This doc is the planning
  phase; nothing built yet.

## 0. What "(B)" actually commits to — confirmed by gm, not guessed

gm already flagged this to the operator and is waiting on explicit
confirmation of the framing (not the choice itself, which is settled):
**(B) makes this a NEW instrument that reuses the 1987 item content as
conversation topics, not the same scored instrument with a swapped input.**
The 16 items' weights were calibrated for self-report ("a consultant reads
a statement and picks a number"); inferring the same ratings from free-form
language changes what's being measured (self-perception →
observed-language-about-the-relationship), not just how the number is
captured. Proceeding with planning on that premise — if the operator's
confirmation comes back different, the scope below changes accordingly,
flagged so build doesn't start on an unconfirmed premise.

## 1. The three structural findings that shape the design, not just risks to note later

Each of these changes something concrete in the build, not just a caveat
for the report:

**1a. The refusal gates are structurally defeated by a full fill, not
probabilistically.** Today's `MIN_ANSWERED=12`/`MIN_SCORED_FACETS=5` gates
exist to refuse scoring on thin signal — currently refusing 86.9% of
minimal-valid Likert subsets. If an LLM free-form-infers all 16 items every
time (which it will, by default, unless told not to), both gates clear
unconditionally and the protection they exist for disappears. **Design
requirement, not optional:** the inference prompt must be able to return
"no rating" per item when the conversation never touched it, and that
null-emission path needs its own test before anything else — this is
literally builder-3's test #1, run first.

**1b. Acquiescence has a free, pre-flight-testable fingerprint.** A model
that infers agreeable ratings without honoring reverse-coded items produces
a specific, checkable signature: the `awareness` facet (both items
reverse-coded) collapses toward `weak` while the overall headline stays a
plausible `solid` — nothing errors, the report reads fine, and it's wrong.
**Design requirement:** before any prompt is trusted, score a transcript of
unambiguous praise and confirm `awareness` does NOT come back weak. This is
builder-3's test #2's companion check — cheap, repeatable, becomes a
standing regression check for any future prompt edit, not a one-time
validation.

**1c. The `thin` band requires within-facet disagreement, not a low mean —
and a holistic-reasoning model will delete it by construction.** No uniform
fill (same rating repeated across a facet's items) can produce `thin`; it
needs genuine item-level disagreement within one facet (e.g. trust's 5
items summing to 16-19). A model reasoning about "the relationship" as one
impression rather than 16 separable observations will naturally make
facets internally consistent — which silently removes the 1987 ladder's
"uneven relationship" rung from the product, with every report still
scoring cleanly. **Design requirement:** the inference prompt must be
instructed to let item-level ratings disagree within a facet when the
conversation actually supports that, not smoothed to one impression per
facet — and validation must check per-item variance, not just facet means
(a study that only compares facet-mean outputs could destroy this band
without anyone noticing).

## 2. The scoring-prompt design — modeled on the org-diagnostic, with one
deliberate divergence

The org-diagnostic's own governing instruction is a deliberate rejection of
self-report: *"Do not score what they claim to believe. Score what their
language demonstrates."* That's safe there because its 0-10 dimensions were
designed from scratch for language inference. The self-check's 16 items
were NOT — so the new prompt needs the same STRUCTURE (read language,
surface what the respondent can't see themselves) while explicitly carrying
forward the three constraints above as first-class instructions, not
discovered-later bugs:

- Per-item null is a valid, expected output — "if the conversation never
  touches this, don't guess; the gate exists for a reason."
- Reverse-coded items need the model to track polarity explicitly, not
  infer sentiment and apply it uniformly — the `awareness` fingerprint
  check (1b) is the acceptance test for this working.
- Item-level ratings within one facet are allowed to disagree — explicitly
  tell the model not to smooth a facet to one impression.
- Same `FOCUS EVIDENCE` invariant the org-diagnostic already proved out in
  production (§14: absence = affirmative evidence the topic is off-radar,
  not mere silence) — directly reusable, not a new concept.

## 3. Sequencing — tests before build-time dependencies, not in parallel

```
1. builder-3's 2 cheap tests (already dispatched, running now):
   - fabrication-on-silence: does a draft prompt emit a rating for an
     untouched facet? Does the 86.9%-refusal protection survive?
   - band-extreme reachability: do inferred ratings on synthetic
     strong/weak transcripts actually reach the strong/weak bands?
   Both run against the existing pure `scoreSelfCheck` -- no new infra,
   no voice agent, no API key beyond a normal model call.

2. Draft the actual inference prompt against those two tests as the
   acceptance bar, iterating on a handful of synthetic transcripts
   (praise-only, criticism-only, mixed, silence-on-one-facet) before
   touching any voice infrastructure. This is the highest-risk, most
   iteration-heavy piece and should NOT be gated on the voice agent
   existing yet.

3. THEN the build-time blockers, which don't block steps 1-2:
   - New ElevenLabs agent + env var (ELEVENLABS_AGENT_ID_* pattern already
     exists per-tier; this facet needs its own, dashboard access required
     from whoever holds it)
   - ANTHROPIC_API_KEY for testing against the real model on real
     transcripts (same shared blocker as the §14/PR#9 thread all
     session -- operator has consistently declined to provide one;
     ask again specifically for this initiative rather than assuming
     the same no carries over silently)
   - Real validation needs more production self-check data than exists
     (1 account, 0 self-check rows as of tonight) -- synthetic transcripts
     carry the validation burden until real usage accumulates.
```

## 4. What's reusable vs. new

```
REUSABLE AS-IS:
  ElevenLabs voice-call infrastructure (signed-URL minting, webhook
    receipt pattern) -- same shape as the org-diagnostic's, new agent ID
  FOCUS EVIDENCE's absence-is-affirmative-evidence invariant (§14,
    production-proven)
  self_check_reports table / migration 034 (already live) -- schema
    doesn't change, only how `responses` gets populated
  The existing band-threshold math (score.ts) -- unchanged; what changes
    is what feeds it

NEW:
  A self-check-specific scoring prompt (not a copy of the org-diagnostic's,
    its own instrument/dimension set)
  The null-per-item emission contract + its test (§1a)
  The polarity-fingerprint regression check (§1b)
  The within-facet-variance validation approach (§1c)
  A new ElevenLabs agent + voice UI replacing the current Likert form
```

## What to tell the operator

Direction is set (B), planning proceeding. Three structural findings
(not just "risks to note") now shape the actual design: the model must be
able to say "no rating" per item or the refusal protection silently
disappears; there's a free, repeatable pre-flight check for whether a
prompt respects reverse-coded items; and the "thin" (uneven relationship)
band only survives if item ratings are allowed to disagree within a facet,
which needs validating on per-item variance, not just facet means. Two
cheap tests are running now with no new infrastructure. Real build is
blocked on three things outside this fleet's control: a new voice agent
(needs dashboard access), an API key for real-transcript testing (same
standing blocker as earlier tonight), and more production self-check
usage to validate against.
