# Business Plan: Toddito as Silicon Jungle Ventures #1 — The 1987 Gap
Analysis and the Sponsor Flywheel

- **Requested by:** operator, via gm (msg_6419bdf4_1005100, 2026-09-29)
- **Authored by:** plan (non-interactive), research dispatched to a forked
  subagent for direct binary/string analysis of the 1987 system
- **Explicit scope instruction, honored:** this is a **standalone**
  document — NOT folded into `docs/PLAN_silicon-jungle-agentic-platform.md`
  or `docs/PLAN_toddito-engineering.md`, per the operator's direct
  instruction. It cross-references both (and the Todd feedback/build-spec
  docs) rather than re-deriving shared facts, but stands alone as a
  venture-strategy document, deck-ready.
- **What this is not:** an engineering plan (that's the companion
  document) or a market-validated financial model. Revenue, valuation, and
  specific sponsorship dollar amounts are explicitly marked TBD throughout
  rather than invented — a pitch deck built on fabricated numbers is worse
  than one with an honest gap, and this document may become exactly that
  deck.

## 1. The original system, confirmed ground truth (direct binary
inspection, not inferred)

Real historical artifact at `/Users/flybyflow/conductor/repos/
mic-program-toddito` — corrected from an earlier same-day dismissal as
"unrelated legacy DOS binaries" (that assessment was wrong; this **is**
the historical artifact, verified directly via `strings`/`unzip -l`, no
execution):

- **Product:** "The Organization Diagnosis System." Real acronym recovered
  from marketing text inside the binaries: **THOR = "THE ORGANIZATION
  REAPPRAISAL."** Copyright 1987, **STSC, Inc. and Dialectics, Inc.** —
  real, named companies, real year. 38+ years old as of 2026.
- **8 real, distinct variants** (lettered A, B, C, D, M, R, S, T), each a
  `GP{letter}QUEST/RISK/SCORE/LIB.ASF` file set. Originally packaged on 4
  floppy disks in non-semantic pairs (disk pairing is packaging, not
  meaning — confirmed by direct archive inspection).
- **Content analysis found 3 real underlying template families** by
  shared questionnaire/report text: **{A, M}** (short generic CALC/STRAT
  labels), **{B, S}** (External/Internal client-relationship-flavored
  language), **{C, D, R, T}** (the fullest shared text — compensation/
  reward systems, project-risk language, management-layer language). This
  is a genuine, evidence-based structural finding: **the original system
  was industry- or context-tuned into at least 3 real variants**, each
  with its own scoring weight file.
- **A separate, distinct module found in the same distribution:** `CPCSP.
  EXE` — **"THE CLIENT RELATIONSHIP MODULE."** Its own marketing text
  (`CSPHELP.ASF`, verbatim): "a diagnosis of the extent to which you have
  managed to build trust and credibility with key decision makers in the
  client organization... whether internal or external." This is not one
  of the 8 org-diagnostic variants — it's a **separate product surface**,
  evaluating consultant/client trust rather than organizational health.
- **RESOLVED (bshr, 2026-09-29):** which named industry each letter
  represents is answered directly in the binaries — `GPDDMS.ASF` maps
  Manufacturing/Service/Retail/Large Manufacturing/Large Service/Large
  Retail/Restaurant/Large Restaurant to GPM/GPS/GPR/GPA/GPB/GPC/GPT/GPD.
  Decoded: **A = Large Manufacturing, B = Large Service, C = Large
  Retail, D = Large Restaurant, M = Manufacturing, R = Retail,
  S = Service, T = Restaurant.** The industry-selection menu cited in an
  earlier draft of this section belonged to the *Client Relationship
  Module* and was a red herring — superseded by this direct hit. Todd is
  no longer the source needed for this specific mapping (§6's earlier
  "ask him directly" recommendation is retracted for this item).

## 2. The gap analysis — what the 1987 system's full scope covered that
today's Toddito (getyourpulse.io) doesn't yet

Cross-referenced against Pulse's own already-completed fidelity work
(`docs/methodology/pulse-vs-1987-fidelity-memo.md`, 8 findings — reused
directly, not re-derived) and Todd's own stated Application Suite
framework (per `~/.gstack/projects/conductor/ceo-plans/
2026-06-17-pulse-1-1-todd-feedback.md`, the operator's real CEO-review call
with Todd), rather than starting from scratch:

