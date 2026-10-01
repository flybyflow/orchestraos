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

**CORRECTION to the correction above (bshr, 2026-09-30 14:09 UTC,
`msg_25785f88_77361808`, independently re-verified by this seat via `git
show` directly, not taken on trust): the full 6-field structure DOES
exist as real, working, rendered code — just not in V2, and not at
current HEAD anywhere. `relationalos` (Koherent V3)'s very first commit
(`a60503a`, "init") shipped a real homepage with a working `InsightsWizard`
component, steps literally labeled "What"/"So what"/"Now what", backed by
a complete system prompt (`app/api/insights/[insightsId]/prompts.ts` at
that commit) that generates exactly: `what` + `whatReadMore`, `soWhat` +
`soWhatReadMore` (matching V2's structure above), **and a real "Now What"
step generating 3 typed practices — `type: "Self" | "Other" | "Whole"`,
each with `title`, `hook`, `description`, and a `content` field containing
"Why" (3-4 sentences) and "How" (2 concrete action steps).** This is the
real 6-field pattern the operator remembered — What, So-What, and three
distinct Now-What practices — just missing the 6th rumored field,
"Nugget," which still has zero hits anywhere, now confirmed across four
separate repos/commits (V2 at HEAD, V3-main-HEAD, `daern91/koherent-mvp`,
and this V3 init commit) — strengthens, not newly discovers, the
hypothesis that "Nugget" may never have existed outside a Notion doc.

**The wipe, dated and attributed, not inferred:** commit `e0e9381`,
"cleanup," authored by the operator himself, one day after `a60503a` —
deletes the homepage, check-in flow, insights wizard, practice screens,
and roast/serenade components in one pass. Today's HEAD `app/page.tsx` is
a one-line `redirect("/spectacle")`, confirming the operator's own account
exactly: wiped and redirected toward the newer product line, not never
built.

**Bonus, directly relevant to §9 (report tone):** the same prompt file
carries a rich, genuinely well-crafted "Persona & tonality" system block —
*"Illuminate, not dictate. Guide, not control. Explore, not conclude. Be
concise, not verbose. Be clear and simple, not complicated."* — worth
citing as additional real source material for §9's tone rewrite, on top
of V2's rules already cited there.

**North star context for Self/Other/Whole (gm relaying the operator
directly, `msg_76e78da3_78992024`, 2026-09-30 14:36 UTC) — not a new
task, context for whoever writes the actual copy in §9 and any future
reuse (Executive Communicator, etc.).** Self/Other/Whole is **a
relational worldview, not a layout pattern.** Koherent's own North Star
horizon question, the operator's words: *"how might we foster connection
and unlock new collaboration using technology."* Underlying ontology:
lead with care and curiosity to create a space where creativity/creation
can emerge, directed at the Self, the Other, and the Whole — participatory,
not a report section with three labeled columns. Four reflective
questions meant to recur across features, the lens to write the actual
prose through, not generic labels slapped on a 3-column layout:
- What does this say about me?
- What does it say about the other?
- What does it say about my relationship with the other?
- What does it say for the whole of the organization?

**SUPERSEDED (operator correction, `msg_af74ed49_79234813`, 2026-09-30
14:40 UTC): this does NOT apply to §9's practices copy, because §9 no
longer has practices copy — §9.4 item 6 (the 3 typed practice cards) was
retracted as over-scoping a language fix into a structural rebuild.**
This north-star context stays real and correctly placed here (§2a), but
its actual application is to the **separate design-sprint seed** §9.4
item 6 now points to (Executive Communicator or the "personal takeaway
layer" question), not the current report-tone task. Corrected build
directly (`msg_1563bc74_79290847`) after this seat's own earlier relay
(`msg_cf317ddf_79121182`) got ahead of the operator's actual scope.

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
  intellectual capital/operating gaps. **Corrected (bshr,
  `msg_ed102e6b_19649666`; flagged stale by gm, `msg_d945a3aa_78741818`):
  real but narrow, component-level decoded content exists** —
  `MV6COMBO.ASC`, a real 1992 multi-rater report showing min-max
  divergence range per dimension across 8 named raters, plus
  `SACALC`/`SDCALC` "Significant Agreement/Disagreement" APL functions.
  Caveat: a numeric divergence range, not narrative synthesis, and the 8
  raters aren't confirmed to specifically be executives — real, but
  narrower than "aligns exec teams" implies.
- **Merger & Acquisition Manager** — surfaces cultural/structural fit
  pre-deal. Real, named market angle already noted (§3 of
  `docs/PLAN_toddito-1987-venture.md`) but zero build work, and **no
  decoded source confirmed** (bshr searched specifically, empty —
  "merger/acquisition" only appears as a single-org risk-category
  heading).
- **Investor Insight Application** — org-health lens for diligence.
  **Corrected: real decoded content exists** — a "Saleability Index"
  report section confirmed across all 8 industry variants — but framed
  as an internal scoring dimension, not a due-diligence product as
  named. Same "real but narrower than the framing implies" shape as
  Executive Communicator above.
- **Client Service Planner** — makes orgs market/customer-driven. **A
  real naming false-friend, not a match:** `CPCSP.EXE` is branded "Touche
  Ross — Client Service Planning System" (near-exact name match), but its
  own text describes a consultant's account-planning/upsell tool, not a
  tool for making an org internally more market-driven. Worth remembering
  so this doesn't get miscounted as a decoded win later.
- **Contingency Planner** — "tell me what you think should be happening"
  vs. reactive reporting. No decoded source confirmed — bshr searched
  specifically, zero hits for "contingency"/"scenario" anywhere in the
  distribution.

**Net, corrected:** 2 of the other 5 modules (Executive Communicator,
Investor Insight) have real but narrow, component-level decoded evidence
— not finished-product equivalents — 1 (Client Service Planner) is a
false friend, and 2 (M&A, Contingency Planner) have confirmed zero
overlap. Same shape as the earlier correction to V1's "lots of usable
code" claim: real, but narrower than the framing implies. **Doesn't
change §7a's own priority conclusion** — Consulting Communicator remains
the only one with content matching the operator's specific ask (a
consultant self-feedback facet), not just adjacent decoded material.

**Corrected: two of the other five (Executive Communicator, Investor
Insight) do have real, narrow, component-level decoded content — but
Consulting Communicator remains the only one with a source matching the
operator's SPECIFIC ask (a consultant self-feedback facet, boutique-
consultant ICP per §3 of the venture plan), not just adjacent decoded
material for a differently-shaped product.** Confirms the priority read
— not because the others have nothing, but because CPCSP's Client
Relationship dimension is the only decoded content that's actually the
right SHAPE for what was asked, checked against what's really decoded,
not assumed.

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

