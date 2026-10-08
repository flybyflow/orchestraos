# Voice-modernizing the Client Relationship self-check — research findings

builder-3, 2026-10-08. Brainstorm/research/hypothesize stage only. No code.
Dispatched by `plan` (`msg_40c74f3c_532311`) from the operator via gm.

Constraint honoured throughout: **the 16-item instrument, its vectors and its
weights are the recovered 1987 source of truth and are not up for revision.**
Only the input mechanism is in scope.

---

## 1. The headline: "voice-modernize the input" is two different proposals

They share a UX and have opposite validity profiles. Everything below depends
on which one is meant, which is why it is the first question back to the
operator rather than something to assume.

**(A) Conversational ELICITATION.** The agent asks the 16 items aloud. The
consultant answers in natural language — *"yeah, definitely"*, *"not really"*,
*"depends on the week"* — and an LLM maps each utterance onto that item's 1-7
rating. The form disappears; the **self-report construct survives intact**.

**(B) Free-form INFERENCE.** The agent has an open conversation about the
client relationship. An LLM infers all 16 ratings from the language, the way
the org diagnostic infers calibrated 0-10 dimension scores. No item is ever
put to the respondent.

The operator's phrasing — *"matching the pattern the main org-diagnostic
interview already uses"* — points at **(B)**. But (A) delivers the same
experiential win (no Likert grid, you just talk) at a fraction of the
psychometric cost. My read is that (A) is probably what is actually wanted and
(B) is how it got described, because the org diagnostic is the nearest visible
example. Worth confirming before anyone plans a build.

---

## 2. Why the org-diagnostic analogy is weaker than it looks

Not a technical objection. A **construct** one.

The org scoring prompt's own instruction, verbatim:

> Do not score what they claim to believe. Score what their language
> demonstrates.

That is a deliberate *rejection* of self-report. And it is safe there because
the org diagnostic's 0-10 dimensions were **designed from scratch for language
inference** — there is no external instrument whose weights depend on those
numbers meaning any particular thing. The deterministic THOR engine is a
separate path.

The self-check is the mirror image. It **is** a self-report instrument: its
construct is the consultant's own perception of the relationship, and the 1987
weights were designed around the operation *"a consultant reads this statement
and picks a number."* Option (B) therefore does not merely change how the
number is captured — it **changes what is being measured**, from
self-perception to observed-language-about-the-relationship, while keeping
weights calibrated for the first.

**So the honest answer to `plan`'s question is: yes, (B) introduces a new
uncalibrated translation step, and worse, the step is not measure-preserving.**

### The genuinely interesting tension

(B) might measure the *useful* thing better while matching the *calibrated*
thing worse.

Social-desirability pressure on "rate your own client relationship" is severe —
few consultants self-rate a live client as weak. The org diagnostic's entire
philosophy exists because self-report is unreliable, and that argument applies
with more force here, not less. So (B) could be clinically superior and
psychometrically unanchored at the same time.

That is a product and epistemics call, not an engineering one. It belongs with
the operator, with the trade stated in exactly those terms.

---

## 3. What the numbers say — the compression risk is quantified, not speculative

The band thresholds translate back to Likert means as:

| band | ten-scale | **required facet mean (of 7)** |
|---|---|---|
| strong | ≥ 7.50 | **≥ 5.50** |
| solid | ≥ 5.00 | **≥ 4.00** (exact neutral) |
| thin | ≥ 3.50 | ≥ 3.10 |
| weak | < 3.50 | < 3.10 |

Two things follow.

**`solid` is a 1.49-point window sitting immediately above neutral.** If
LLM-inferred ratings cluster toward the middle — the standard failure mode for
model-assigned Likert values — most facets land in `solid` regardless of the
underlying relationship. Four bands collapse toward one. **Every number stays
valid, every report still scores, and nothing errors.** That is the dangerous
shape: a silent loss of discriminating power.

**And the instrument is already known to be tight around neutral.** From
`score.ts`, a design note someone wrote after hitting this:

> The `solid` floor is 5.0, not 5.5, and that is deliberate: 5.0 is exactly
> where every item answered "Neither" lands (rating 4 of 7). At 5.5 the
> all-neutral answer came back "Thin in places", so a consultant with no strong
> view on anything was read as mildly negative.

A threshold has *already* been retuned once because neutral answers landed in
the wrong band. That is direct evidence the boundaries are sensitive exactly
where inferred ratings would pile up — and it is evidence from this repo's own
history rather than from general LLM lore.

---

## 4. Two facets are structurally more exposed than the rest

Parsed from `items.ts`: facet sizes `trust 5, access 4, awareness 2, value 2,
network 2, expectations 1`; reverse-coded `CR04 CR05 CR09 CR10 CR15` (5 of 16).

