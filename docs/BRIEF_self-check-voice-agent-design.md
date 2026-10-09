# Self-check voice agent — conversational design, draft v1

builder-3, 2026-10-09. Assigned by `plan` as critical path; gm can create the
agent from this via ElevenLabs MCP. Reasoned from the instrument's structure
and from the org agent's production history, which turned out to matter more
than anything I would have invented.

---

## 1. The tension I flagged has already been resolved in production — against me

I framed this as *"natural conversation vs. read-aloud questionnaire."* The org
agent's history says that framing is wrong, and every loosening toward
"natural" was paid for in a specific failure:

| change | why | source |
|---|---|---|
| temperature **0.7 → 0.3** | the agent improvised follow-ups outside the prompt | TUL-34 |
| **Haiku 4.5 → Sonnet 4.5** | the agent **self-answered its own first probe** — invented a fake company answer when the user was silent | TUL-41 |
| *"Never follow up a follow-up. Never."* | unbounded follow-ups drifted off-instrument | TUL-34 |

So the house pattern is a **tight scripted probe sequence with minimal
acknowledgement and no improvisation**, and it is scripted because the
alternatives were tried.

**The tension dissolves once you notice the org agent's probes are open
QUESTIONS, not items to rate.** 25 probes produce ~54 respondent turns and are
scored against many more dimensions than there are probes. Nothing requires a
1:1 map from instrument item to spoken question.

So the design is: **a fixed sequence of conversational open questions whose
natural answers yield evidence across all sixteen items.** Faithful to the
proven pattern; no item text is ever read aloud. The naturalness lives in the
*questions*, not in agent latitude.

---

## 2. GATE 5 — the agent can fabricate the transcript, and it has

This is the most important finding here and it is not hypothetical. TUL-41: the
agent **generated a respondent answer when the user was silent.**

**All four existing gates live downstream of the transcript.** My extraction
prompt's *"silence is not disagreement"* rule is useless against this, because
the transcript contains no silence — it contains a fabricated answer that reads
as genuine speech. And the gates count it as *answered*, so the refusal
mechanism is defeated too.

It is worse for the self-check than for the org diagnostic, for reasons that
are structural:

- The org diagnostic has 180 THOR questions and a weight matrix that absorbs one
  bad answer. The self-check has **16 items and no redundancy.**
- **`expectations` is a single item.** One fabricated answer scores that facet
  outright — a sixth of the headline, invented.
- A fabricated answer makes `answered` go **up**, which moves the gates toward
  passing rather than refusing.

**GATE 5 (hard): the agent must never produce respondent-attributed content.**
Non-negotiable, and it belongs on the agent, not the extractor — nothing
downstream can detect it.

Carry the production fixes verbatim rather than re-deriving them:

- The **CRITICAL ROLE RULE** block, as-is, including *"If the respondent is
  silent for any reason, WAIT. Do not fill the silence with a sample answer"*
  and the four permitted moves (wait / gently re-ask / "take your time" / offer
  to skip).
- **Sonnet, not Haiku.** The self-answering was a Haiku-at-low-temperature
  failure; Haiku was *"attracted to complete-the-turn patterns."*
- **Temperature 0.3.**
- *"Never invent a follow-up that isn't listed."*

---

## 3. Probe design — ten open questions covering sixteen items

Two structural facts from the instrument drove this.

**(a) Every one of the five reverse-coded items requires an admission.** The
client doesn't know our range; they went to a competitor; they suspect we're
expensive; they're guarded with me; they think I'd take advantage. **Nobody
volunteers these about their own client.** That is not a coincidence — the 1987
designers reverse-worded precisely the items where self-report would be
distorted, so **the reverse-coded set is a map of where free conversation will
systematically underperform.** Each therefore gets a dedicated probe that asks
for an **event**, never a self-assessment.