**CORRECTED (gm relaying the operator directly, `msg_672becde_77824931`,
2026-09-30 14:17 UTC) — the update immediately above was wrong and is
retracted, not just superseded.** The operator drew a clean separation of
concerns this seat had merged incorrectly: the recovered What/So-What/
Now-What(Self/Other/Whole) structure is for **Thread A, the MAIN
diagnostic report every respondent sees (§9)** — fixing the clinical
tone Todd has raised across multiple meetings. It does **not** apply to
this facet. **Thread B, this facet, stays exactly what point 2 above
already said: CPCSP's Client Relationship dimension supplies the content,
and this is additive self-coaching functionality on the existing
consultant admin panel** — not a new report-rendering pattern borrowed
from Thread A. Point 3 above (reuse Pulse's scoring/report architecture)
is NOT superseded after all — restored. Leaving this retraction visible
in the document rather than deleting the wrong version, matching this
document's own standing practice of correcting in place with the
record intact.

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

**Corrected (gm relaying the operator directly, `msg_17aefff3_77934674`,
2026-09-30 14:18 UTC) — this is NOT fully greenfield, the "no existing
page" framing above was wrong.** The operator pointed at
`https://getyourpulse.io/dashboard/engagements` as the real starting
point. Could not load it live (redirects to `/login`, no operator
credentials available or appropriate to use), so read the underlying
route directly instead: `src/app/admin/engagements/page.tsx`. Real,
confirmed: this is the existing consultant admin console — a shared
`ConsoleLayout` component with `activeNav` routing, a real nav-based
page system, a real "New Engagement" flow pattern, a real engagement
list UI. **The self-coaching facet should be a new page/nav item inside
this SAME `ConsoleLayout` system** (e.g. a new `activeNav` route), reusing
the console's existing chrome/navigation — not a from-scratch shell.
What's still genuinely new is the SPECIFIC self-coaching content/flow
(the consultant as respondent, the CPCSP-derived questions, the results
view) — that part still needs its own screens-level design pass, just
not the surrounding console/nav structure, which already exists and
should be reused. Narrower gap than originally framed, not a different
kind of gap.

## 7a.7 Three corrections from build (builder-3, 2026-10-01T01:00 UTC,
`msg_4a0235dc_16420681`), independently re-verified before folding in —
not just taken on trust, same standing practice as every other correction
in this document

**1. The instrument has 16 items, not 6 — §7a.2 read the wrong file.**
§7a.2's "six-item-family" quote (*"The %1 is more comfortable influencing
others on the basis of trust and expertise..."*) is `GPASCORE.ASF`
output — generated Leadership Style report NARRATIVE about the CEO
(`%1`), not a Client Relationship question item. **Re-derived
independently, not just trusted:** read `GPAQUEST.ASF` directly at byte
offset 42276 — a 3264-byte block splits exactly into 16 fixed-width
204-byte records (3264 ÷ 204 = 16.0 exactly), each ending on real sentence
punctuation; record 7 is 203 chars with one padding byte, confirming the
boundary is real rather than a width I imposed. All 16 texts reference a
named client contact (`%2`) and "Dialectics" (the 1987 program's own
consulting-firm name) — e.g. *"The relationship we have with the %2 is
close..."*, *"We have developed a good relationship with people within
the organization who can really influence the %2."* **Consequence: §7a.2's
"six-item-family" and §7a.5's "going from 6 known real items to Todd's
stated 16 questions needs new item content" both dissolve — Todd said 16,
the instrument has exactly 16, zero generation needed for the question
set.** §7a.4's "do not expand from 6 toward 16 by invention" still stands
for the separate What/So-What mockup (Thread A) — it was never about this
instrument. Also stronger than previously stated: `GPAQUEST.ASF` ~offset
4248 states the self-assessment premise directly, not as an inference —
*"The segment of the program called THE CLIENT RELATIONSHIP MODULE
renders a diagnosis of the extent to which YOU have managed to build
trust and credibility with key decision makers in the client
organization."*