**`awareness` is 2 items and BOTH are reverse-coded.** Reverse coding is a
self-report device — it exists to catch acquiescence bias by making agreement
mean the opposite on some items. Under (B) the respondent never encounters the
item text, so "reverse" has no referent at all: the model must decide whether
volunteered language indicates agreement with a statement never presented. The
whole facet's measurement rests on a mechanism that does not survive the
modality change.

**`expectations` is a single item (`CR06`) carrying a sixth of the headline.**
On a form it is always answered — it is on the page. In a conversation, whether
that one topic comes up is luck. `review` independently re-derived that one
click on this item moves the overall by 1.67, five times any trust item. So the
facet most likely to go unscored under (B) is the one with the most leverage,
and `MIN_SCORED_FACETS = 5` means losing it is survivable — which is worse,
because it means the instrument quietly changes meaning instead of refusing.

---

## 5. The reusable primitive already exists, and it already solves the hard part

The org prompt's `FOCUS EVIDENCE` block tags whether a transcript carries real
signal on each of 16 named topics, with `[said: "..."]` citations. Its
definition of absence is the exact distinction a voice self-check needs:

> `"absent"` = the language AFFIRMATIVELY suggests it is off the radar
> (dismissed, never considered, visibly neglected) — **not mere silence**

**Not-mentioned ≠ rated-low.** That is the single most important invariant for
either option, and it is already specified, shipped, and exercised in
production — the §14 work measured `focus_evidence` scaling 0→6 entries on real
transcripts, so the machinery demonstrably works on speech.

This is the strongest feasibility evidence in the brief, and it is a concrete
mechanism to extend rather than an analogy.

---

## 6. Hypotheses, with the tests that would falsify them

**H1 — (A) is validatable, (B) is not, with the data that exists.**
(A)'s translation step is narrow: verbal quantifier → number, on an item the
respondent actually answered. (B)'s requires re-deriving 1987 weights against a
new construct, and there is no norming sample, no original validation data, and
no way to recover either. **Under (B) you can only ever measure agreement with
the old modality, never recalibrate for the new one.** That asymmetry is
decisive if fidelity to the instrument matters.

**H2 — inferred ratings will under-reach both band extremes.**
Falsifiable: does the inferred distribution hit ≥5.50 and <3.10 at rates
comparable to self-rating? If not, two of four bands are gone. Detectable at
small n because it is a variance claim, not a mean claim.

**H3 — reverse-coded items will agree worse than forward items**, with
`awareness` (2/2 reverse) worst. Falsifiable by per-item agreement, split by
`reverse`.

**H4 — the answered-count gates go vacuous under (B).**
Today `MIN_ANSWERED_OVERALL = 12` plus `MIN_SCORED_FACETS = 5` refuses an
overall **86.9%** of the time at exactly 12 answers (enumerated during PR #2:
1581 of 1820 subsets). Models dislike emitting nulls, so (B) likely returns 16
of 16 every time — the gates stop firing, and a protection that currently
refuses most thin inputs silently approves everything. Falsifiable: distribution
of `answered` under voice vs form.

**H5 — a conversation covers more ground than a form**, so (A) materially
improves the gate-pass rate. This is the real product win and it is independent
of the psychometrics: the 86.9% refusal above is a live UX problem that (A)
plausibly fixes.

### Two tests are runnable now, with no agent and no paired data

- **H4 and the not-mentioned invariant** are *prompt* tests. Build a transcript
  that deliberately never touches `expectations` and ask whether the model
  returns a null or invents a rating. No voice infrastructure required.
- **H2** needs only synthetic transcripts spanning deliberately strong and
  deliberately weak relationships, scored by the candidate prompt. If the
  outputs never reach 5.50 or 3.10, that is known before anything is built.

The expensive test is paired administration (same consultant, same client, both
modalities), and the measure that matters there is **band agreement**, not
per-item correlation — the band is what the report shows a human.

---

## 7. Dependencies that will bite at build time, flagged now

- **A self-check voice agent does not exist.** Config is per-tier
  (`ELEVENLABS_AGENT_ID_LITE / _FULL / _DEEP`, with `deep` falling back to
  `full`). This needs a new agent plus a new env var, configured by someone with
  dashboard access. The voice path has been blocked on a nonexistent agent
  before.
- **No `ANTHROPIC_API_KEY` is available to this fleet** — the operator declined
  one for §14's A/B. Every test above except the structural ones needs model
  calls. So this initiative inherits that blocker and adds an ElevenLabs
  dependency on top.
- Any paired-administration study needs real consultants. Production currently
  holds **1 account and 0 profiles**, so the sample does not exist yet either.

None of these block the research stage. All three block the build, and they are
worth knowing before a plan is written around them.

---

## 8. Recommendation

1. **Settle (A) vs (B) first.** It determines whether this is a contained
   input-modernization or a re-validation project with no available ground
   truth.
