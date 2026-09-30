# Engineering Plan: Improving Toddito/Pulse Using Koherent's Patterns

- **Requested by:** operator, via gm (msg_67391fac_865948 + addendum
  msg_37d40a10_3330180, 2026-09-29)
- **Authored by:** plan (non-interactive), research dispatched to two
  forked subagents (Pulse/Koherent code-mining; 1987 DOS-binary variant
  analysis — the latter shared with the separate standalone business plan,
  `docs/PLAN_toddito-1987-venture.md`, per gm's explicit instruction to
  keep the two documents independent)
- **Scope:** a real, scoped engineering plan for what to build first in
  Pulse (repo: `/Users/flybyflow/conductor/repos/pulse`, live at
  `getyourpulse.io`), grounded in Koherent's patterns, Todd's actual asks,
  and Pulse's own current state — verified directly against the repo, not
  assumed from the relay.

## 0. Correction to the premise, checked before scoping anything

**Pulse is not a lightly-touched hackathon MVP.** `docs/STATUS.md`
(snapshot 2026-07-22, confirmed current via `git log` — ~135 merged PRs)
shows a mature, actively-developed product: a full voice-led diagnostic
pipeline (ElevenLabs → Claude scoring → Supabase → report), an invite-only
alpha with real accounts/auth/referrals (Track B, shipped), a full ops
console (ADR 003, shipped), voice-infra extraction already shipped, and —
most relevant to this plan — **a 1987-methodology fidelity pass already
done**: `docs/methodology/mis-glossary-distilled.md` and
`docs/methodology/pulse-vs-1987-fidelity-memo.md` (8 named findings,
F1–F8, most already shipped). Any plan that treats this as green-field
"mining Koherent to build the diagnostic engine" would be redundant with
real, already-shipped work. This plan is scoped against what's actually
still open, not what's already done.

## 1. Koherent V1 (`koherentai-main`) — what's real, corrected from the
operator's framing

The operator said "there's a lot of things there that are usable" — checked
directly, this is **overstated for the bulk of the repo, accurate for a
few specific functions.** The app shell is the **unmodified Vercel
"Next.js AI Chatbot" template** (its own README still reads "Next.js AI
Chatbot"; OpenAI + Vercel KV; "We Love Koherent ❤️" is the only edit to the
README itself). `instructions.json` (32KB, the file most worth reading per
the operator) is a single OpenAI Assistants-API config — `name: "Math
Tutor - gpt3"` (never renamed from a template default) — whose 32KB
`instructions` string is **pure vision/prompt text**: Koherent's pitch plus
a catalog of ~50 named psychology/facilitation frameworks (Big Five, MBTI,
DISC, Belbin, Hogan, FIRO-B, Johari Window, World Café, Open Space, Theory
U, NVC, Sociocracy, Collective Presencing). No schema, no scoring logic —
reference material, not code.

**Real, reusable, working code does exist, in `lib/chat/actions.tsx`
(777 lines):**
- `calculateBigFiveScores` / `calculateTraitScore` (`:740, :756`) — averages
  1–20 sub-trait answers into a 0–100 standardized score. Small, portable,
  generic scoring pattern.
- `formatProfileForPrompt` (`:702`) — builds a profile string (DISC/MBTI/
  Big Five type) injected into a system prompt.
- `getMentionedUsersData` / `formatAllUserData` (`:291, :306`) +
  `extractEmails` (`:269`) — **the actual "profile people, tag them,
  converse about the space between them" mechanism**: detects @-mentioned
  emails in a message, pulls each person's stored profile, and formats
  multi-person context into the prompt. This is the one piece with a
  concrete, scoped reuse case for Pulse (§5c below).
- `lib/chat/ai-instructions.ts` — a slightly newer copy of the same prompt,
  keyed `en:` — implies a localization pattern already existed in Koherent,
  relevant context for Todd's multi-language (French) ask, though not
  itself reusable code.

## 2. "What / So What / Now What" — not found in V1; a genuine, separate
design opportunity, not core scope here

Full-repo grep of `koherentai-main` (app/, components/, lib/,
`instructions.json`) for "so what" / "now what" / "nugget": **zero hits.**
Neither the prompt text nor any schema/field/component name preserves the
6-field structure (What / So What / Now What-Self / Now What-Other / Now
What-Whole / Nugget). Per the operator's own later addendum
(msg_37d40a10_3330180), this pattern belongs to **Koherent V2** (a
separate repo, not checked in this pass) — the daily "roast me / serenade
me" flashcard exercises, not V1's chat tool.