1. **Industry/variant-tuned scoring — real gap, now with a concrete
   technical path (shared with the engineering plan's F8 finding).** The
   1987 system had at least 3 genuinely distinct weight-tuned variants;
   today's Toddito applies one universal weight matrix, and its own
   ground-truth tests already document that this matrix doesn't reproduce
   two real legacy verdicts. The original system's actual differentiation
   — industry-specific diagnostic tuning — is not yet in the MVP.
2. **The Application Suite — six of seven modules exist as Todd's IP but
   are not built.** Per the June 17 call, Todd's own framework names seven
   use cases for the diagnostic engine: (1) Organization Diagnostic —
   *built, this is today's Toddito core*; (2) Executive Communicator; (3)
   **Consulting Communicator** (16-question self-diagnostic for
   consultants — Todd's own words, "I've never seen anything like that
   ever," his highest-conviction idea); (4) Merger & Acquisition Manager;
   (5) Investor Insight Application; (6) Client Service Planner; (7)
   Contingency Planner. **This is the single largest gap between the
   original system's full scope and today's MVP** — the 1987 system's own
   architecture (the separate Client Relationship Module, distinct from
   the 8 org-diagnostic variants) is structural evidence that this kind of
   multi-product-surface thinking is not new scope invented today — it's
   how the original system was already built. Worth flagging, not
   asserting as confirmed: the Client Relationship Module's trust/
   credibility framing sounds structurally adjacent to Consulting
   Communicator. **Sharper context (bshr, 2026-09-29):** trust/
   credibility is one of six diagnosed dimensions in that module
   (alongside Development Stage, Strategy, Structure, Culture, and
   Leadership Style), not the whole module — narrows, doesn't confirm,
   the adjacency. A real candidate hypothesis for Todd to confirm or rule
   out, not treated as settled here.
3. **Multi-language.** Todd's own gap analysis names French as a real,
   stated requirement — not built.
4. **Recurring cadence + API export.** Named in Todd's gap analysis as
   real asks — not built; today's Toddito is single-session, no
   programmatic export.
5. **A standalone 360 leadership assessment; a tiered drill-down
   assessment.** Named in Todd's gap analysis — not built; today's product
   is a single-depth, single-respondent-or-group diagnostic.
6. **Quantitative precision the original had and today's system is
   honest about not yet matching.** Beyond the weight-tuning gap (item 1),
   Pulse's own methodology memo (F6) still has open items — two-tier risk
   display and numeric-vs-qualitative report framing — that trace back to
   how much more numerically precise the 1987 reports were.

**What today's MVP has that the 1987 system didn't, worth naming for
balance, not just gaps in one direction:** voice-led data capture
(vs. paper forms), Claude-based qualitative synthesis and narrative report
generation (the 1987 system was templated/structured output only, per the
content-family analysis — three families' worth of near-identical fixed
report text), a live multi-tenant SaaS delivery model, group/consultant
multi-respondent aggregation, and the Focus-of-Concern evidence layer
(transcript-grounded, cite-what-was-actually-said reporting — the 1987
system had no equivalent, being pre-LLM). The gap is not "the old system
was better" — it's "the old system covered more product surface area,
today's system covers one surface more deeply and more modernly."

## 3. Who this is for

The people this is really for are independent consultants and boutique
consulting firms — people who already have the client relationships and
the trust, but no fast way to actually understand an organization from the
inside. What Toddito offers them is a full, honest read of a company, not
just the executive team's view, done by voice instead of paperwork.

There's a second, real angle on top of that: the same method can be
positioned as a way for private-equity and M&A investors to check the
health of a company before they put money into it. That's not just a
marketing idea — it points directly at two of the unbuilt modules from
Todd's own original framework, the M&A tool and the investor-facing one,
so it's a real signal about what to build next if that market turns out
to be real.

And there's something underneath both of those worth saying plainly:
thirty-eight years of real client data is an actual trust asset, not a
nice-to-have detail. Todd himself, standing up and saying "I built this
with real companies and I just run it now," is already a strong story for
exactly the boutique-consultant audience above — nothing here needs to
invent that positioning, it already exists.

## 4. What the product becomes, if this becomes a pitch

The companion engineering plan owns how this actually gets built. This
part is about what a pitch should honestly say the product is turning
into.

Right now, honestly, Toddito is one thing: an organization read, using one
scoring model. What's real and confirmed: the 1987 system genuinely was
tuned for different industries, with real separate scoring weights for
each one, and — as of a correction made after the original draft of this
document — it's now fully worked out which industry each of those old
variants actually stood for. What's still a hypothesis, not yet proven:
whether re-deriving those old per-industry weights actually fixes the two
places where today's scoring engine disagrees with the original system's
real, historical verdicts. That's a real, specific piece of engineering
work, not yet done — so "a methodology proven to adapt by industry" isn't
a claim that's earned yet. It's close, and it's worth saying so, but it
shouldn't go in front of an outside audience as settled until that piece
of work actually closes the gap.

Further out, the real expansion story is the rest of Todd's own
framework. He designed seven distinct uses for this diagnostic engine;
only one is built today. The other six aren't invented for this pitch —
they're his own documented ideas, and one of them even shows up already,
in a different form, inside the original 1987 software itself. That's a
real, IP-backed roadmap a pitch can show honestly, not a "we'll add
features eventually" slide — though the order they get built in is
Todd's call, not something this document should invent on his behalf.

And the investor/M&A angle from the last section and the unbuilt
Application Suite modules point at the same thing: if that market turns
out to be real, the investor-facing module is the obvious next build, not
a new idea dreamed up for a slide.

## 5. The idea of Toddito sponsoring the next cohort

Here's the actual idea, said plainly: Toddito started as something Silicon
Jungle produced. The proposal is that it eventually becomes something that
funds Silicon Jungle back — success proving the model, then paying for the
next round of it.

This isn't a new mechanism invented for this document. Silicon Jungle is
already having real conversations about sponsorship and funding more
broadly, off the back of eight real events and a real joint venture that
already came out of one of them. Toddito doing this would just be one
specific, concrete instance of something the studio is already pursuing in
general.

What that could actually look like, not yet confirmed by the operator:
once Toddito is making real money, from either the consultants or the
investor side, it commits some defined slice of that to sponsoring future
weekends, in cash — the same shape as any other sponsor relationship the
studio is already discussing. Separately, and not the same thing as cash,
Toddito's own diagnostic tool could be used directly at a weekend — a
quick read on a newly-formed team's dynamics right at the start, the same
instinct behind Keonda's own dinner-seating work. Both are the same
pattern: something that grew up here turning around and feeding the event
mechanics that grew it.

The real value in this isn't the specific dollar mechanism, which is
genuinely still open. It's being able to say, honestly, "we ran our own
playbook on ourselves, and it worked" — that's a stronger thing to tell a
future sponsor or investor than an untested idea, and it's the actual
reason this is worth doing at all. The specific percentage, when it
starts, and whether it's cash or the tool itself or both — those are the
operator's calls, not settled here.

## 6. What has to be said honestly if this becomes a deck

There's one risk that matters more than any other, and it has to be said
plainly, not softened: Pulse still has six open security findings, and the
big one — whether it's actually okay, legally and ethically, to be
recording and analyzing people's voices the way this product does — has
been open since a review back in June, more than three months now. Leaving
that out of a pitch would be actively misleading to anyone evaluating the
company. It doesn't mean the underlying idea is unsound. It does mean
wide distribution, or any pitch that implies broad usage today, should
wait until that's actually closed.

A few other things worth being honest about, without overstating them.
The industry-mapping question from earlier is genuinely resolved now —
that specific unknown is gone — but knowing the mapping doesn't yet prove
that using it actually fixes the scoring disagreement; that's still a
real piece of work, not done yet. The bigger product roadmap depends on
Todd actually confirming an order, which hasn't happened. And there's no
real revenue or user data behind any of this yet — any number that ends
up in an actual deck needs to come from the operator, not be filled in
with something that merely sounds plausible.

## 7. GSTACK REVIEW REPORT

**Mode: SELECTIVE EXPANSION** — self-decided by plan (non-interactive T2
seat), because this is explicitly meant to become a pitch deck (ambition
is the point), but every genuinely new claim (the sponsor mechanism's
specific shape, the Client Relationship Module ↔ Consulting Communicator
hypothesis) is marked as proposed/unconfirmed rather than asserted, since
no human is present to approve real scope expansion.

**Step 0 — Premise Challenge:** real ask, real do-nothing cost — without
this document, Toddito stays framed as "a hackathon side-project," which
under-sells both its actual maturity (per the engineering plan's own
correction) and its historical IP grounding (38 years, a real acronym and
company history now recovered from the binaries themselves, not
previously known even to this session).

**Existing leverage:** substantial and reused throughout, not
re-derived — the Silicon Jungle brief's market/GTM resolution (§0j), the
June 2026 Todd CEO review's Blue Ocean/Application Suite framework, and
the engineering plan's F8/security findings all feed this document
directly by reference.

**"Eng review," adapted for a strategy document:** the one real technical
claim in this plan that needs verification before it appears in an
external deck is §4 item 1's "industry-tuned scoring" differentiator — it
is currently a hypothesis (real weight files exist, confirmed; whether
decoding them closes F8 is not yet proven). Recommend explicitly: don't
let this promote from "hypothesis" to "differentiator" in an external
pitch until the engineering plan's §5 spike reports back.

**VERDICT: CLEARED as a strategy/pitch-prep document.** Not cleared to
represent unresolved items (the security gate, the industry mapping, the
sponsor mechanism's specific numbers) as settled facts in any resulting
external deck — those need to close first or be presented as roadmap, not
current state.

**UNRESOLVED DECISIONS:**
- ~~Does the operator want to ask Todd directly for the A–T industry
  mapping~~ — **resolved** (§1, bshr 2026-09-29); no longer blocks
  anything. What still blocks §4 item 1's "proven differentiator" claim
  is the engineering plan's F8 verification spike, unrelated to Todd or
  this mapping.
- Sponsor Flywheel mechanism (§5): cash, technology-in-kind, or both —
  and at what milestone does it start? Operator's call, not decided here.
- Should this document wait on OD6's resolution (§6) before becoming an
  external-facing deck, or is it meant for internal/Silicon-Jungle-network
  use only in the meantime? Not specified by the operator's original ask.
- Is the Client Relationship Module ↔ Consulting Communicator connection
  (§2 item 2, §4) worth raising with Todd directly as a real hypothesis,
  or is it too speculative to bring to him yet?