**(b) Coverage risk is inverted from facet size.** Nulling any *two* facets
triggers refusal, and the four small facets (`expectations` 1, `awareness` 2,
`value` 2, `network` 2) are the ones a relationship conversation naturally
skips. `trust` (5) and `access` (4) get covered by almost anything. So probe
priority favours the small facets.

| # | probe | items |
|---|---|---|
| 1 | Tell me about this relationship — how it started and where it is now. | CR01, CR02 |
| 2 | Walk me through the last time you gave them advice that cost you something — work you could have sold and didn't. | CR03, **CR05** |
| 3 | Tell me about the last time you and {{client_name}} didn't see something the same way. What happened? | **CR04**, CR02 |
| 4 | What did they do to get you up to speed when you started — who did you get access to, and what did they hold back? | CR08, CR11 |
| 5 | What's the widest thing they've asked your opinion on, including things outside what you were hired for? | CR12 |
| 6 | When they talk about next year — what are they trying to achieve, and what do they picture you doing in it? | CR13, CR07 |
| 7 | Who else inside the organisation would say you've helped them hit their own objectives? And who wouldn't? | CR14, CR16 |
| 8 | What's the most recent piece of work they gave to someone else, or had done that you only found out about afterwards? | **CR09, CR10** |
| 9 | When did fees last come up, and what was said? | **CR15** |
| 10 | What does {{client_name}} think they're getting from you by the end of this year — and how do you know that? | **CR06** |

All sixteen covered; bold marks the five admission items plus `CR06`.

Three probes are doing non-obvious work:

- **P8 is the awareness probe and it asks for an event**, not awareness. *"Only
  found out about afterwards"* is behaviourally diagnostic of CR09 in a way
  *"do they know your full range?"* never is — that question invites "yes."
- **P10's second clause is the whole probe.** CR06 is about a **deliberate act**
  by the consultant, so *"how do you know that"* is what elicits the act.
  Without it you learn the state, not whether anyone set it. My self-test
  transcript failed exactly here.
- **P7's *"and who wouldn't"*** forces the gap. CR16's honest answers are
  partial ("I know most of them, not the sales director"), and without the
  negative half the agent gets a clean yes.

---

## 4. What the eval harness unblocks — and it is more than I expected

`docs/ELEVENLABS_AGENT.md` records a validation harness: **EL's
simulate-conversation API plus eval criteria**, which validated Lite as *"8/8
probes in order, no self-answering, context re-framing, clean end_call."*

So **the conversational design can be validated with no human respondent and no
Anthropic key.** That matters because it covers the two things that most need
checking:

1. **GATE 5** — "no self-answering" is already an existing eval criterion.
2. **Coverage** — simulate N conversations, run the extraction over each
   transcript, and measure how often each facet comes back scored. The
   *"nulling any two facets refuses"* threshold gives a concrete pass bar.

The extraction half still needs an Anthropic key, so (2) is only half
available today. (1) is fully available now.

---

## 5. Genuinely open — not guessed at

- **Can the agent track its own coverage mid-conversation?** With a system
  prompt and no tools, not reliably. ElevenLabs supports tools
  (`agents_create_tool`), so it is possible but is new infrastructure. **This
  design deliberately does not require it** — ten fixed probes in order need no
  tracking, which is also why I did not propose the adaptive gap-filling design
  I started with.
- **Ten probes vs eight for Lite.** Unknown whether a self-check respondent
  will sustain ten. If it has to shrink, the probes to merge are 5 and 6 (both
  access/forward-looking); the ones that must **not** be cut are 8, 9 and 10,
  because they are the only route to four of the six facets.
- **Whether P2/P3 land.** They ask for a specific remembered event, and a
  consultant who cannot recall one produces silence — which is the correct
  null, but if it happens often, trust loses its two reverse items and the facet
  leans acquiescent. Measurable by simulation.
- **Nothing here is validated.** Every line is reasoning from the instrument and
  from the org agent's recorded failures. The design is ready for gm to create
  an agent from; it is not ready to be called correct.