**Checked against Pulse's existing report structure for overlap — genuine
gap, not redundant.** Pulse already has `src/components/report/
focus-of-concern.ts` (838 lines): each row is `{key, priority, why,
practice}` — org-level diagnostic priority, rationale, and a concrete
example, transcribed from the actual 1987 MIS tables. This answers "what
needs attention in the organization and why," at the **organization**
level. What/So-What/Now-What (Self/Other/Whole/Nugget) is an **individual
reflective-coaching** structure — different altitude entirely. Adopting it
would be additive, not a rebuild of something that already exists under a
different name — but it is real new product scope (a personal-takeaway
layer on top of an org-diagnostic report), not a small addition, and
deserves its own design pass before being built. **Recommended: flag as a
real future feature, don't fold into this plan's "build first" scope.**

## 2a. Follow-up (gm, `msg_afa7f90e_69752912`, 2026-09-30 12:02 UTC): the
real What/So-What/Now-What content, and a correction to the rumored
6-field structure

Operator's June-era addendum said this pattern was "6-field: What / So
What / Now What-Self / Now What-Other / Now What-Whole / Nugget" and
lives in Koherent V2. §2 above correctly found zero trace in V1 and
correctly deferred a design pass rather than guess. That design pass is
now this task — read the ACTUAL V2 prompt files directly
(`flybyflow/koherent-organizations`, `src/prompts/base/
insight_system_prompt.md` and `unified_system_meta_prompt.md`, via `gh
api`, not inferred from the field-name rumor), cross-checked against
`docs/BSHR_koherent-lineage-synthesis.md`'s own independent research.

**Correction: the 6-field Self/Other/Whole/Nugget structure does not
exist as implemented code anywhere — not in V1, V2, or V3.** "Nugget"
specifically: zero hits, confirmed by BSHR's own repo-wide grep across
every Koherent version, and re-confirmed by this pass. What's REAL in
V2's actual prompt output schema is simpler: a 4-field JSON —
`{what, whatReadMore, soWhat, soWhatReadMore}` — a genuine two-stage
narrative (What → So What), not six fields. "Now What" exists only as an
internal ReAct reasoning step label (`<7_now_what>`) whose output feeds a
`practices` block referenced via `{{practice_output_experiment}}`/
`{{practice_output_control}}` template variables — no static file with
that name exists anywhere in the repo, and the backend that would
generate it (`koherentACE.ts`) is an explicit stub per BSHR's research.
**So "Now What" was designed for, but never actually built out with real
content, in the one place this pattern is real code.**

**What IS real and genuinely reusable — the prose-generation craft, not a
field structure:**
- Explicit output rules, verbatim from the real prompt: *"Use very plain,
  simplistic yet detailed language. Avoid complicated words, terms or
  grammar."* / *"Do not reference specific personality types... or trait
  names... Use plain, behavioral language to describe patterns and
  actions instead."* / *"Avoid deterministic personality statements."* /
  *"Present traits as neutral with contextual advantages."* / *"Maintain
  curious, non-judgmental perspective."* / *"Offer observations not
  evaluations."* / *"Present possibilities not singular truths."* /
  *"Empower through questions not directives."* / *"Balance validation
  with gentle challenge."*
- Fixed narrative sentence-openers that give warmth and consistency
  without becoming freeform: *"It seems you..."* / *"A specific challenge
  to be aware of is..."* / *"It could lead to..."* / *"A specific risk to
  be aware of is..."* — a real, working technique for staying human
  without losing structure.

§2's original conclusion stands unchanged: this is a different altitude
(individual reflective-coaching) from Pulse's org-level diagnostic, real
new scope deserving its own design pass, not a small fold-in. What
changes is the operator has now explicitly lifted that hold (§9 below) —
the corrected content above is what should ground that design pass, not
the never-built 6-field rumor.

## 3. "Collective intelligence" — out of scope for this plan

Zero trace in Pulse (`src/`, `docs/` grepped) or in `koherentai-main`.
Confirmed V3-only, per the operator's addendum — the pattern lives in
`relationalOS` (not researched in this pass; that repo is explicitly
task 5's territory, the BSHR synthesis across all three Koherent versions
+ Toddito + the 1987 system, sequenced after this plan per gm's own
instruction).

## 4. Pulse's own 1987-fidelity work, already done — don't duplicate

`docs/methodology/pulse-vs-1987-fidelity-memo.md`'s 8 findings, checked
directly:

| # | Finding | Status |
|---|---------|--------|
| F1 | Nurture bar pole order inverted | 🔴 fixed, shipped |
| F2 | Culture count (11 Full vs 14 Lite) | ✅ shipped (14 everywhere) |
| F3 | SCORING.md doc drift | ✅ fixed (docs-only) |
| F4 | Strategy dims (4 linguistic vs 5 bipolar) | ✅ shipped |
| F5 | Traditional culture excluded | 🟢 by design, matches legacy |
| F6 | Report-substance gaps (Growth Engine/Crisis copy, discouraged cultures, Focus of Concern) | mostly shipped; two-tier risk + numeric-vs-qualitative display still open, untracked as a numbered decision |
| F7 | Probe audit (Lite has 0 leadership probes vs 5 scored dims) | Lite v2 (P03→P22) shipped; her manual ElevenLabs prompt update still pending |
| F8 | **THOR weight divergence** | **🔴 OPEN — see §5** |