2. **If fidelity to the 1987 instrument is the priority: (A).** Construct
   preserved, translation narrow and testable, weights untouched.
3. **If the operator's real interest is "self-report is unreliable, read the
   language instead": that is (B), and it is a legitimate and interesting
   product direction — but it should be framed as a NEW instrument that reuses
   the 1987 item content as a topic guide, not as the same instrument with a
   new input.** Calling it the same instrument is what would quietly invalidate
   the weights while every number still looks fine.
4. Run the two cheap tests (H4, H2) before committing to either, because both
   can fail in a way that is invisible afterwards.

---

# Addendum — computed, not hypothesised (same session)

Three of the five hypotheses above turned out to be **deterministic arithmetic
over the shipped scorer**, not experiments needing model calls. `score.ts` is
deliberately pure ("no Supabase, no Anthropic, no next/\* imports"), so I ran
the real `scoreSelfCheck` over simulated rating patterns. No API key involved.

Its own docstring is worth noting: *"The model's only job is to read a
transcript and emit a 1-7 rating per item"* — model-emitted ratings were
already anticipated by the original design.

## H4 is confirmed, and it is worse than "likely"

```
all-same rating 1..7, all 16 items answered:  overall refused 0 / 7
```

**The gates cannot fire against any input that rates every item.** 16 answers
clears `MIN_ANSWERED_OVERALL = 12`; 6 facets clears `MIN_SCORED_FACETS = 5`.
So the protection that today refuses an overall **86.9%** of the time at
exactly 12 answers becomes **structurally unreachable** the moment a model
fills in all 16. Not a probability — a property.

This is the single most actionable finding: whatever is built, the model must
be able to return *no rating*, and that path needs its own test.

## The acquiescence fingerprint — a specific, detectable signature

If the model rates agreeably without honouring reverse polarity (every item 6):

| facet | value | band | reverse |
|---|---|---|---|
| trust | 5.67 | solid | 2/5 |
| expectations | 8.33 | strong | 0/1 |
| value | 5.00 | solid | 1/2 |
| **awareness** | **1.67** | **weak** | **2/2** |
| access | 8.33 | strong | 0/4 |
| network | 8.33 | strong | 0/2 |
| **OVERALL** | **6.22** | **solid** | |

Versus the same model respecting polarity: **every facet 8.33 / strong,
overall 8.33.**

So the failure signature is: **`awareness` collapses to `weak` while the
overall stays a believable `solid`.** A 6.66-point swing in one facet that the
headline barely registers. Nothing errors, every number is in range, and the
report reads plausibly — it just says this consultant is blind to their client
when the data says nothing of the kind.

`value` (1/2 reverse) is half-affected and therefore *more* dangerous: it
drifts without collapsing, so it looks like a finding rather than a fault.

**This is a free pre-flight check.** Any candidate prompt can be scored against
a transcript of unambiguous praise; if `awareness` comes back weak, the prompt
does not understand polarity, and that is knowable before any validation study.

## The finding I did not predict: `thin` requires within-facet disagreement

Oriented level → overall, polarity held constant so this isolates compression:

```
L=1  0.00 weak     L=5  6.67 solid
L=2  1.67 weak     L=6  8.33 strong
L=3  3.33 weak     L=7 10.00 strong
L=4  5.00 solid
```

**No integer level lands in `thin`** (ten-scale 3.50–4.99). `thin` needs a
facet mean of 3.10–3.99, and for trust that means an item sum of 16–19 — which
no uniform fill produces. So:

- **`thin` is structurally the "uneven relationship" band.** It only appears
  when a facet's own items disagree. A consistent respondent can never produce
  it.
- **`expectations` can never be `thin` at all**, having one item: its mean is
  that integer, and no integer is in the window.

That matters directly for voice. A model reasoning about *"the relationship"*
rather than about 16 separate statements will naturally assign facet-level
impressions, making facets internally uniform — which **deletes `thin` from the
product.** The 1987 ladder's third rung ("greater effort", the *uneven* case)
stops being expressible, and nothing anywhere reports an error.

The inverse risk is equally real: a model noisy within facets manufactures
`thin` where the consultant would have been consistent.

So within-facet variance is not incidental to this instrument — **it carries
one of the four bands.** Any validation must compare per-item variance, not
just facet means. A paired study that matched on facet means and declared
success could have destroyed a band and not noticed.

## Correction to my own method, recorded

My first pass measured band reachability with *uniform* fills across all 16
items, and concluded that `[4..6]` loses `weak`, `thin` and `strong`. **That
was wrong** — on a mixed-polarity facet, uniform raw ratings make the reverse
items pull against the forward ones, so it was measuring polarity, not
compression. Isolating them (setting each item's *oriented* value) gives the
table above. Reporting the first version would have been a confident wrong
finding about the instrument's sensitivity.
