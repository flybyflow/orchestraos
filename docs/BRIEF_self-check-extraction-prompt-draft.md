# Self-check extraction prompt — draft v1

builder-3, 2026-10-08. Assigned by gm and `plan`. Design stage: this is the
prompt text plus the rationale tying each choice to a gate. No code; the
ElevenLabs agent does not exist yet and the behavioural tests need a key.

Contract, as approved: **the model emits RAW per-item agreement on the
instrument's own 1-7 scale and in the item's own polarity. `score.ts` keeps all
orientation, banding and gating logic and is not modified.**

---

## The single most important difference from `thor-extract.ts`

THOR's extractor says, verbatim:

> *"be decisive — pick +2 or -2. Reserve +1/-1 for partial signal. Only return
> null when the transcript is genuinely silent on the topic. **Do NOT default to
> null to be safe — that drops diagnostic signal.** THOR was designed to be
> answered by busy executives in 30 minutes; pick the closest answer."*

**That instruction is correct for THOR and wrong here**, and the reason is
structural rather than stylistic:

| | THOR | self-check |
|---|---|---|
| questions | 180 | **16** |
| redundancy | high — a weight matrix over many items absorbs noise | **none** — one item *is* a facet in one case |
| what protects a thin read | the matrix | **the gates** (`MIN_ANSWERED_OVERALL`, `MIN_SCORED_FACETS`) |
| cost of a null | drops signal the matrix would have used | **triggers the protection that exists for exactly this** |

So THOR is right that nulling costs it signal. For the self-check, nulling is
**how the instrument refuses**, and the refusal is a feature recovered verbatim
from 1987 (`GPASCORE.ASF`: *"Too many items were omitted to permit the
generation of an overall score or description"*). A prompt derived too literally
from `thor-extract.ts` would import an argument against the mechanism it most
needs. This is why GATE 1 is *elevated* under this architecture, not resolved
by it.

## A non-obvious structural choice: present the items FLAT, never grouped by facet

`thin` — the 1987 ladder's *"greater effort"* rung — is only reachable when a
facet's own items disagree (Addendum 1: no uniform oriented level lands in its
window). If the prompt shows the model its facet groupings, the model will
reason about *"how is trust going"* and smooth the five trust items toward one
impression, which **deletes `thin` from the product silently.**

So the prompt lists all sixteen items in a flat, non-grouped order, never names
the facets, and explicitly says items in the same area may legitimately differ.
The model does not need to know the grouping; `score.ts` does.

That is GATE 3 addressed by prompt *structure* rather than by instruction, which
is more reliable than asking a model not to generalise.

---

## Draft prompt

```
ROLE
You are reading a conversation in which a consultant reflects on their own
working relationship with one client. Your only job is to record, for each of
the sixteen statements below, how strongly this consultant's own words support
that statement — or to record that the conversation does not say.

You are not diagnosing the relationship and not writing a report. You are
transcribing a judgement the consultant has already expressed in prose into the
scale the instrument uses.

THE SCALE — 1 to 7, agreement with the statement AS WRITTEN
  7  the transcript strongly supports this statement
  6  supports it
  5  leans toward it
  4  genuinely balanced, or the consultant says "it depends" with both sides
  3  leans against it
  2  contradicts it
  1  the transcript strongly contradicts this statement
  null  THE CONVERSATION DOES NOT SAY

POLARITY — read this twice, it is the highest-consequence rule here
Rate agreement with each statement exactly as it is worded, including the ones
worded so that agreement is bad news. Do NOT convert to "how healthy is this".
Something downstream does that conversion and will do it again, so if you
pre-convert, the result is inverted and the consultant is told the opposite of
the truth with no error anywhere.

  Worked example. Statement: "The client is not aware of the full range of what
  the firm does." The consultant says: "She has no idea we do the regulatory
  work." That STRONGLY SUPPORTS the statement as written. Answer 7 — even
  though it is bad news about the relationship. Answering 1 because the news is
  bad is the single most damaging mistake you can make in this task.

SILENCE IS NOT DISAGREEMENT
Return null whenever the conversation does not address a statement. Null is a
correct, expected, and useful answer — the instrument is built to refuse when
too little was covered, and that refusal is more valuable than a guess.

Specifically, do NOT infer a rating from:
  - general warmth or general gloom about the relationship
  - the absence of a complaint. "They have never objected" is not evidence that
    something was done well; it is evidence that nothing went visibly wrong.
  - an adjacent topic. Satisfaction with delivered work says nothing about
    whether anyone set expectations; access to data says nothing about trust.
  - what a competent consultant probably did. Record what this one said.

Only answer 1 or 2 when the transcript gives evidence AGAINST the statement.
If it simply never comes up, that is null, not a low score.

EACH STATEMENT IS SEPARATE
Judge the sixteen independently. Several touch related ground, and a consultant
can be strong on one and weak on its neighbour — that unevenness is real signal
the instrument is designed to capture, so do not smooth it into a single
impression of the relationship.

CITATION
Every non-null answer carries the words you relied on, verbatim, as
[said: "..."]. If you cannot quote the transcript for an answer, the answer is
null.

OUTPUT
Valid JSON only. No preamble, no markdown fences.
{
  "CR01": { "rating": 1-7 | null, "said": string | null },
  ... all sixteen codes ...
}
```

Items are injected flat, in code order, with `{{client}}` and `{{firm}}`
interpolated by `renderItem()` as the form already does.

---

## How each gate is served

| gate | served by | mechanism |
|---|---|---|
| **1** — can return no rating | the SILENCE block, and the deliberate absence of THOR's "do not default to null" | instruction, plus removing a counter-instruction |
| **2** — polarity / no acquiescence inversion | the POLARITY block with a worked reverse-item example | instruction; **acceptance test is the praise-transcript check** (`awareness` must not read weak) |
| **3** — within-facet variance / `thin` survives | **flat item order, facets never named**, plus EACH STATEMENT IS SEPARATE | structure first, instruction second |
| **4** — `expectations` returnable unscored | the four named do-NOT-infer patterns, of which two (absence of complaint, adjacent topic) are exactly the traps the self-test transcript used | instruction aimed at the specific failure |

## What this draft does not do

- **It is unvalidated.** Every line is reasoning from the instrument's
  structure; nothing has been run against a model. The four gates are the
  acceptance tests and all four need a key.
- **It does not address the voice agent's side** — what the agent asks, how it
  covers sixteen topics conversationally without reading them aloud. That is a
  separate design and the harder half of making (B) produce usable coverage.
- **`sanitizeResponses` already rejects out-of-range values**, so a model that
  ignores the scale fails closed into null rather than corrupting a score. That
  is existing protection, not something this prompt adds.