## 5. The highest-value concrete item: F8, and its real connection to
today's 1987-binary research

**F8, stated precisely:** the ported THOR weights (originally pulled from
a third-party `Mana-matrix/THOR` GitHub repo) do **not** reproduce two real
legacy verdicts — case A: legacy scored MODULATION, the current engine
ranks STALL first; case B: legacy scored ACCELERATION→PROJECTILE, the
current engine ranks AUTO_PILOT first. Encoded as `it.fails` documented-
divergence tests in `src/lib/scoring/__fixtures__/thor-score.test.ts`.
`docs/STATUS.md`'s own words: **"THOR panel = directional until weights
re-derived."** This is a real correctness gap in a shipping product —
every report's THOR panel is currently honest about being directional
(per F8's own mitigation), but it is not yet accurate.

**The memo's own lead #2** (checked directly): the legacy program ships
**per-industry weight files** named `GP{letter}SCORE.ASF`, and the two
ground-truth test cases came from *different* industry variants — meaning
the current matrix is very likely one industry's weights applied
universally, not the legacy system's actual per-variant behavior.

**This is where the two forked research passes connect, not
coincidentally:** the dedicated 1987-binary analysis (run in parallel for
the standalone business plan, `docs/PLAN_toddito-1987-venture.md`) found
these exact files, confirmed present, in `/Users/flybyflow/conductor/repos/
mic-program-toddito`:
- 8 real lettered variants (A, B, C, D, M, R, S, T), each a `GP{letter}
  QUEST/RISK/SCORE/LIB.ASF` set — `GPxSCORE.ASF` is real, not
  hypothesized.
- Confirmed, evidence-based structural finding: the 8 variants group into
  **3 underlying content-families** by shared questionnaire/report text —
  {A, M}, {B, S}, {C, D, R, T} — meaning the RISK/SCORE weight matrices
  likely differ *within* a family too, or the families themselves may be
  the real "industry" boundary. Not yet determined which; see the venture
  plan for the full evidentiary trail.
- **RESOLVED (bshr, 2026-09-29):** the letter↔industry mapping is in the
  binaries themselves, not a Todd-dependent unknown. `GPDDMS.ASF` maps
  Manufacturing/Service/Retail/Large Manufacturing/Large Service/Large
  Retail/Restaurant/Large Restaurant directly to GPM/GPS/GPR/GPA/GPB/GPC/
  GPT/GPD — i.e. **A = Large Manufacturing, B = Large Service, C = Large
  Retail, D = Large Restaurant, M = Manufacturing, R = Retail, S = Service,
  T = Restaurant.** The earlier "Todd is the real source" framing (below,
  pre-correction) was wrong; the CPCSP.EXE industry-selection menu it cited
  is a red herring from an unrelated module, superseded by this direct
  hit. Residual open item (not a Todd question): confirm Pulse's own org
  intake captures an industry field that maps onto these 8 categories —
  a data check, not a design blocker.

**Real, scoped engineering task (recommended #1 priority, contingent on
schedule — see §7 ranking):**
1. Reverse-engineer the `.ASF` binary format on the smallest file first
   (likely `GPxLIB.ASF` or `GPxRISK.ASF` — not yet inspected at the byte-
   layout level in either research pass; this is genuinely new work, not
   yet scoped to file-format spec depth).
2. Extract the weight matrix per lettered variant / content-family.
3. Re-run `thor-score.test.ts`'s two ground-truth cases against the
   variant-specific weights (not the universal matrix) and check whether
   divergence closes.
4. If it does: this becomes a real per-industry (or per-family) weight
   selection in the scoring pipeline, not a single hardcoded matrix — a
   genuinely new capability, not just a bugfix.
5. **No longer Todd-gated:** the letter↔industry mapping is resolved
   (above). What's left to confirm before this fully closes: whether
   Pulse's respondent/org intake records an industry classification that
   maps onto the 8 categories above — a Pulse-data check, not a
   Todd-sourced unknown.

## 6. Security backlog — flagged prominently, not buried, because this is
where real risk lives

`docs/SECURITY.md` (snapshot 2026-07-15) lists **6 S1 findings, verified
still ALL open** (checked `git log` since 2026-07-15 for any SEC-0x /
prompt-injection / rate-limit / webhook-replay / fail-closed commit —
zero matches): transcript prompt-injection into the scoring model
(highest priority — `src/lib/scoring/prompt.ts` is on the repo's own STOP
list), an unauthenticated score endpoint (cost/DoS exposure), a public
config route leaking client/org PII and minting billable ElevenLabs signed
URLs, webhook replay (no timestamp-freshness check), silent unsigned-
webhook fallback, and no rate limiting anywhere in `src/`.

**Directly relevant to this plan's priority call:** the security doc's own
"Full-pass checklist" explicitly still lists **"Privacy/terms (Instinct AI
LLC)"** as owed before public launch. This confirms, independently, that
**OD6 from the 2026-06-17 CEO review — the hard gate, one-way-door
decision on biometric voice-data ToS/privacy — is still unresolved more
than three months later.** Pulse captures and behaviorally analyzes voice
(biometric data); Todd is in the data chain; the June review was explicit
that this must not be bypassed by momentum. This plan does not recommend
any feature work that assumes or moves toward wider distribution until
this is resolved — consistent with, not a new restriction beyond, what was
already decided in June.

