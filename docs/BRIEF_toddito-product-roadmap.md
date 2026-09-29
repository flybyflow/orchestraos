# Toddito Product Roadmap: The Seven Modules — What's Built, What's Next

*A product brief — what we'd actually build, for whom, and in what order.
Companion to the venture-thesis PDF already shared; this document answers
"OK, concretely, what are we building" instead of "why does this matter."*

## The Core Idea: One Proven Engine, Seven Possible Products

Toddito already has one thing fully proven, live, and working today: a
person has a guided voice conversation, and the product turns that
conversation into a genuinely good, human-quality diagnostic report. That
combination — real conversation in, trustworthy report out — is the
engine. Everything below is the question of **where else that same engine
should point**, not a plan to build seven separate products from scratch.

Todd's own framework, developed over decades of consulting practice,
already names seven distinct products this engine could support. **One is
built. Six are real, well-defined ideas — not vague future possibilities,
but specific, describable products Todd has already thought through** —
waiting to be pointed at the same engine.

## Where the Engine Should Go Next: What the Research Found

Before the module-by-module breakdown, one finding from this week's
research is worth stating plainly, because it changes how you should read
"not started" below: **not started does not mean "no work has been done."**

Looking back across every earlier attempt at this kind of product —
three prior prototypes the operator built before Toddito, plus the 1987
predecessor — a clear pattern emerged. Every attempt is really trying to
understand people at one of four levels: **a single person, the
relationship between two specific people, a team or group, or a whole
organization.** Toddito, today, is excellent at the last one — whole
organizations. But here's the finding: **the other three levels have
already been thought through and partly built, more than once, by earlier
attempts — they just never got wired into an engine that actually works.**
The earlier prototypes solved the hard-sounding parts (capturing a real
conversation, writing genuinely good instructions for how to interpret
it) and then stalled at the very last step — turning it into a real
finished output. Toddito is the first version that solved that last step.

The single most striking piece of evidence for this: one of the earlier
prototypes had already built — and later deleted — a feature description
for understanding a **team or community's shared culture**, and the
internal description of that (now-deleted) feature reads almost exactly
like the guiding question behind all of this work. It was written before
this week's research began, by an earlier version of the same effort, and
then removed. That's not a coincidence to gloss over — it's a sign the
team-level product below is closer to already-defined than "not started"
usually implies.

## The Seven Modules

### 1. Organization Diagnostic — **BUILT, LIVE TODAY**

**What it is:** A consultant or leader has a ~40-minute guided voice
conversation about how their organization actually works. Toddito turns
that into a report: where the organization stands, what's working, where
the real friction is, and what that friction typically costs.

**Who it's for:** Independent consultants and boutique consulting firms,
today; a PE/M&A due-diligence audience is a validated second market (see
module 5).

**Current experience:** Live at getyourpulse.io. A respondent has the
voice conversation; the consultant gets a shareable report designed to
read like something a skilled human consultant wrote, not a generic AI
summary. Group/multi-respondent versions exist too — several people from
the same organization each do the conversation, and the reports combine
into one organizational read.

**Status:** Real, shipped, in active alpha use. This is the one module
where "what would the experience be" isn't a question — it already exists.

---

### 2. Executive Communicator — **NOT BUILT — narrow 1987 precedent exists, not a built equivalent**

**What it is:** Aligns an executive team by surfacing where each
executive's read of the company's strategy and operations actually
diverges from the others' — not just "is everyone happy," but "does the
CFO and the Head of Product actually agree on what the company's growth
engine even is right now."

**Who it's for:** Leadership teams who think they're aligned and haven't
tested it.

**What the experience would look like:** Each executive does their own
version of the core diagnostic conversation. Instead of reporting on each
person separately, the product would synthesize *across* their answers —
naming the specific gaps between what different leaders believe, in the
same clear, human-readable style Toddito's reports already have.

**Why this is the most build-ready of the six unbuilt modules:** Toddito
already has the multi-person aggregation mechanism this needs (it's how
the current group/organization reports work). What's genuinely missing is
a synthesis step that speaks in terms of *team alignment* rather than
*organizational health* — and this week's research found that an earlier
prototype already wrote a real, detailed description of exactly this kind
of team-level synthesis (the "team culture" feature mentioned above,
before it was removed). That existing language is a real head start, not
a from-scratch design problem.

**Correction (bshr, verified against the full 73-file 1987 binary
inventory, 2026-09-29):** there's also a genuine 1987-system precedent,
narrower than it sounds — a real 1992 multi-rater divergence report
(`MV6COMBO.ASC` + `SACALC`/`SDCALC`) that compares scores across multiple
raters. It's a numeric divergence range, not narrative synthesis, and the
raters aren't confirmed to be specifically executives. Real head-start
material, not a shortcut past the actual build.

---

### 3. Consulting Communicator — **NOT STARTED — blocked on Todd**

**What it is:** A 16-question self-assessment for consultants themselves
— not about their client's organization, but about how well *they*, the
consultant, are running the engagement. Todd's own description of this
idea: "I've never seen anything like that ever" — it's the module he's
personally most excited about.

**Who it's for:** The consultants who use module 1, turned inward on
their own practice.

**What the experience would look like:** Not yet specified in enough
detail to describe — Todd has the full design in his head but hasn't yet
handed over the complete specification.

**Status:** Blocked, not just unbuilt. This needs Todd's actual 16
questions and his framework before any real design work can start —
building ahead of that would mean guessing at his own idea.