**2. §7a.6 pointed at the wrong route file.** The operator's real pointer,
`getyourpulse.io/dashboard/engagements`, is `src/app/dashboard/
engagements/page.tsx` — §7a.6 read `src/app/admin/engagements/page.tsx`
instead, a different file for a different audience. **Re-verified
directly:** `ConsoleLayout.tsx`'s own header comment states it plainly —
variant `"internal"` is `/admin`, the operator back-of-house console
(ADR 003, "visibly the back of house, never confusable with the
consultant dashboard"); variant `"client"` is `/dashboard`, the consultant
console. The facet's respondent is the consultant, so it belongs on
`/dashboard`, not `/admin`. This error propagated into the build brief
this seat sent (telling build to build at `src/app/admin/self-check/`) —
build caught it independently and built at `src/app/dashboard/self-check/`
instead, adding the nav item to `src/app/dashboard/layout.tsx` where the
real dashboard nav lives. **Correct location confirmed: `/dashboard`, not
`/admin` — any future reference to this facet's route should say
`src/app/dashboard/self-check/`.**

**3. The §9 tone fix has not landed on `main` — "dispatched" is not
"done."** §9.5 says the TONE-line rewrite "remain[s] approved and
dispatched to build" — true but incomplete; it has not shipped.
**Re-verified directly against `toddito/main` (commit `fed0b43`):**
`src/lib/scoring/prompt.ts` still contains `TONE: Clinical. Precise.
Authoritative. Not preachy.` at both the Full and Lite prompts (lines 171
and 326); the third instance in `GROUP_SYNTHESIS_SYSTEM_PROMPT` (§9.1a) is
also still open. Build wrote the facet's new prompt directly from §9.4
item 1's replacement line plus §2a's recovered Koherent rules instead of
cloning the current (still-clinical) `prompt.ts` — the right call, and
exactly the prompt-tone-inheritance risk §7a.5 item 1 already warned
about. **Flagging in the doc itself, not just the commit message, so the
next seat reads "dispatched" correctly as "not yet landed," not "done."**

**Design question builder-3 raised, answered here rather than left open:**
is this facet per-engagement (one self-assessment per named client,
repeatable) or a single standing self-portrait of the consultant? **The
re-derived instrument text itself answers this, not a product guess** —
all 16 items are explicitly scoped to one named client relationship
(`%2`, "the organization's expectations regarding our products or
services," "people within the organization who can really influence the
%2") and cannot be rewritten as context-free trait statements without
exceeding what this facet is authorized to invent (OD4 cleared using
Todd's real IP, not a rewritten version of it). **Per-engagement, one row
per client, is correct — confirmed, not merely build's implementation
choice.** This also matches Pulse's existing engagement-based data model
rather than requiring a new one.

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
contains this exact line, **three times, not two as first found** — the
Full scoring prompt, the Lite scoring prompt, and (found later, during
§10's group-report research) `GROUP_SYNTHESIS_SYSTEM_PROMPT`, the prompt
generating the group report's `divergence_flags`/`group_observations`/
`critical_divergence` — the exact content §10's JTBD work is redesigning
the layout of. **This third instance was not included in the fix already
dispatched to build** (`msg_06b71ab7_75961657`, which only named the
Full/Lite prompts) — needs a follow-up, flagged below in §9.1a:

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

**9.1a — follow-up needed:** `GROUP_SYNTHESIS_SYSTEM_PROMPT` also has NO
"the move"/owner/condition structure anywhere — its output schema is
flat strings (`divergence_flags: [string]`, `group_observations:
[string, string, string]`, `critical_divergence: string`). Relevant to
§10.1 JTBD 5 below — flagging here since it's the same file/prompt this
subsection is about.

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
4. **RETRACTED as a structural claim, kept as language craft (operator
   correction, gm relaying, `msg_af74ed49_79234813`, 2026-09-30 14:40
   UTC) — "let's not conflate the two":** items 4-6 below (this whole
   block, as previously written) over-scoped a LANGUAGE fix into a
   structural rebuild the operator didn't ask for here. **This section's
   actual scope is language only** — reverse-engineer Todd's IP at the
   org level, change the LANGUAGE to be less clinical (his own words: it
   reads as too PhD-level/academic today), nothing more structural. What
   survives from the recovered content: the plain-language output rules
   (item 3, unchanged) and the fixed narrative sentence-openers, used
   selectively for tone, not as a new report structure.
5. **Koherent's fixed narrative openers, applied selectively — not
   universally** ("It seems you..." adapted to org-level: "This
   organization tends to...", "A specific risk to watch is...") — a real
   LANGUAGE technique for consistency without formula, used where it
   reads naturally. This is a tone tool, not a structural change — stays
   in scope.
6. **REMOVED — do not build.** The earlier version of this item proposed
   turning `recommendation` into 3 typed Self/Other/Whole practice
   cards. **That is exactly the over-scoping the operator's correction
   above rules out** — a structural rebuild, not a language fix, and not
   what this section is for. The Self/Other/Whole ontology remains real
   and valuable (the operator's own words) but as a **separate
   design-sprint seed** — likely connects to Executive Communicator
   (§7a.1's corrected survey) or the still-open "personal takeaway
   layer" question (§2's original "different altitude" point) — not this
   tone fix. If that design sprint happens, it gets its own section, not
   a retrofit into §9.

### 9.5 What this section does not resolve

**RESOLVED (bshr, 2026-09-30 14:09 UTC, `msg_25785f88_77361808`,
independently re-verified via `git show`):** the real "what/so-what/
now-what" mockup was found — `relationalos`'s init commit `a60503a`
(`app/(user)/page.tsx` + `InsightsWizard.tsx`), wiped one day later by
the operator's own `e0e9381` "cleanup" commit. Full real content now
folded into §2a, informing items 4-6 above. This governs over the V2-only
reconstruction the original pass was grounded in, per the operator's own
principle (a real answer beats a reconstruction). **§9.4 items 1-3 and
the TONE-line rewrite were never gated on this and remain approved and
dispatched to build** (`msg_06b71ab7_75961657`) — items 4-6 are the ones
this resolves, previously held per gm's instruction.

Still unresolved: whether S3b/S4-text actually shipped (§9.2) — needs a
direct repo check this pass didn't do, since it wasn't the assigned
scope.

## 10. Operator priority (2026-09-30 14:14 UTC, `msg_e90af3eb_77650903`):
Pulse UX redesign — 4 JTBDs grounded in a real customer report (Vandana),
folded together with §9's report-tone work

**RECALIBRATED (gm relaying the operator directly, `msg_657e31a3_78889076`,
2026-09-30 14:34 UTC) — read this before anything else in this section.**
This whole section is **exploratory synthesis from founder interviews,
NOT committed/planned scope** — unlike §9 (report tone), which is real,
confirmed, concrete work grounded in the recovered relationalOS content.
Don't let "small diff" (JTBD 1/4 especially) read as "confirmed wanted" —
the grounding discipline already applied to JTBD 3 and 5 (flagging
unconfirmed premises rather than building on them) applies to the
"easy" ones too, just in a different sense: technically buildable is not
the same as operator-confirmed. **JTBD 1/2/4 ship as experimental work in
a preview deploy for the operator's own review and decision when they're
back — not treated as already-decided.** JTBD 3 stays held regardless,
unchanged. Section 9 is the one thread here that's fully confirmed;
proceed on it with full confidence, it's the real thing.

Operator forwarded a JTBD (Jobs to be Done) analysis from a separate
Claude cowork session, grounded in a real customer aggregate report
("Vandana") and Todd's framework. North star quote, Todd's own words:
*"Who needs to be doing what, with whom, by when."*

**Grounding check, done before designing anything — checked the real
group-report code (`src/app/group/[id]/page.tsx`, `brollistika/toddito`),
not just trusted the analysis:**
- JTBD 1 and 4's premise CONFIRMED exactly: `consensus_stage` renders
  first as a single given value (no disagreement signal at that point);
  `stage_distribution` (which WOULD show disagreement) is a separate,
  later section; `critical_divergence` (the "so what") is the LAST scored
  section before the re-synthesize trigger — genuinely buried at the
  bottom, not a exaggeration.
- JTBD 3's premise **NOT confirmed, flagging rather than assuming true:**
  searched the entire repo for "agenda," "readout," "facilitator" —
  zero hits anywhere. No content field or component literally matching
  "the readout agenda" was found. Closest real candidate:
  `group_observations` (a string array, rendered as a list) could
  function as informal talking points, but isn't structured or labeled
  as a facilitator sequence. Either the source Claude session was
  looking at a different artifact (a PDF export, an admin-only view, a
  mockup) or "the readout agenda" describes `group_observations`
  loosely. **Worth a one-line confirmation from the operator before
  building "pull the existing agenda into its own view" — there may be
  nothing existing to pull, only something to build fresh.**

### 10.1 Design proposal per JTBD, grounded in the confirmed code above

**JTBD 1 — the founder who doesn't know what they don't know.** Lead the
group report with the single highest-magnitude divergence (Vandana's
case, per the operator's analysis: `No_influence`, 6 points) as its own
callout, ABOVE `consensus_stage` — reordering existing sections, not
inventing new content. The "so what" text already exists
(`critical_divergence`); this is a layout change (move it first,
visually distinct — the existing pulse-accent-border treatment already
used for it is good, keep that styling) more than a content change.

**JTBD 2 — the co-leader who needs permission to name reality.** Real new
UX, not a reorder: a private, single-respondent reflection sentence shown
BEFORE the group reveal — e.g. *"Your data suggests you're carrying more
uncertainty than the person leading you knows."* No existing component
found for this (checked the single-report page, `src/app/report/[id]/
page.tsx` — no pre-group-reveal respondent-only view exists today).
Needs: (a) a new scoring output — a short, individually-scoped reflection
sentence, generated alongside the existing per-respondent report, not
derived from the group aggregate; (b) a new UI step in the flow between
"you finished your session" and "the group report is ready," gated so a
respondent sees only their own sentence, never another's. **Directly
overlaps §9's tone work** — this sentence needs the plain-language,
non-clinical framing from day one; write it against §9.4's corrected
rules, not a fresh guess.

**JTBD 3 — the practitioner who needs to run the room.** Held pending the
grounding gap above. IF `group_observations` is confirmed as the real
source: restructure it from a flat list into a "Readout Mode" — one
divergence per screen/card, one guiding question per card (question text
not yet sourced — needs either Todd's own facilitation questions or a
design pass, not invented here), a "mark as discussed" toggle (new,
simple client-side state, no schema change needed for a single-session
use). If `group_observations` is NOT the real source, this JTBD needs a
fresh scope conversation with the operator before any design proceeds.

**JTBD 4 — the founder who needs to know their real stage.** Confirmed
buildable directly from `stage_distribution` (already computed, already
fetched) — when the distribution shows real disagreement (not all
respondents landing on `consensus_stage`), surface that explicitly
BEFORE the stage/priority content, e.g. *"You and your co-leader placed
this company at different stages. That disagreement is itself a
finding."* (completion text, gm `msg_46ca2d93_77758073`) — **then show
both priority matrices side by side**, rather than picking one as
canonical. Still small: existing data, a conditional render, not a new
data source or scoring change.

**JTBD 5 — the founder who needs to act, not just understand.** Per the
operator: each divergence flag is claimed to already have "The move" —
specific, owned, conditioned — called out as the best part of the
product, just formatted identically to everything else so it reads as
more text instead of a commitment. **Premise NOT confirmed, same class
of gap as JTBD 3 — flagging, not assuming:** read
`GROUP_SYNTHESIS_SYSTEM_PROMPT` directly (§9.1a) — the real output
schema is flat strings, `divergence_flags: [string]`, with no
owner/condition/move sub-structure anywhere in the prompt or its
instructions. Either "the move" is embedded as unstructured prose inside
the flag string today (matching the JTBD's own complaint that it "reads
as more text"), or the operator's Claude session was evaluating a vision/
mockup, not the shipped prompt. **This changes the implementation shape
either way:** extracting "the move" into a real commitment card (gap in
one line, action in one sentence, an owner field, a completion
CONDITION — not a date, per the report's own existing spec elsewhere)
needs the scoring prompt to output those as SEPARATE structured fields,
not parsed out of free text after the fact — a schema/prompt change,
not just a UI reformat like JTBD 1/4. Real, scoped, but bigger than it
reads at first: 3-5 commitment cards per report is a new structured
output, one more prompt change alongside §9's TONE-line and per-field
fixes to the same file.

**The three research throughline questions (gm `msg_46ca2d93_77758073`,
relaying the operator) — stated as the actual acceptance criteria for
this whole redesign, not an addendum:**
1. Does the person with less power feel safe enough to tell the truth?
2. Does the person with more power receive it without defending?
3. Does the practitioner have what they need to hold the room?

Every screen/label/sequence decision in §10.1 should be evaluated
against these three, explicitly, not just shipped because it looks
right — worth carrying into whatever screens-level design pass JTBD 2/3
(and now 5) still need (§10.3/§10.4).

### 10.2 Folding together with §9 (report-tone), per gm's instruction

Real overlaps, not two independent redesigns landing on the same
screens: JTBD 1's reordering and JTBD 4's new stage-disagreement copy
both touch the SAME report page §9 is already changing the tone of —
sequence as ONE pass over `src/app/report/[id]/page.tsx` and
`src/app/group/[id]/page.tsx` together, not two separate diffs that both
touch the same sections. JTBD 2's new reflection sentence should be
written using §9.4's corrected tone rules from its first draft (same
"write it right the first time, don't inherit the old TONE line"
principle already applied to the consultant facet, §7a.3 point 4).

### 10.3 CEO + design review — same self-directed process, same reason

Same process note as §7a.5/7a.6: direct rigorous self-review against the
skills' own Prime Directives, not the full interactive ceremony —
unattended overnight execution.

**CEO review — premise and failure modes:** premise holds for 3 of 4
JTBDs (confirmed above); JTBD 3's premise is the one real gap, correctly
held rather than built on an unconfirmed grounding. **Real failure mode
not yet named:** JTBD 2's pre-reveal reflection sentence is generated
per-respondent from their own individual data — if the scoring pipeline
generating it fails or times out for one respondent, does the group
report block entirely, or does it degrade gracefully (respondent sees
their session as normal, just without the reflection sentence)? Not
addressed in the JTBD analysis; should degrade gracefully — a missing
nice-to-have sentence should never block a respondent completing their
session. **Test requirement:** JTBD 2's gating logic (respondent sees
only their own sentence) needs an explicit test — this is a real privacy
boundary (one respondent's data reaching another's screen), not a
cosmetic bug if it fails.

**Design review:** JTBD 1's reorder and JTBD 4's new copy are low-risk,
additive to an existing page — no new screens. JTBD 2 is genuinely new
UI (a new step in the session-completion flow) — needs its own
screens-level pass, same "greenfield UI" caveat as §7a.6. JTBD 3, if
`group_observations` is confirmed as the source, is a real interaction
design (card-by-card facilitator mode) also needing its own pass, not
specified at the screens level here.

### 10.4 What this section does not resolve

JTBD 3's grounding (is `group_observations` really "the readout agenda"
the operator meant, or something else) — needs a direct one-line
confirmation before any design work starts on it. JTBD 3's actual
per-divergence guiding questions — not sourced, needs Todd or a real
content pass. **JTBD 5's grounding is the same open class of question as
JTBD 3** — is "the move" already real content embedded in
`divergence_flags` prose, or does it need a genuinely new structured
prompt output — needs a direct check of real generated report content
(not just the prompt source) before scoping the schema change. JTBD 2's,
JTBD 3's, and now JTBD 5's screens-level design — flagged as needing
their own passes, not done in this text-only review. Sequencing with §9
(now confirmed, not just proposed) and §7a.3 (three Toddito UI threads
now touching overlapping report surfaces) — recommend one coordinated
build pass across all three rather than three separate ones landing on
the same files in sequence, but that's a scheduling call for whoever
routes this to build, not decided here.

## 11. Operator GO-ahead (2026-09-30 15:10 UTC, `msg_5a8838f2_81000046`):
Investor Insight Application — 4th thread, real content found, but the
name doesn't match what's actually decoded

**Re-verified directly, not trusted from bshr's summary alone:**
`strings`'d the real `.ASF` files (`GPASCORE.ASF` and 7 sibling SCORE
files — present in all 8 industry variants, confirming bshr's "all 8"
count). **Real, material correction: "Saleability Index" is NOT an
investor/M&A due-diligence signal.** The section is literally headed
`"========= SALES ADVICE"` in the raw file, and its content — *"The %2
is taking a long term perspective... likely to be willing to spend money
today on products and services that will yield a pay off in the
future,"* keyed to the org's Development Stage — is a **sales-receptivity
signal for whoever is engaging the org: how likely is this company/its
decision-maker to buy more products or services right now.** That's
upsell/cross-sell guidance for a consultant's own engagement, not an
outside investor's diligence lens. **Same class of naming false-friend
as Client Service Planner (§7a.1)** — real content exists, but "Investor
Insight Application" is not an accurate description of what it actually
does.

**Design proposal, corrected to match the real content:** build this as
a **"Sales Readiness" or "Engagement Opportunity" signal** in the
existing report/admin surface (not investor-diligence framing) —
surfaces whether the org's current stage/posture suggests receptivity to
additional services, using the real decoded stage-keyed sales-advice
text as source material. This is smaller and more honest than an
investor-diligence product would be: a report annotation reusing the
existing scoring pipeline's `stage` output, not a new due-diligence
report type. **If the operator specifically wants an investor/M&A
diligence lens** (the name as originally framed), that's real NEW scope
not covered by this decoded content — flag back rather than force the
Saleability data to answer a question it wasn't built for.

**CEO + design review, same self-directed process as every other section
tonight, same reason (unattended execution):** the naming correction
above IS the premise challenge — proceeding with the design as gm/the
operator named it ("investor insight," "PE/M&A audience") would have
built the wrong thing under a technically-true "real decoded content"
banner. Failure mode avoided by re-verifying the source directly instead
of trusting a one-line summary. Recommend: confirm with the operator
which framing they actually want (sales-readiness, matching the real
content, vs. investor-diligence, which needs new content) before any
build work, same "confirm before build" discipline as everything else
tonight — this is NOT build-ready as a "GO," it's build-ready as a
question.

## 12. Operator GO-ahead, same message: Executive Communicator — 5th
thread, real content confirmed, matches the name this time

**Re-verified directly:** `strings`'d `MV6COMBO.ASC` — a real 1992
multi-rater combo report, raw numeric min-max ranges per dimension
(Development Stage, Strategy, Structure, Culture, Leadership Style,
Client Relationship, Saleability Index, Risk) across what the file
itself labels as multiple raters. This genuinely matches "align exec
teams on strategy by surfacing... operating gaps" — the real content
IS a divergence-across-raters report, same shape as Todd's own naming.
Caveat unchanged from §7a.1: the raters in this specific sample aren't
confirmed to specifically be executives (could be any multi-rater
scenario the 1987 system supported) — a real, if minor, gap between "we
have multi-rater divergence data" and "we have exec-team-specific
divergence data."

**Design proposal:** this is structurally the SAME pattern Pulse's group
report already implements for multi-respondent org diagnostics
(`consensus_stage`, `stage_distribution`, `divergence_flags`,
`critical_divergence` — §10's own research) — Executive Communicator is
that same pattern, narrowed to an exec-team-specific framing and
narrative. **Reuses §10's JTBD 1 "lead with the load-bearing gap"
design directly**, not a new UI pattern. Per gm's corrected framing
(`msg_af74ed49_79234813`): the Self/Other/Whole reflective LENS applies
here as PROSE for writing the divergence narrative (what does this
disagreement say about each leader, about their relationship, about the
whole team) — not literal UI cards, same corrected understanding as
§9's language-only scope. **This is likely the real home for the
Self/Other/Whole ontology** gm flagged earlier (§2a) as a separate
design-sprint seed, now with a concrete landing spot.

**CEO + design review:** premise holds — real content, real name match,
no false-friend risk found here unlike §11. Real gap: MV6COMBO.ASC is
one 1992 sample file, not a live data source — the actual multi-rater
input mechanism (how does Pulse capture "multiple named executives
rating the same org" as distinct from the existing group-report flow,
which already does multi-respondent aggregation) needs its own design
pass, not assumed identical to the existing group report just because
the OUTPUT shape matches. Test requirement, same pattern as §10.3: if
this reuses `divergence_flags`-style output, needs the same ground-truth
verification discipline already established for that code path.

**What both new sections do not resolve:** §11 needs an explicit
operator answer on sales-readiness vs. investor-diligence framing before
any design proceeds past this text. §12's exec-specific-rater intake
mechanism needs its own pass. Neither is build-ready — same multi-PR,
preview-deploy, QA-before-ship discipline as the other three threads,
per gm's instruction, once each clears its own open question.

## 13. Operator instruction (2026-09-30 17:06 UTC, `msg_4793e1d7_87969247`):
take all three Toddito design threads to build-ready in parallel with
build's Play/GROW/LIVE work — Congruence/Incongruence, new

### 13.1 Congruence/Incongruence Analysis — real content, spike cleared, first full design

**Source, confirmed real (bshr's research + spike, `msg_f10c431b_81341400`,
`msg_579a3773b7e4`):** `GP*RISK.ASF` (generic across all 8 industry
variants, byte-identical between A and B) contains a large, professionally-
written, fully-decoded cross-dimensional fit-checking library: ~35
Structure×Strategy conflict rules, ~14 Culture×Structure rules, ~20
Culture×Strategy rules, a per-stage "ideal profile" narrative, a 32-item
organizational-health bank (board involvement, one-man-rule, CFO
competency, environmental scanning, morale — each 3-tier healthy/
moderate/severe), a Greiner-style stage-crisis framework, and a
meta-synthesis layer. **Confirmed absent from modern Toddito** — direct
grep across the live repo for congruen/incongruen/crisis-of-leadership/
one-man-rule: zero hits. **Every input it needs is already computed by
the modern engine today** (structure/strategy/culture/leadership scores,
dev stage) — this is new report LOGIC on existing outputs, not new data
capture, no Todd input needed to build the base version.

**The spike, real and verified, not simulated (bshr, `msg_579a3773b7e4`,
gm's own verdict: "clears the gate"):** reimplemented `thor-score.ts`'s
actual scoring math standalone, ran it against a real ground-truth
fixture (`thor-legacy-case-a.json`, the same one already used for F8),
hand-applied ~8-10 of the ~70+ real decoded rules against this org's real
computed scores. Real findings: the `OVERALL_RISK` output matched the
legacy program's own printed "Moderate Risk" verdict exactly — an
independent sanity check the underlying scoring is sound, not just that
the rule text reads well. Rules fired conditionally, not indiscriminately
— several culture/strategy conflict rules correctly stayed silent when
this org's own risk-acceptance score didn't meet their trigger condition,
which is the actual test of "coherent decoded logic" vs. "plausible-
sounding garbage." One genuinely useful finding fell out un-forced: the
org's structure evidence fit its #3-ranked lifecycle stage (Acceleration)
better than its nominal #1 pick (Stall) — exactly the kind of insight a
consultant would want flagged, not invented to sound clever.

**Design proposal — a new report section, not a new data pipeline:**
1. **Rule engine**: port the decoded conflict rules as conditional logic
   (`if structure.dominant === X && culture.dominant === Y → fire rule
   text Z`) reading the SAME scored dimension outputs the report already
   computes — `leadership`, `strategy`, `culture` objects from
   `src/lib/scoring/prompt.ts`'s existing output. No new LLM call needed
   for the rule-firing itself; the rules are deterministic conditionals
   on numbers already in hand, same shape as F8's weight-matrix work.
2. **Narrative synthesis**: the fired rules' text needs the SAME
   plain-language treatment as §9 — write a synthesis pass (could reuse
   the existing scoring LLM call, appending fired-rule context to the
   prompt, or a dedicated cheap follow-up call) that turns "these N rules
   fired" into readable prose, not a bullet list of decoded 1987 text
   verbatim (which itself needs the §9 tone treatment — the source text
   is 1987-era professional writing, not clinical, but also not written
   for this product's voice).
3. **Report placement**: a new section, likely adjacent to `critical_risk`
   (§10's own "lead with the load-bearing gap" principle applies here
   too — if a real Structure×Culture conflict is found, it's exactly the
   kind of thing §10's JTBD 1 wants surfaced prominently, not buried).
4. **Stage-ambiguity handling**: the spike's own best finding (structure
   evidence favoring a different stage than the nominal pick) suggests
   this feature should explicitly surface stage disagreement between the
   dimension's own top-2/3 scores when they're close — connects directly
   to §10 JTBD 4's "contested stage" pattern, same principle applied at
   the individual-report level instead of the group-report level.

**CEO + design review, same self-directed process, same reason
(unattended execution):**
- **Premise**: holds, strongly — this is the rare case where "real
  decoded 1987 content" is ALSO genuinely novel report value or existing
  product (no `Congruence`/`Incongruence` feature exists today at all,
  confirmed by the same grep that found the content missing).
- **Real risk not yet named**: firing ~70 conditional rules against
  every report risks noise — not every org will have many real conflicts,
  and a section that's usually empty or usually fires 1-2 generic-
  sounding rules will read as filler. Needs a real threshold/ranking
  decision (top-N most significant fires, not all fires) — not decided
  here, a real design question for whoever builds this.
- **Test requirement**: the spike's own hand-check (8-10 of 70+ rules,
  one case) is NOT sufficient verification for a shipped feature — needs
  the full rule set actually coded and run automatically against BOTH
  ground-truth fixtures (case A here, case B not yet run — bshr offered,
  not done), same ground-truth-case discipline as `thor-score.test.ts`.
- **Scope check**: the 32-item health bank and the Greiner stage-crisis
  framework are real additional content NOT covered by the spike (which
  only exercised the conflict-rule subset) — flag clearly that "the
  spike cleared the gate" means the conflict-rules mechanism is sound,
  not that all four content types (conflict rules, health bank, ideal
  profiles, stage-crisis) have been verified working. Recommend building
  conflict rules first (spiked, verified) before the other three.

**What this section does not resolve:** the narrative-synthesis prompt
itself isn't written (needs §9's tone treatment applied to new content,
not just existing fields); the top-N firing-threshold design isn't
decided; case B verification hasn't run; the health-bank and stage-crisis
content are real but unspiked. Not build-ready for the FULL feature —
build-ready for the conflict-rules mechanism specifically, which is what
the spike actually verified.

### 13.2 Client Relationship / Consulting Communicator — remaining gap to build-ready

Per §7a, two items were open: OD6-the-gate and a screens-level design
pass (narrowed after the console-layout correction, §7a.4 update). OD6
is a standing operator-level privacy/consent gate on biometric voice
capture — **not resolvable by a design pass**, stays open regardless of
how complete this design gets; flagging plainly rather than designing
around it. The screens-level piece, now designed:

1. **Entry point**: a new nav item inside the existing `ConsoleLayout`
   (§7a.4's correction — real layout confirmed, `src/app/admin/
   engagements/page.tsx`'s pattern), e.g. `/admin/self-coaching`, styled
   consistently with the existing `Engagements` page (same h1/intro-
   paragraph/CTA pattern already there).
2. **Session flow**: reuses the existing voice-session mechanism (same
   as a client engagement) but with the consultant as respondent,
   `respondent_role` set to identify this as self-assessment, question
   set derived from CPCSP's Client Relationship item family (§7a.2).
3. **Results view**: a new report variant (NOT reusing the org-report's
   `Leadership`/`Strategy` section labels, per §7a.3's corrected scope —
   distinct content, own section names grounded in the real trust/
   influence-style dimension).
4. **Sequencing, unchanged from §7a.3**: write this facet's copy against
   §9's corrected tone rules (language-only, no Self/Other/Whole
   structure) from the first draft.

**Build-ready for the mechanism and layout; still gated on OD6 for wide
distribution, and on Todd's OD4 confirmation for the specific
16-question expansion (§7a.4) — ship with the 6 real known items if that
expansion hasn't landed by build time, honestly labeled as a partial
set, not a fabricated full one (§7a.5's original caution, still the
right call).**

### 13.3 Executive Communicator — multi-rater intake design

Per §12, the report format is confirmed (reuses the group-report
divergence pattern) but the intake mechanism was flagged as needing its
own pass — the existing group report aggregates multiple RESPONDENTS
answering the SAME session type; Executive Communicator needs multiple
NAMED EXECUTIVES each rating the same org from their own seat, a real
but structurally similar shape.

**Design proposal:** reuses the existing `engagements` → multiple
`sessions` pattern (§13.2 point 1's same admin console) with one real
addition: each session in the engagement needs a `rater_role` or
similar tag identifying WHICH named executive/seat is rating (vs. the
existing group-report flow, which doesn't need to distinguish
respondents by name/role for its aggregate). Scoring/report reuses the
existing group-synthesis pipeline (`GROUP_SYNTHESIS_SYSTEM_PROMPT`,
already fixed for tone per §9.1a) with the addition of per-rater identity
in the divergence narrative ("the CEO and the COO see this differently"
instead of an anonymous aggregate) — a real, scoped prompt change, not a
new pipeline.

**Build-ready**, with one open question flagged, not decided: does
distinguishing raters by name/role in the narrative create a
confidentiality concern (an exec seeing that their specific rating
diverged from a named colleague's) that the anonymous group report
doesn't have? Real product-policy question, not a technical one — flag
to the operator before shipping the named-divergence framing, technical
build can proceed with role-tagging either way.

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