## 7. Application Suite — Consulting Communicator, blocked not scoped

Todd's own most-differentiated idea ("I've never seen anything like that
ever" — the 16-question consultant self-diagnostic) remains blocked on
OD4: Mo needs the full application doc from Todd, not yet received per any
evidence checked in this pass. **One new, unconfirmed candidate
connection, worth flagging not asserting:** the 1987 binaries' separate
"Client Relationship Module" (`CPCSP.EXE` / `GPDDMS.AWS`, confirmed by its
own marketing text — "a diagnosis of the extent to which you have managed
to build trust and credibility with key decision makers in the client
organization") sounds structurally adjacent to the Consulting Communicator
concept. **Sharper context (bshr, 2026-09-29):** trust/credibility is one
of six diagnosed dimensions in `CPCSP.EXE` (Development Stage, Strategy,
Structure, Culture, Leadership Style, Consultant-Client Relationship), not
the whole module — narrows, doesn't confirm, the adjacency. Not verified as
the same thing — surfaced for Todd to confirm or rule out when the OD4
conversation happens, not treated as settled.

## 7a. Operator priority (2026-09-30 13:33 UTC, `msg_2daab315_75183586`):
the boutique-consultant self-feedback facet — draft plan, grounded in
real decoded 1987 content

### 7a.1 The other five unbuilt Application Suite modules, one line each

Per gm's explicit instruction to look over the other tracks before
confirming the priority:

- **Executive Communicator** — aligns exec teams on strategy by surfacing
  intellectual capital/operating gaps. No decoded 1987 source material
  found for it specifically; verbal description only.
- **Merger & Acquisition Manager** — surfaces cultural/structural fit
  pre-deal. Real, named market angle already noted (§3 of
  `docs/PLAN_toddito-1987-venture.md`) but zero build work, zero decoded
  source found.
- **Investor Insight Application** — org-health lens for diligence. Same
  status as M&A: real named angle, nothing built or decoded.
- **Client Service Planner** — makes orgs market/customer-driven. No
  decoded source found; name alone.
- **Contingency Planner** — "tell me what you think should be happening"
  vs. reactive reporting. No decoded source found; name alone.

**None of the other five have any matching decoded 1987 content found in
this repo's research so far — Consulting Communicator is the only one
with a real, concrete candidate source (CPCSP.EXE), which is exactly why
it matches the ICP (boutique consultants, §3 of the venture plan) AND is
the only one actually buildable from real material right now, not just
by name-recognition.** Confirms the priority read — not assumed, checked
against what's actually decoded.

### 7a.2 CPCSP.EXE's real content, read directly — refines the hypothesis, doesn't just confirm it

Read the actual files (`/Users/flybyflow/conductor/repos/
mic-program-toddito`), not just the marketing blurb already cited in §7.
Real, load-bearing correction: **"Client Relationship" is not unique to
CPCSP.EXE — it's a standard 6th section of the MAIN org-diagnostic
questionnaire itself, present in every lettered variant's shared library
file** (`GPALIB.ASF`, `GPMLIB.ASF`, `GPSLIB.ASF` all carry identical text:
*". CLIENT RELATIONSHIP / Trust / Credibility/Respect"*). CPCSP.EXE is a
standalone program that runs the same ~100-item, 6-dimension
questionnaire (Development Stage, Strategy, Structure, Culture,
Leadership Style, Client Relationship) but **framed for a consultant to
fill out about a client** (`CSPHELP.ASF`, verbatim: *"DIAGNOSING YOUR
CLIENT ORGANIZATION... approximately one hundred items which describe an
organization from the point of view of DEVELOPMENT STAGE, STRATEGY,
STRUCTURE or DESIGN, CULTURE, LEADERSHIP STYLE, and the
CONSULTANT-CLIENT RELATIONSHIP"*) — branded "Touche Ross Client Service
Planning System" in its own splash screen, a real historical co-branding
with a named Big Eight consulting firm.

**So five of CPCSP's six dimensions are "consultant diagnoses the CLIENT
organization," not "consultant reflects on their own style"** — that part
does NOT match the operator's literal ask ("consultant themselves gets
feedback on their own coaching/consulting style"). **The sixth dimension,
Client Relationship, is the real match** — found its actual scored item
text (`GPASCORE.ASF` and siblings): *"The %1 is more comfortable
influencing others on the basis of trust and expertise than on the basis
of the formal clout inherent in his position."* The same underlying
trust/expertise-vs.-formal-authority influence scale is reused for the
Leadership Style section (rating the CEO, `%1` = the leader) — real
evidence Client Relationship applies the identical, already-validated
influence-style framework to a different subject: **the consultant's own
way of building trust and credibility with the client**, not the client's
internal dynamics.

**Net read, confirming and sharpening gm's hypothesis rather than
overturning it:** CPCSP.EXE as a whole is NOT the same thing as Todd's
"Consulting Communicator" (16-question pure self-diagnostic) — it's
mostly a consultant-administered client-diagnostic tool. But its Client
Relationship dimension specifically — a real, scored, six-item-family
influence-style assessment, already proven at the CEO level and reused
for the consultant — is genuine, decoded, reusable 1987 business logic
for exactly the facet the operator wants. **Consulting Communicator is
likely this dimension, expanded and renamed as its own standalone
16-question module** (6 real scored items known → 16 questions is a real,
plausible expansion, not a wild leap), rather than an unrelated,
never-decoded concept. Still worth Todd confirming directly (OD4,
unchanged) — this is the strongest evidence found so far, not a closed
question.

### 7a.3 Facet plan — how this sits next to what exists today

**Today:** the admin panel lets a consultant send diagnostic engagements
OUT to their clients (confirmed exists, `src/app/admin/*`). **What
doesn't exist:** anything where the consultant is the RESPONDENT, being
scored on their own relationship-building style.

**Proposed shape**, reusing Pulse's existing session/scoring architecture
rather than inventing a parallel system:
1. A new session `tier` or `account_type` value (the schema already has
   both, per `src/app/api/sessions/route.ts`, read earlier tonight) for a
   consultant self-assessment session — same voice-session mechanism,
   different question set and different `respondent_role`.
2. Question set: derived from CPCSP's Client Relationship dimension real
   item family (trust/expertise vs. formal-authority influence style,
   confirmed above) — NOT the other five client-diagnostic dimensions,
   which don't fit a self-assessment frame. Expand toward Todd's stated
   "16 questions" by generating parallel items across the same
   influence-style construct, the way the main product already varies
   item phrasing per industry letter — a real, precedented technique in
   this same codebase, not a new one.
3. Scoring/report: reuses the existing Claude-scoring pipeline and report
   component architecture (`src/components/report/*`), with a new
   dimension set instead of Leadership/Strategy — same rendering system,
   different content, consistent with how Pulse already varies report
   content by tier.
4. Directly benefits from the report-tone work already in flight (§9) —
   a consultant reading feedback about their OWN style needs the warm,
   non-clinical framing even more than an org-level report does; sequence
   this facet's copy AFTER §9's tone fix lands, not before, so it doesn't
   inherit the "TONE: Clinical" problem on day one.

### 7a.4 What this section does not resolve

**OD4 RESOLVED (gm, `msg_e7ef7d06_77168841`, 2026-09-30 14:06 UTC) — Todd
confirmed directly, by phone, and requested this facet himself.** The
Consulting Communicator ↔ CPCSP Client Relationship connection (§7a.2) is
no longer a guessed/unconfirmed hypothesis — using Todd's IP for this
facet is authorized. This clears §7a.5's specific caution against
shipping content attributed to his IP without his confirmation — that
caution was about authorization, not about having the real 16-item text
in hand, which still doesn't exist here. **Separately, real new lead on
the actual mockup/application-doc content:** the operator says the
What/So-What/Now-What mockup was on a Koherent repo's homepage at some
point, later wiped and redirected — consistent with this document's own
zero-hits grep against current HEAD — but likely recoverable from **git
history**. gm has dispatched that git-archaeology to bshr specifically;
once found, it governs over any reconstruction in this document, per the
same "operator's real answer beats a reconstruction" principle already
applied here. **Do not expand from 6 known items toward 16 by invention
before that search completes** — wait for it, same discipline as before,
just with the authorization question now separately resolved.

**Still open, unchanged by OD4 clearing (gm's own explicit words):**
OD6-the-gate still applies to this facet if built as a voice session (see
[[od6-voice-agent-status]] for the two-different-things distinction), and
the greenfield UI design pass (§7a.6) is still needed. Not build-ready
yet. **Per the operator's explicit process instruction, this plan ran
through `/plan-ceo-review` and `/plan-design-review` and folded real
findings back in — done below, §7a.5/7a.6.**

### 7a.5 `/plan-ceo-review` pass — real findings, folded in

**Process note, stated plainly:** run as a direct, rigorous self-review
against the skill's own Prime Directives and HOLD SCOPE checks (premise
challenge, failure/edge/error-path tracing, test requirements), not the
skill's full interactive AskUserQuestion ceremony — this is unattended
overnight execution with no one watching to answer prompts, and stalling
indefinitely on a mode-selection question would block the operator's
actual ask. Flagging this deviation explicitly rather than silently
presenting it as the full interactive process. Mode, if it had run
interactively, would likely have been SELECTIVE EXPANSION (per the
skill's own rule: "added capability"); applied HOLD SCOPE's stricter bar
instead (preserve scope, trace failures, require tests) since the goal
here is real scrutiny of a plan, not scope negotiation.

**PREMISE CHALLENGE — mostly holds, one real risk named.** §7a.3 already
correctly scopes to only the Client Relationship dimension, not all of
CPCSP — avoiding the premise mismatch §7a.2 found. Real risk not yet
named: going from 6 known real items to Todd's stated "16 questions"
needs new item content in the same construct family. **Update — OD4
resolved (§7a.4): authorization to use Todd's IP is no longer the
blocker.** The remaining risk narrows to a sourcing question, not a
permission one: bshr is git-archaeology-searching for the real mockup
content (§7a.4); if found, use it. If it isn't found before this needs to
ship, extending the 6 real known items into new ones in the same
construct family is now authorized (Todd requested this facet directly)
but should still be flagged in-product as an extension, not presented as
verbatim recovered 1987 content — that distinction is about honesty with
the end user, not about whether it's allowed.

**FAILURE MODES / EDGE CASES, not yet addressed in §7a.3 — three real
gaps:**
1. **Prompt-tone inheritance risk.** If this facet's scoring prompt gets
   built by cloning the existing FULL/LITE scoring prompt as a starting
   template, it inherits the literal `TONE: Clinical` line §9 is fixing —
   a real, concrete copy-paste risk, not hypothetical. The build spec
   must say explicitly: write this facet's prompt from the CORRECTED
   tone rules (§9.4), never from a copy of the pre-fix prompt.
2. **OD6 applies here too, not addressed at all in §7a.3.** This facet is
   another voice-capture surface if built as a voice session (matching
   the existing mechanism) — biometric data about the CONSULTANT this
   time, not a third-party organization. OD6's hard gate (no wide
   distribution until biometric ToS/privacy is resolved) should cover
   this facet by the same logic, not be treated as exempt because the
   subject is the consultant rather than a client. Needs an explicit
   line in the build spec, not a silent assumption either way.
3. **Access control, unaddressed.** A consultant's self-assessment result
   is more personally sensitive than an org diagnostic about someone
   else's company — who else can see it (a firm admin? nobody?) isn't
   answered by reusing the existing report architecture as-is. Needs at
   least one explicit sentence before build, not deferred silently.

**TESTS — one concrete gap.** §7a.3 says this reuses the existing scoring
pipeline "with a new dimension set" but names no verification. This
codebase already has a real pattern for exactly this (`thor-score.test.ts`'s
ground-truth cases) — the build spec should require the same: a few
synthetic transcripts with known-good expected scores for the new
dimension, not just "it reuses the pipeline so it's covered."

### 7a.6 `/plan-design-review` pass — real findings, folded in

Same process note as §7a.5 — direct rigorous self-review, not the full
interactive ceremony, for the same unattended-execution reason.

**UI surfaces this facet touches, not yet named:** (a) how a consultant
*starts* their own self-assessment session — is this a new nav item in
the admin panel, a personal-settings-area link, or something else? Not
specified in §7a.3. (b) The report display reuses `src/components/
report/*` per §7a.3 point 3, but those components render org-level
section labels ("Leadership pattern," "Strategic posture" per §9.2) —
they need new section copy for a self-assessment context, or a consultant
will see labels written for describing a company applied to describing
themselves, which reads wrong regardless of tone. Not a large change, but
a real one, not implied by "reuses the architecture" alone.

**Consistency with §9's tone work:** if §9's plain-language/no-jargon
rules land first (per §7a.3 point 4's sequencing), this facet's own copy
should be written to the SAME rules from first draft — worth stating
explicitly as a build constraint, not just an ordering note, so it
doesn't need a second tone pass later.

**What's NOT addressed, honestly:** no visual/interaction mockup exists
for this facet at all (unlike §9's report-tone work, which has an actual
existing page to modify) — this is greenfield UI, not a redesign. A real
design pass (screens, not just data-flow) is still needed before build,
beyond what a text-based plan review can respond to. Recommend a
follow-up round specifically for that once the questions above are
answered, not bundled into this pass.

## 8. Recommended scope — what to build first, ranked

1. **Resolve OD6 (privacy/terms for biometric data) + close the 6 S1
   security findings.** Not exciting, explicitly flagged as a hard gate
   3+ months ago, still open — the highest-consequence, lowest-visibility
   risk in this whole plan. Blocks nothing else on this list technically,
   but should not keep losing priority to feature work.
2. **F8 THOR weight reverse-engineering (§5).** Real, concrete, directly
   connects today's Koherent-mining research to the 1987-system research —
   the rare case where "mining the old system" produces a specific,
   testable engineering deliverable rather than just inspiration. Start
   the `.ASF` format reverse-engineering now; the industry-letter mapping
   is resolved (§5), so nothing in this item is Todd-gated anymore — the
   only residual check is whether Pulse's own org data records a matching
   industry field.
3. **Small, scoped Koherent V1 reuse: the multi-person @-mention context
   pattern (§1).** Worth a real look for Pulse's existing group/consultant
   multi-respondent reports — check whether `getMentionedUsersData`'s
   pattern (detect a mention, pull stored context, format into a prompt)
   maps cleanly onto Pulse's `engagement`/`session` model. Small, bounded,
   not a rewrite.
4. **What/So-What/Now-What (§2) — recommend a dedicated design review
   before building, not slotted into this plan's build scope.** Real
   opportunity, different altitude from what exists, deserves its own
   `/plan-design-review` pass the way the community-brain rebuild got one,
   not squeezed in here as an afterthought.
5. **Consulting Communicator / boutique-consultant facet (§7, §7a) — OD4
   resolved 2026-09-30, Todd confirmed by phone and requested this
   himself.** No longer blocked on authorization. Still blocked on the
   greenfield UI design pass (§7a.6) and, ideally, bshr's git-archaeology
   search for the real mockup content (§7a.4) before content work starts.

## 9. Operator priority (2026-09-30 12:02 UTC): make the diagnostic report
less clinical — design proposal, grounded in real sources not invented

### 9.1 The literal, mechanical root cause, found in code not guessed

`src/lib/scoring/prompt.ts` (`brollistika/toddito`, read directly)
contains this exact line, **twice** — once in the Full scoring prompt,
once in the Lite scoring prompt:

> `TONE: Clinical. Precise. Authoritative. Not preachy.`

The JSON schema both prompts require Claude to return also names a field
literally `clinical_observations` — which surfaces directly in the report
UI (`src/app/report/[id]/page.tsx`) as a section with kicker **"Clinical
observations."** Three reinforcing places — the LLM instruction, the data
schema, and the UI label — use the literal word "clinical." **This is not
a vague stylistic drift to diagnose; it is a direct instruction to the
model, still in place today, doing exactly what it says.** High
confidence this is the majority of what the operator and Todd are
reacting to.

### 9.2 What Todd's June feedback already fixed — don't re-do it

Checked the live report page before assuming nothing was done. Already
shipped: **S3a** (hook framing — `report.hook_card_copy`, a warm opening
insight line) and **S3c** (section label renames — "Leadership pattern" /
"Where the energy comes from", "Strategic posture" / "How the company
places its bets", both genuinely warm, narrative titles, not the old
"Leadership Profile"/"Strategy Profile"). The operator's complaint is real
and current despite this — the deeper layer (the prompt's own tone
instruction, and a couple of section *kickers* that still read clinical:
"Clinical observations," "Critical risk") was never touched. **Not
found/not confirmed shipped: S3b** (Major Crisis/Growth Engine context per
stage) **and S4-text** (Todd's own explanatory paragraphs) — worth a
direct check with whoever owns that repo before assuming either landed;
not re-derived here since it wasn't this task's scope.

### 9.3 Todd's own words, grounding the direction

From `~/.gstack/projects/conductor/ceo-plans/2026-06-17-pulse-1-1-todd-
feedback.md` (his real CEO-review call): *"it put out words that my
system would have never used"* (academic heaviness, flagged explicitly).
ELIMINATE: *"'Verdict' report framing that removes the consultant's room
to add value."* CREATE: the *"hook report"* format — *"preliminary-by-
design, engineered to create demand for the full engagement, not conclude
it."* Todd's own 10x-Check example already shows the exact narrative
shape wanted, unprompted: *"You're in Acceleration. That means your
growth engine is coordination breakdown. Here's what that costs at your
stage, and here's what the next 12 months look like if you don't address
it."* — that is a What → So-What → Now-What shape in miniature, produced
by the IP owner himself, months before anyone named the pattern.

### 9.4 Concrete proposal, ranked by leverage

1. **Rewrite the `TONE:` line in both scoring prompts.** Replace
   "Clinical. Precise. Authoritative. Not preachy." with something
   grounded in §2a's real Koherent rules and Todd's own framing — e.g.
   *"Clear and direct, not clinical. Plain language over jargon or
   assessment terms. Present observations, not a verdict — this report
   opens a conversation, it doesn't close one. Confident, not cold."*
   Single highest-leverage change — it's the actual instruction driving
   generation today.
2. **Rename `clinical_observations`** (schema field + UI kicker) to
   something that doesn't fight its own warm title ("Three things worth
   saying out loud" is already good copy undercut by its own label) — and
   give "Critical risk" a softer kicker too, matching its already-warm
   title ("If we have to pick one thing").
3. **Fold §2a's plain-language/no-jargon output rules directly into the
   scoring prompt's rationale-generation instructions** — not just the
   top-level tone line, but the per-field guidance for `stage_rationale`,
   `culture_rationale`, `leadership.rationale`, `strategy.rationale`.
4. **Adopt the real What→So-What staged narrative shape** (§2a's
   corrected version, not the never-built 6-field rumor) for the
   top-level hook/insight copy specifically — this is functionally what
   S3b (Major Crisis/Growth Engine context) was already designed to do;
   confirm whether S3b shipped before treating this as new work.
5. **Consider Koherent's fixed narrative openers, applied selectively —
   not universally** ("It seems you..." adapted to org-level: "This
   organization tends to...", "A specific risk to watch is...") — a real,
   working technique for consistency without formula, but only where it
   reads naturally; forcing it onto every field risks the opposite
   problem (mechanical instead of clinical).

### 9.5 What this section does not resolve

**The operator referenced existing "what/so-what/now-what" mockups this
pass could not locate** (checked `docs/`, `conductor/`, `gstack/` project
dirs — no match). This proposal is grounded in Koherent V2's real,
*implemented* prompt craft, which may or may not be what those mockups
show — if real mockups exist, they should govern over this document's
reconstruction from prompt text. gm is asking the operator directly in
parallel. **Do not treat §9.4 as final until that pointer resolves, or is
confirmed not to exist.** Also unresolved: whether S3b/S4-text actually
shipped (§9.2) — needs a direct repo check this pass didn't do, since it
wasn't the assigned scope.

## GSTACK REVIEW REPORT

**Mode: HOLD SCOPE.** This is improvement work on an existing, mature,
actively-developed product with real open findings (F8) and real open
risk (the security backlog) already on record — the job here is
correctly prioritizing and connecting what's already known, not inventing
new ambition. Scope-expansion framing would be the wrong instinct against
a backlog this concrete.

**Step 0 — Premise Challenge:** real. The operator's actual ask ("start
improving Toddito now, not just keep researching") is legitimate — but
"improve" concretely means closing F8 and the security backlog before it
means porting new Koherent patterns, since those are the two items with
the clearest do-nothing cost (a THOR panel that's honest about being
"directional" is still wrong; unresolved S1 findings are a real, standing
exposure, not a hypothetical one).

**Existing leverage:** substantial — `thor-score.test.ts`'s ground-truth
harness already exists and is exactly the verification mechanism §5's
task needs; `getMentionedUsersData`'s pattern is small and portable, not
a new subsystem.

**ENG REVIEW — Scope Challenge:** the one real technical unknown in this
plan is the `.ASF` binary format itself — neither research pass inspected
it at the byte level, so §5's step 1 (format reverse-engineering) has a
real, not-yet-bounded effort estimate. Recommend build's first concrete
step be a short timeboxed spike (e.g. half a day) on one `.ASF` file to
establish whether the format is quickly tractable (a simple fixed-width
or delimited record format) or genuinely obscure (proprietary binary
encoding needing more serious reverse-engineering) — and report back
before committing to the rest of §5's sequence.

**Test Review:** §5's fix is self-verifying by construction —
`thor-score.test.ts`'s two `it.fails` cases are the pass/fail criteria
already in the repo; no new test framework needed, just re-running an
existing one against corrected weights.

**VERDICT: CLEARED for the ranked scope in §8**, items 1–3 buildable now
(1 and 3 need no new research; 2's format-reverse-engineering spike can
start immediately, its industry-mapping half needs Todd). Items 4–5
explicitly deferred pending, respectively, a dedicated design review and
Todd's OD4 response — not silently folded into "build first" scope.

**UNRESOLVED DECISIONS:**
- Is the operator/Mo comfortable with security-backlog closure (§6, item 1
  in §8) taking priority over new feature work, given it was already
  flagged as a hard gate 3+ months ago and remains open?
- `.ASF` binary format: tractable or not — needs the timeboxed spike
  before §5's full sequence can be estimated honestly.
- ~~Which 1987 letter/family maps to which industry~~ — **resolved** (§5,
  bshr 2026-09-29). Residual: confirm Pulse's org intake has a matching
  industry field — a data check, not an open decision.
- Does build agree with deferring What/So-What/Now-What to its own design
  review rather than building it now, given the operator's "start
  improving now" framing might read as wanting it included?