**One real, unconfirmed lead worth following up:** the 1987 predecessor
system had a separate feature specifically for assessing trust and
credibility between a consultant and their client — a different, older
version of a very similar idea. **Sharper context (bshr, 2026-09-29):**
trust/credibility is one of six diagnosed dimensions in that 1987 module
(alongside Development Stage, Strategy, Structure, Culture, and Leadership
Style), not the whole feature — narrows, doesn't confirm, the lead. Worth
asking Todd directly whether this is the same concept he has in mind, or
something distinct — it could mean this module has more of a running
start than "blocked" suggests, just not as much as the trust angle alone
implied.

---

### 4. Merger & Acquisition Manager — **NOT STARTED**

**What it is:** Surfaces cultural and structural fit between two
organizations *before* a merger or acquisition goes further — using the
same diagnostic lens as module 1, but pointed at two organizations being
compared to each other instead of one organization being understood on
its own.

**Who it's for:** Companies or advisors evaluating a potential merger or
acquisition.

**What the experience would look like:** Run the core diagnostic
conversation on both organizations (largely module 1's existing
mechanism), then add a comparison layer — where do these two
organizations' cultures and structures actually clash, and where do they
fit.

**Why this is closer to buildable than it might sound:** it mostly reuses
module 1's existing engine twice, plus a new comparison step — not a
separate product built from nothing.

---

### 5. Investor Insight Application — **NOT BUILT — has a validated demand signal, plus a narrow 1987 precedent**

**What it is:** The same organizational-health lens as module 1, framed
as a due-diligence tool: before an investor commits capital to a company,
get an honest read on the health of the organization they're investing
in, not just its financials.

**Who it's for:** PE and M&A investors evaluating a company pre-
investment.

**What the experience would look like:** Very close to module 1's
existing flow, reframed for a different audience and report format
(investor-facing rather than consultant-facing).

**Why this one is worth prioritizing among the unbuilt six:** this isn't
a hypothetical market — it's already been identified, independently, as
a real go-to-market angle for Toddito ("if you're going to put money into
a company, you wouldn't want to put everything in without ensuring its
success"). The module and the market thesis point at each other.

**Correction (bshr, verified against the full 73-file 1987 binary
inventory, 2026-09-29):** a real "Saleability Index" section exists across
all 8 of the 1987 system's industry variants — genuine precedent, not just
thematic. But it's framed as an internal scoring dimension inside the org
report, not a standalone due-diligence product — so "not started" still
holds for the product itself, though the underlying scoring signal has a
real legacy precedent to build from.

---

### 6. Client Service Planner — **NOT STARTED**

**What it is:** Helps an organization become more market-driven and
customer-focused in how it actually operates, based on Todd's framework.

**Checked and ruled out (bshr, 2026-09-29):** `CPCSP.EXE` — "Touche Ross
Client Service Planning System" — is a near-exact name match, but it's
actually a consultant's account-planning/upsell tool, not this module.
Flagging so it isn't mistaken for a head start later.

**Status:** Real, but the least fleshed-out of the seven in the material
gathered so far — this document doesn't have enough detail yet to
describe what the actual user experience would look like. Flagged
honestly rather than guessed at: this one needs more direct input from
Todd before it can be scoped the way modules 2, 4, and 5 have been above.

---

### 7. Contingency Planner — **NOT STARTED**

**What it is:** Shifts the question from "tell me what's happening" to
"tell me what you think *should* be happening" — a forward-looking,
scenario-planning companion to the diagnostic modules, which are
backward- and present-looking by design.

**Status:** Same honest flag as module 6 — real idea, least detail
available right now, needs more direct input from Todd to scope
concretely.

---

## Two More Product Gaps the Research Found — Not in Todd's Original Seven

Beyond Todd's seven modules, this week's research across every earlier
prototype surfaced two more real, specific product opportunities that
aren't part of his original framework, but came up independently, more
than once, across different attempts:

**A personal takeaway layer.** After someone does the core diagnostic
conversation, today they get an organizational report. What's never been
built: a short, personal reflection for *that individual* — what does
this mean for them specifically, not just for the organization as a
whole. An earlier prototype had already written real, detailed
instructions for exactly this kind of personal reflection step — that
writing still exists and could be reused rather than redesigned from
scratch.

**A "relationship between two specific people" layer.** Every module
above looks at one organization, or one person, or two organizations
being compared. None of them ask: what's actually true about the working
relationship between *this specific person and that specific person* —
where do they complement each other, where's the friction. This exact
idea shows up, independently, in three separate places across the
research: an early working mechanism in one prototype, detailed
instructional writing in another, and the 1987 predecessor's own separate
consultant-trust module. Three independent attempts at the same idea,
never shipped as a real feature — worth naming clearly as its own gap,
not folded into module 3 above without Todd's confirmation that they're
the same thing.

## What This Roadmap Doesn't Decide

This is a map of what's built and what's real and buildable — not a
committed sequence or timeline. A few things still need direct input
before any of the unbuilt modules move forward: Todd's full specification
for modules 3, 6, and 7 specifically; a decision from the operator on
which of the six unbuilt modules to prioritize; and — this applies to
every module on this page that isn't already live — Toddito's own team
has an open item from a prior review, still unresolved, about the privacy
and terms-of-service coverage for the voice data at the center of all of
this. That item should close, or be squarely understood, before any of
these new modules significantly expand how much personal data the
product collects.

---

*This document is the product-focused counterpart to the venture-thesis
PDF already shared, and draws on the full Koherent V1/V2/V3 lineage
research (`docs/BSHR_koherent-lineage-synthesis.md`), the engineering
plan's honest built/not-built accounting
(`docs/PLAN_toddito-engineering.md`), and the 1987 system's module
breakdown (`docs/PLAN_toddito-1987-venture.md`). Read those directly for
full technical and historical detail.*
