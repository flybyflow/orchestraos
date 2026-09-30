# Plan: OD6 — A Compliant, Self-Hosted Voice Agent for Toddito/Pulse

- **Requested by:** operator, via gm (Telegram, 2026-09-29 22:58 UTC; relayed as
  `msg_46c7df09_22812793`). Closes the OD6 biometric-voice-data privacy/ToS gate
  open since the June 2026 CEO review.
- **Authored by:** plan (non-interactive, operator asleep), research dispatched to
  three forked subagents (one per candidate repo, plus one for a lead the research
  itself surfaced).
- **Scope, per the operator's own framing ("start with something like this and make
  it compliant"):** research + spec only. **Not a build.** This is architecture-level
  — replacing/supplementing the current voice vendor (ElevenLabs Conversational AI)
  — and crosses the "architectural decision, multiple valid designs" bar. Per gm's
  instruction, if this reaches a concrete proposal it needs a multi-model congruence
  pass before anyone builds against it — that is a **later** step, not run tonight.
- **New initiative, not folded into the existing Toddito docs** — per gm's explicit
  instruction, kept standalone unless a real connection emerged. One did (§2), so this
  document cross-references `docs/PLAN_toddito-engineering.md` and
  `docs/SECURITY.md` rather than re-deriving their findings.
- **Correction (gm, `msg_6595ef82_23438034`, 2026-09-29 23:10 UTC):** `docs/SECURITY.md`
  and the webhook route this document cites in §0/§2 were read from
  `/Users/flybyflow/conductor/repos/pulse` (`cassandragirard-alt/pulse`) — a
  **different, ~2.5-month-stale repo** from `brollistika/toddito`, the actual deploy
  target. Re-verified tonight, directly against `brollistika/toddito` via `gh api`:
  the core claim holds — the same ElevenLabs Conversational AI webhook exists at the
  same path, same payload shape, and still does `supabase.from("transcripts").insert({
  raw_transcript: data, ...})` (verbatim storage, no retention/redaction visible in
  that file). **Does NOT hold:** `brollistika/toddito` has no `docs/SECURITY.md` at
  all (confirmed 404) — the "SEC-10" label is specific to the stale repo's own
  numbering and doesn't exist in the real one. Treat §0/§2's *substance* as verified,
  the *SEC-10 label* as informal shorthand only, not a citation to a real finding in
  the deploy target's own docs.

## 0. What "compliant" needs to mean here, concretely

Grounded in what the June 2026 CEO review actually flagged (biometric voice data —
not a generic "add encryption" ask) and in what's realistic for a small team, not a
theoretical enterprise compliance program:

1. **Consent capture.** An explicit, timestamped record that the respondent agreed to
   have their voice recorded and analyzed, before the session starts. Today: **zero**
   — checked `src/app/api/webhooks/elevenlabs/route.ts` and the session-creation path,
   no consent field or capture step exists anywhere in Pulse.
2. **Data location — does the audio itself leave the operator's own infra.** This is
   the specific thing OD6 is about. Today: **yes, it does.** ElevenLabs Conversational
   AI runs the entire live call (ASR + turn-taking + TTS) on ElevenLabs' own cloud;
   Pulse's webhook only receives the post-call **text** transcript. The raw audio (the
   actual biometric data) is processed and — per ElevenLabs' own retention terms,
   not verified in this pass — potentially stored on a third party's infrastructure
   that Pulse has no contractual visibility into beyond a standard API terms-of-service.
3. **Retention.** A defined, enforced lifetime for both audio (wherever it lives) and
   the stored transcript, with deletion after that window. Today: **none.** Per
   `docs/SECURITY.md` SEC-10 (already an open finding, not new): "raw respondent
   speech stored verbatim in `transcripts.raw_transcript` with no PII/content-safety
   pass or retention/redaction policy (GDPR exposure)."
4. **Encryption at rest/in transit.** In transit: yes today, standard TLS to Supabase
   and to ElevenLabs. At rest: Supabase's own disk encryption applies, but there's no
   Pulse-level encryption or redaction of the stored `raw_transcript` JSON blob.
5. **Audit trail.** Who accessed a given respondent's raw transcript/audio, and when.
   Today: none — `docs/SECURITY.md` SEC-11 already flags shared-admin-token access
   with no per-user audit log, a related but distinct gap.

None of this requires an enterprise GPU cluster or a BAA-grade compliance program to
meaningfully close. It requires: (a) a consent step in the product, (b) a real
retention/deletion policy enforced in code, and (c) — the part that actually needs
new infrastructure — **keeping the raw audio itself off a third party's servers**,
which is the one item self-hosting genuinely buys that a policy change alone cannot.

## 1. The three candidates evaluated — none is a drop-in

Two were named by the operator; a third surfaced from the second candidate's own
competitive-analysis doc and was evaluated with the same rigor, since it looked like
a closer architectural match to "self-hosted Bland AI" than either named option.

| | **voicebox** (jamiepine/voicebox) | **VoiceStudio** (debpalash/voicestudio) | **Patter** (PatterAI/Patter) |
|---|---|---|---|
| **What it actually is** | Local-first desktop app + FastAPI backend. A **TTS/STT engine toolkit** — voice cloning, local Whisper transcription, 7 local TTS engines (Qwen3-TTS, LuxTTS, Chatterbox, Kokoro, HumeAI TADA, +2), MCP server. **No conversation/turn-taking layer at all.** | Local-first Electron app + FastAPI backend. Also a **speech-engine toolkit** (voice cloning/design/dubbing/dictation), exposing an OpenAI-compatible local `/v1/audio/speech`+`/v1/audio/transcriptions` API. Own docs: *"VoiceStudio is a provider, not the orchestrator... You bring the agent runtime."* Telephony is a Twilio bolt-on, not core. | The only one of the three that is genuinely a **conversational-agent orchestrator** — turn-taking, VAD, barge-in state machine, multi-provider LLM/STT/TTS abstraction. Built for **phone-carrier telephony** (Twilio/Telnyx/Plivo), not browser sessions. |
| **License** | **MIT.** Clean. | **AGPL-3.0-only**, commercial dual-license "coming soon" (not yet available — contact-email only). Real legal exposure for a closed-source multi-tenant SaaS running a modified copy as a network service. | **MIT.** Clean. |
| **Does audio leave the operator's infra?** | No — local Whisper + local TTS models, no cloud speech API calls found in `requirements.txt` or routes. | No, for the core TTS/STT path — local OmniVoice/Whisper models. Yes, for the Twilio call path (phone audio transits Twilio's cloud regardless of self-hosting). | Depends entirely on which provider you wire in — every shipped TTS provider is cloud-only; only Whisper (of the STT options) is self-hostable. Patter itself doesn't ship a local-audio guarantee. |
| **Consent / retention / encryption-at-rest / multi-tenant** | None built in — `RESPONSIBLE_USE.md` explicitly punts consent/retention to whoever builds on top. Single-user SQLite, no multi-tenant schema. | None verified for consent/retention specifically (real security discipline exists on the Twilio *webhook* path — signed HMAC, rate limiting — but that's transport security, not data-lifecycle policy). Single-tenant design (one API key, localhost-bound Docker by default). | Local JSON call logs (`metadata.json`/`transcript.jsonl`/`events.jsonl`) with **no encryption-at-rest, no retention/deletion policy, no consent-capture UI** — same "left to the app" posture as the other two. |
| **Maturity** (`gh repo view`, live 2026-09-29) | 56,002★, 30+ contributors, created 2026-01-25, last push 2026-08-09 (~7wk stale). | 47,970★, 5,383 forks, created 2026-04-09, **pushed today**, 500+ tests, CI. | 1,062★, 125 forks, created 2026-04-07, last push ~5wk ago. Smaller/younger; real `SECURITY.md`/CI/changelog. |
| **Product-shape fit for Pulse (browser-mic session, not a phone call)** | Fits as a *component* (local TTS/STT engine), not a session layer. | Same — component fit for local TTS/STT; its telephony path assumes a phone number, which Pulse doesn't use. | **Mismatch.** Patter's entire value proposition is "give your agent a phone number." No browser/WebRTC-direct transport shipped — adopting it means either changing Pulse's product to phone-based, or forking its internals behind a custom transport. |

## 2. Comparison against what Toddito/Pulse does today

Per `src/app/api/webhooks/elevenlabs/route.ts` (read directly, not assumed) and
`docs/SECURITY.md`: ElevenLabs Conversational AI owns the entire live call — ASR,
turn-taking, TTS — on their cloud. Pulse's webhook receives only a post-call JSON
transcript (`{transcript: [{role, message, time_in_call_secs}], ...}`), HMAC-verified,
and stores it verbatim in Supabase. Everything downstream (`processElevenLabsTranscript`
→ `scoreAndPersistSession`, Claude scoring) is **already vendor-agnostic text
processing** — it takes a string, not an audio stream or an ElevenLabs-specific object.

```
Today:
  respondent's mic --> ElevenLabs Conversational AI (cloud: ASR+turn-taking+TTS)
                             |
                             v  (post-call JSON transcript only)
                   Pulse webhook (route.ts) --> Supabase `transcripts` (verbatim, no retention policy)
                             |
                             v
                   Claude scoring (text in, text out) --> report

Proposed (assembly, not a single vendor swap):
  respondent's mic --> self-hosted STT (local Whisper) --> orchestration layer
                                                             (Pipecat/LiveKit/forked
                                                              Patter -- unresolved, §3)
                             |                                    |
                             v                                    v
                   self-hosted TTS (local, e.g. Kokoro)   consent record (new)
                             |
                             v  (same webhook shape: transcript text + session_id)
                   Pulse webhook (unchanged route) --> Supabase `transcripts`
                                                         (now with retention/deletion policy)
                             |
                             v
                   Claude scoring (unchanged) --> report
```

Everything below the webhook line is unchanged either way — the swap is entirely
above it, which is why side-by-side migration (§3 item 5) is architecturally real,
not aspirational.

**This matters for migration risk:** swapping the *live-call* layer (ASR+orchestration
+TTS) for a self-hosted equivalent does not require touching the scoring pipeline at
all, as long as the replacement produces the same shape of transcript text. The
webhook contract itself (`{transcript, metadata, dynamic_variables.session_id}`) is a
reasonable interface to preserve regardless of what sits behind it — a self-hosted
agent could POST to the same route shape, letting the two run side-by-side (old
ElevenLabs sessions and new self-hosted sessions both landing in the same
`transcripts` table) during a transition rather than a hard cutover.

**What none of the three candidates solve, because it was never a vendor's job:**
consent capture and retention policy are Pulse's own product responsibility no
matter which engine sits underneath. This is worth stating plainly: **closing OD6
does not strictly require self-hosting.** A cheaper, faster parallel path — not
researched in depth tonight, flagged as worth checking — is whether ElevenLabs
itself offers a zero-retention or enterprise DPA/BAA-equivalent tier that would
satisfy the June review's actual concern without an infrastructure project at all.
Bland AI's own public positioning (researched tonight, WebSearch, cited below)
frames self-hosting as *their* answer to this exact problem for *their* customers —
but that doesn't mean it's the only answer for Pulse, only the one the operator
specifically asked to scope.

## 3. Recommendation

**Neither of the two named repos, nor Patter, is a build-ready "self-hosted Bland
AI" for Pulse.** All three solve one layer of a three-layer problem
(speech engines / orchestration / product-integration), and none of the three
ships consent capture or a retention policy — that part is Pulse's to build
regardless of which path is chosen.

**If the operator wants to proceed toward self-hosting** (rather than the
cheaper vendor-DPA check in §2), the real shape of the work is **assembly, not
adoption of a single repo:**

1. **Self-hosted STT:** a local Whisper variant (faster-whisper or whisper.cpp;
   voicebox's own choice of local Whisper validates this is a solved, CPU-viable
   problem at Pulse's likely volume — early alpha, not enterprise call center scale).
   Don't vendor all of voicebox for this; a local Whisper wrapper is a much smaller
   surface.
2. **Self-hosted TTS:** one lightweight engine from voicebox's supported set (e.g.
   Kokoro, commonly cited as CPU-friendly) rather than the whole app.
3. **Orchestration/turn-taking — the real gap, unresolved tonight.** Patter proves
   this layer is buildable open-source, but its phone-carrier design doesn't fit
   Pulse's browser-mic product. Patter's own architecture doc places itself
   "comparable in scope to LiveKit Agents/Pipecat" — both are WebRTC-native
   agent-orchestration frameworks built for exactly Pulse's product shape (browser
   session, not phone call), and neither has been evaluated in this pass. **This is
   the single most important open question before any build decision, not a detail:**
   recommend a follow-up research pass on Pipecat and/or LiveKit Agents specifically,
   before treating self-hosting as scoped.
4. **Consent + retention:** build directly into Pulse's session-creation and
   transcript-storage code, independent of which engine ends up underneath — this
   closes SEC-10 as a side effect regardless of the self-hosting decision.
5. **Migration:** side-by-side is architecturally feasible (§2) — not a hard cutover
   — because the scoring pipeline is already vendor-agnostic text processing.

**Infrastructure reality check, not glossed over:** this fleet (per `orchestra.toml`)
is a laptop + VPS topology today, no dedicated GPU machine. CPU-viable models
(faster-whisper, Kokoro) make a spike feasible without new hardware spend, but a
production self-hosted voice pipeline at real user volume may eventually need a GPU
box — a real cost this document does not size, because sizing it needs the
orchestration-layer decision (§3 item 3) first.

**Rough sequencing, not a build authorization:**
1. Consent + retention fix in Pulse (independent of everything else — do this
   regardless of what happens with self-hosting; closes part of OD6 immediately).
2. Follow-up research spike: Pipecat vs. LiveKit Agents vs. forking Patter behind a
   custom WebRTC transport, for the orchestration layer specifically.
3. Once an orchestration approach is chosen: a timeboxed spike wiring local
   Whisper + a local TTS engine behind it, tested against one real Pulse session
   end-to-end, before committing to a full swap.
4. **Multi-model congruence pass** (per gm's instruction) once a concrete proposal
   exists from steps 2-3 — not before, and not tonight.

## 3a. Follow-up (gm decisions, `msg_ea200df2_23495323`, 2026-09-29 23:11 UTC): ElevenLabs Zero Retention Mode + DPA — checked tonight

Per gm's go-ahead ("cheap, do it tonight if it's just reading docs/pricing" —
did not contact ElevenLabs sales or commit to anything). Verified directly
against ElevenLabs' own docs (`elevenlabs.io/docs/eleven-api/resources/
zero-retention-mode`, `elevenlabs.io/dpa`, fetched tonight), not a summary page.

**Zero Retention Mode (ZRM) — this is a real, additive option, not a dead
end:**
- **Covers exactly the product Pulse uses.** Eligible products explicitly
  include "ElevenAgents: all input and output" — Pulse's Conversational AI
  agent is in scope, not excluded like voice cloning/dubbing.
- **Gating:** Enterprise-tier only, "select enterprise customers,"
  "primarily intended for... healthcare and banking," access subject to
  ElevenLabs' own risk assessment — not a self-serve toggle.
- **Scope limits that matter for enforcement:** API-only (the ElevenLabs
  web UI/playground isn't covered — irrelevant to Pulse, which only uses
  the API); enabled **per-agent via the dashboard**, and for direct API
  calls requires `enable_logging=false` on the request. A single
  misconfigured call path would silently fall back to normal retention —
  worth a code/config review, not just a dashboard toggle, if this path is
  pursued.
- **What ZRM does NOT do:** it governs data on ElevenLabs' side only. It has
  no bearing on Pulse's own `transcripts.raw_transcript` verbatim storage in
  Supabase — §0 items 1 (consent) and 3 (retention) remain Pulse's own
  responsibility regardless of whether ZRM is enabled.

**DPA — tiered, not universal:**
- **Enterprise:** guaranteed 30-day deletion of Customer Content after
  contract termination (extendable only with customer consent).
- **Self-serve (Free/Creator/Pro/Scale):** no contractual deletion
  guarantee — only a *discretionary* right to delete after 180 days of
  inactivity. If Toddito/Pulse is on a self-serve plan today, ElevenLabs
  has no obligation to delete anything.

**What this changes about §2's framing:** ZRM narrows (doesn't eliminate) the
"does the audio leave the operator's infra and sit on a third party's
servers indefinitely" concern — *if* Pulse is moved to Enterprise and ZRM is
correctly enabled per-agent. **Unresolved, needs the operator:** what
ElevenLabs plan is Toddito/Pulse actually on today? If self-serve, ZRM isn't
available without an upgrade, which has a real cost this document doesn't
size. Either way, this is the cheap path gm asked about — real, but it does
not remove the need for the consent + retention fix in §5, since that closes
a gap ZRM structurally cannot (Pulse's own database).

## 3b. Follow-up (gm decisions, item 3): Pipecat vs. LiveKit Agents — orchestration-layer research

The single open question §3 item 3 flagged as unresolved. Researched tonight
(WebSearch + direct doc read); this is desk research, not a working spike —
treat as directional, not final, per §3's own "timeboxed spike... before
committing to a full swap."

| | **Pipecat** (Daily) | **LiveKit Agents** |
|---|---|---|
| License | BSD-2-Clause, including its own turn-detection model — no framework lock-in via the model | Apache-2.0 |
| Transport | Transport-agnostic by design — "bring your own" (WebSocket, Daily, LiveKit, Twilio/SIP) | Built specifically on top of LiveKit's own WebRTC SFU; using another transport is possible but uncommon |
| Self-hosting operational burden | You run your own processor pipeline on your own compute — no separate media-server component required for a plain WebSocket/browser-mic session | Realistic but heavier: self-hosting means also running TURN + the SFU + telephony peers, not just agent logic |
| Fit for Pulse's product shape (single respondent, browser-mic, no phone number, no multi-party) | Good fit — Pulse doesn't need LiveKit's native SIP/telephony/multi-party/video, so that machinery would be unused weight | LiveKit's actual differentiators (native phone numbers, multi-party, video) are exactly what Pulse's product does *not* need |
| Maturity (mid-2026) | ~13.4k GitHub stars (Jul 2026), actively developed | ~11.4k GitHub stars (Jul 2026), actively developed |

**Directional recommendation:** Pipecat is the better-fit candidate for
Pulse specifically — transport-agnostic (no obligation to also self-host a
WebRTC SFU/TURN stack just to run a browser-mic session), permissive
license with no model carve-out, and its telephony-optional design matches
"we don't have phone numbers" better than LiveKit's SIP/multi-party-native
architecture, which would be unused surface area for this product. This is
**not** a final decision — §3's own next step (a timeboxed spike wiring one
real Pulse session end-to-end) is what actually validates it; tonight's
pass narrows the field from "unresolved" to "Pipecat first, LiveKit as
fallback if the spike surfaces a Pipecat-specific blocker," not more than
that.

## 4a. Follow-up (gm decisions, item 1): Consent capture + retention policy — technical spec (DRAFT, NOT ADOPTED)

Per gm's explicit instruction: this is a ready-to-approve draft for the
operator's morning review, **not a live change** and **not built tonight**.
Grounded directly in the real schema/routes (`gh api` against
`brollistika/toddito`, read tonight, same discipline as §0/§2) rather than
invented.

**Consent capture — technical spec:**
- `sessions` table (confirmed columns in use: `client_name`, `client_org`,
  `respondent_role`, `tier`, `status`, `org_id`, etc., set in
  `POST /api/sessions`) gains two new nullable columns: `consent_given_at
  timestamptz` and `consent_version text` (a version string tying the
  record to the exact policy language shown, so a later wording change
  doesn't retroactively reinterpret old consents).
- `POST /api/sessions` (the public, rate-limited session-creation endpoint —
  SEC-06, 20/min/IP, already enforced) currently accepts no consent field
  at all. Add a required `consent: true` boolean to the request body;
  **reject with 400** if missing or false. This is the capture point,
  before any respondent-facing UI even exists in this doc's scope — the
  actual UI copy/checkbox is a product decision, not specified here.
- **Enforcement, not just capture:** the response today always returns
  `vapi_config` (the ElevenLabs agent config the client uses to start the
  call) unconditionally. Gate that: only return `vapi_config` (i.e., only
  let the call actually start) when `consent_given_at` is set on the
  session row. A checkbox the client could theoretically skip past is not
  consent enforcement; refusing to start the recorded call without a
  server-side consent record is.
- This is additive and low-risk to existing sessions — nullable columns,
  new required field on a new-session endpoint only, no change to the
  webhook or scoring path.

**Retention — technical spec + proposed policy language:**
- Enforcement pattern: this codebase already has a cron precedent
  (`/api/cron/cleanup-stuck-sessions`) — a new scheduled job
  (`cleanup-expired-transcripts` or similar) on the same pattern, not a new
  mechanism, that finds `transcripts` rows older than the retention window
  and nulls/deletes `raw_transcript` (the verbatim biometric-sensitive
  field) while leaving `processed_text` and the scoring output intact —
  those are the durable business value and are not raw voice data.
- **Retention window — proposing 90 days as a default, this is the
  operator's call, not derived from any requirement here:** long enough to
  cover a normal engagement's review/dispute cycle, short enough to be a
  real reduction from "forever" (today's actual state). Flag for the
  operator to confirm or change.
- **Proposed policy language (draft, for the operator to edit/approve, not
  to ship as-is):** *"Your spoken responses are recorded and transcribed to
  generate your organizational diagnostic. The raw recording and transcript
  are retained for 90 days after your session and then permanently
  deleted. Your anonymized diagnostic scores are retained as part of your
  organization's report."*
- This does not address **retroactive** consent/retention for existing
  alpha respondents (§4's own flagged gap, unchanged) — a separate,
  one-time decision about already-stored data, not solved by shipping the
  above.

**Explicitly not done tonight, per gm's instruction:** no code written, no
migration run, no policy language published anywhere respondent-facing.
This is the draft for the morning report only.

## 5. Morning follow-up (gm, `msg_ac263acf_54745135`, 2026-09-30 07:52 UTC): SWOT — build on existing internal repos vs. custom-built from open-source

The operator responded to this doc with new information: there's existing
internal work already partway toward a self-hosted voice agent. Verbatim:
"we had a bunch of pipecat logic in there already there we mostly there 80%
of the [way]... one thing that was missing however is that we were still
using cloud rather than self hosting pipecat and that we had no UI
functionality that these other products are using." Verified against real
source in three `brollistika`-org repos (bshr, `gh api` + clone, not
README/manifest inference) rather than taken at face value in either
direction — same discipline as §0/§2's original verification.

**What the three repos actually are, confirmed by cross-reference, not org
proximity:** `substrate` is the backend/orchestration platform — its own
README: "The API for deploying agents that execute SOPs across messy human
channels — WhatsApp first, voice via Pipecat, anywhere via polymorphic
channel adapters." `kokoro-frontend` is a client + admin UI that calls
`substrate`'s `infra/pipecat-cloud/bot.py` by path — confirmed via its own
webhook route comment. **`kokoro-svc` is NOT a TTS service** — its own
docker-compose comment labels it "Kokoro-svc (Python/Flask astrology IP —
natal readings)." The "Kokoro" name collision with the open-source
Kokoro-TTS model (§1's voicebox comparison) is coincidental; this is an
unrelated astrology-companion product (hardcoded default persona "Luna,
astrology guide" in both `bot.py` and `pipecat_server.py`). Flagging plainly
so the two Kokoros are never conflated going forward.

**Verifying the operator's claim, part by part — one accurate, one
understated, one backwards:**
1. *Pipecat orchestration is mostly built* — **accurate, not overstated.**
   `substrate/infra/pipecat/pipecat_server.py` (407 lines) and
   `infra/pipecat-cloud/bot.py` (318 lines) both have genuine `Pipeline([...])`
   construction, custom `FrameProcessor` subclasses, Silero VAD, Smart-Turn
   detection, and real transport wiring — `LiveKitTransport` (self-hosted) in
   one variant, `DailyTransport` (Pipecat Cloud) in the other.
   `kokoro-frontend`'s "pipecat" code (`usePipecatCloudEngine.ts`,
   `usePipecatEngine.ts`, 2164 lines) is real but client/session-proxy side
   only — no `Pipeline` construction, no Python backend in that repo.
2. *Cloud vs. self-hosted* — **accurate for what's LIVE today, but
   understates existing groundwork and misses the part that actually
   matters for OD6.** The live session route
   (`kokoro-frontend/api/voice/pipecat-cloud/session/route.ts`) hits
   `api.pipecat.daily.co` — Pipecat Cloud, with the route's own comment
   noting "self-hosted substrate GCP deploy is not part of this path." But a
   self-hosted transport variant **already exists and is wired**: `substrate`'s
   docker-compose runs a real self-hosted `livekit/livekit-server:latest`,
   and `pipecat_server.py` already joins it. So this is closer to "point the
   live path at the already-built self-hosted variant" than "build
   self-hosting from scratch." **The gap the claim doesn't name, and the one
   that actually matters:** STT/TTS are **100% cloud APIs in every variant
   checked** — Groq/Deepgram/OpenAI for STT, ElevenLabs/Cartesia/OpenAI for
   TTS. Every "whisper" reference in all three repos is the cloud-hosted
   Groq/OpenAI API, never a locally-run model. Zero local-Whisper or
   local-TTS code exists anywhere in these three repos. **Self-hosting the
   orchestration layer alone does not close OD6's actual concern** (raw
   audio leaving the operator's infra) — audio still transits Groq and
   ElevenLabs/Cartesia regardless of where the orchestrator runs.
3. *No UI functionality* — **backwards.** `kokoro-frontend` has MORE
   relevant UI than voicebox/VoiceStudio/Patter (§1's comparison table) — a
   real 469-line admin/calls dashboard (stat cards, per-session
   latency/token/completion metrics, filterable sessions table, explicitly
   built to "replace the ElevenLabs post-call analytics dashboard"), real
   auth, session dashboards. None of the three originally-evaluated
   candidates ship anything like this. The real gap: this UI is wired to a
   different product's data model (astrology sessions/personas, not
   Pulse's respondent-interview/scoring model) — reuse means porting
   patterns/screens, not dropping in a finished feature.

**Self-hosted Pipecat, confirmed via context7:** Pipecat Cloud is a strictly
optional hosted layer on top of the open-source framework, adding
auto-scaling, container deployment, secrets management, and built-in WebRTC
on top of the same `Pipeline`/`FrameProcessor` code. Self-hosting means
running the identical pipeline as a plain Python process with a
self-hosted transport (WebSocket, Daily, or SmallWebRTC/LiveKit) instead —
matching exactly what `substrate/infra/pipecat/pipecat_server.py` already
does. (Sourced from bshr's research pass; the underlying context7 call
encountered a tool error mid-response that this seat did not independently
re-verify — the finding is consistent with everything else confirmed by
direct source reading above, so treated as reliable, but flagged as the one
claim in this section sourced from a tool call with a caught glitch rather
than raw file contents.)

**One unverified item, stated rather than guessed:** the self-hosted LiveKit
path exists in code and docker-compose — whether it has actually been
run/deployed recently vs. written and left idle is not confirmed; that needs
the operator or a deploy-log check, not repo access.

### SWOT — Path A: build on `substrate` + `kokoro-frontend` (self-host the existing Pipecat path, port the UI, add local STT/TTS)

**Strengths:** Real, working Pipecat orchestration already exists with both
cloud and self-hosted transport variants wired — not a green-field build.
The self-hosted LiveKit transport question (§3b's own unresolved
Pipecat-vs-LiveKit spike) is already answered by internal precedent:
`substrate` runs Pipecat over a self-hosted LiveKit transport today. A more
mature admin/analytics UI already exists than any of the three externally
evaluated candidates. Internal code, same org — no new license to evaluate,
no unfamiliar external codebase.

**Weaknesses:** STT/TTS are 100% cloud in every variant checked — this path
does **not** close OD6's actual concern by itself; the local-audio work is
just as new here as anywhere else. `kokoro-frontend`/`kokoro-svc` are built
for an unrelated product (astrology) — reuse is porting, not adoption, with
real integration risk adapting to Pulse's data model. `kokoro-svc` itself
(the real astrology backend) is likely not reusable at all. The self-hosted
LiveKit path's actual deployment freshness is unconfirmed — possible hidden
bitrot.

**Opportunities:** Substrate's existing self-hosted Pipecat+LiveKit wiring
could stand in for (or substantially shortcut) the timeboxed orchestration
spike §3/§3b already called for. The existing admin dashboard could deliver
OD6-adjacent value (session analytics, audit-trail-adjacent visibility)
faster via porting than building new. Whoever built `substrate` can be
consulted directly.

**Threats:** Scope creep — "build on existing" inviting "also fix the
astrology-specific parts we don't need," inflating timeline past a narrower
build. If the self-hosted LiveKit path is stale, the "80% there" framing
could collapse toward fresh-build-equivalent effort, plus the cost of first
understanding someone else's possibly-abandoned code. No external community
maintaining this code — the team owns 100% of the ongoing maintenance
burden, unlike an open-source dependency.

### SWOT — Path B: custom-built from open-source research (voicebox / VoiceStudio / Patter, per §1)

**Strengths:** voicebox ships **real, working local Whisper + local TTS
code today** — directly closes OD6's actual gap that Path A's existing code
does not. MIT-licensed candidates (voicebox, Patter) carry no legal risk,
unlike VoiceStudio's AGPL-3.0-only. A fresh build avoids inheriting
`kokoro-frontend`/`svc`'s astrology-specific data model.

**Weaknesses:** None of the three ships a working orchestration + local-audio
+ UI combination — still real assembly work across 2-3 separate projects.
No existing UI at all in any of the three, vs. Path A's head start (even
needing porting). Zero team operational familiarity with any of these
external codebases, unlike `substrate`/`kokoro-frontend` which the org
already built.

**Opportunities:** A clean-slate build can adopt §3b's own Pipecat pick
without inheriting any of `substrate`'s astrology-specific coupling. UI can
be built directly against Pulse's actual data model from day one.

**Threats:** Assembling three previously-unconnected open-source pieces from
scratch is a bigger, riskier project than adapting one internal codebase
that already has most pieces wired — even accounting for Path A's own
STT/TTS gap. Dependent on external projects' continued maintenance.

**What this SWOT does not resolve, presented as a comparison for a decision,
not a directive:** neither path is actually "mostly there" for OD6's real
concern — both need comparably new local-STT/local-TTS integration work,
since neither the operator's own repos nor any of the three external
candidates have it today. Where the paths genuinely diverge is
orchestration and UI, and Path A has a real, substantive head start on
both. The strongest-looking option given the facts above, offered as a
recommendation rather than a decision: a **hybrid** — adapt `substrate`'s
Pipecat orchestration and self-hosted LiveKit transport (Path A's real
strength) while sourcing the local STT/TTS layer from voicebox's approach
(Path B's real strength, since Path A has none). This is not a new idea —
it's what §3's original recommendation already called for (self-hosted
Whisper + a local TTS engine + an orchestration layer), except `substrate`
now supplies real, working code for the orchestration piece that was
previously unresolved.

## 6. Converged BSHR/ENG pow-wow (2026-09-30 08:35 UTC): deploy feasibility, economics, branch precedent, and a new orchestration candidate

Operator asked for a "BSHR / ENG pow wow" on the self-host-all-the-things
approach (verbatim, `conv_a4f0c4c733e4`): "so lets do more research around
that again lets do a BSHR / ENG pow ow with the context of our silicon
jungle thesis and give me a SWOT of the self-host all the things approach
... And have it setup for toddito/pulse/etc etc." Two halves, converged here
— engineering feasibility (this seat, sent `msg_4d23893c_56806242`) and
research (bshr: economics, branch archaeology, a new lead).

**Engineering feasibility — the deploy blocker is substantially de-risked,
not still unknown.** Read `substrate`'s infra directly: `DEPLOY.md` is a
complete Coolify runbook (VPS prereqs, secrets, GitHub OAuth, Coolify stack
config, first-run init scripts, health-check verify, auto-redeploy on git
push), and `infra/docker-compose.coolify.yml` is a real production
Traefik/SSL overlay for substrate + LiveKit + Pipecat — not a stub. This org
already runs Coolify successfully in production today, for Pulse's own
deploy (confirmed working tonight). Caveat, not glossed over: this config is
~4 months stale (built 2026-05-24, untouched since 2026-06-07, while
substrate had substantial unrelated feature work since) — real,
unquantified dependency-drift risk. Also found a second, separate,
abandoned attempt: raw GCP VMs (`provision.sh`/`deprovision.sh`, VPC
`voice-agent-vpc`), torn down. Local STT/TTS remains zero-code everywhere,
but wiring it in is a known pattern given substrate's existing
`Pipeline`/`FrameProcessor` architecture — lower risk than building
orchestration from scratch. No fabricated day-count given; recommended next
step is a bounded spike (stand up the existing Coolify config on a real VPS
and see what breaks) to resolve the biggest unknown before committing to a
timeline.

**Branch archaeology (bshr) — independently confirms the operator's account
from a second angle.** A dated, matched pair of self-hosted Pipecat/LiveKit
prototype commits (2026-05-20) exists on `kokoro-svc` and `kokoro-frontend`'s
`feature/11labs-migration` branches — real `Pipeline([...])` construction,
`LiveKitTransport` pointed at a self-hosted LiveKit (`ws://localhost:7880`,
dev-default creds), Silero VAD, custom `FrameProcessor`s. This predates and
is very likely the direct ancestor of what's now properly built out in
`substrate`. Matches the operator's account exactly: hardcoded LAN dev
backend URL, no docker-compose for actually deploying the LiveKit server
itself — ran locally, never deployed. Confirmed via `git grep` across every
branch of both repos for `faster-whisper`/`whisper.cpp`/`kokoro-tts`/
`coqui`/`piper`/`xtts`/`bark`: **zero hits anywhere, on any branch** — this
prototype proves the self-hosted-transport half was tried once; it never
touched local inference.

**Real economics (bshr, corrected figures verified on pull-back by this
seat independently — see [[msg-store-body-file-for-backticks]] memory for
why that check mattered).** Self-hosting can land anywhere from 60% MORE
expensive to 98% CHEAPER than ElevenLabs' $0.10/min — almost entirely a
function of one variable, monthly conversation-minutes, not the technology
choice. Modeled on an RTX 4090-class box (~$0.50/hr, ~$360/month) running
faster-whisper large-v3 + Kokoro-TTS: breakeven is ~3,600
conversation-minutes/month (~120 min/day — a low bar, e.g. 40 three-minute
sessions). Check: $360/month ÷ $0.10/min = 3,600 min/month. Below that
line, a dedicated always-on box costs MORE per minute than ElevenLabs
(paying for idle GPU); above it, savings scale fast — 82% cheaper at 20,000
min/month, 96% cheaper at 100,000 min/month. "Serverless"/scale-to-zero GPU
pricing looks great on paper ($0.0015–0.003/min) but real-time
conversational latency needs a pre-warmed worker — economically the same as
the dedicated-box math, just billed per-second; not a free lunch. **Biggest
open unknown, extrapolated not benchmarked:** ~15–20 concurrent full-duplex
sessions per 4090-class GPU running STT+TTS together — the number that
would most change the picture if wrong. **The single number that decides
whether this saves money or loses it: real current/expected Toddito alpha
conversation-minutes/month, not yet gathered from the operator.**

**New orchestration lead (bshr): Dograh** (`github.com/dograh-hq/dograh`) —
BSD-2-Clause, self-hostable voice platform built on a fork of Pipecat,
one-command Docker Compose, bring-your-own-provider including fully
local/self-hosted STT/TTS, bundled telephony. Real traction: 5.8k stars, #1
Product of the Day on Product Hunt, actively maintained through September
2026 (merged a Pipecat-upstream bump Sept 12). A live, unresolved Pipecat
GitHub issue confirms raw Pipecat itself still lacks an out-of-the-box
self-hosted deployment story — a real, current gap Dograh (and weaker
candidates: AreevAI/flowcat, a Rust reimplementation vendoring no Pipecat
code; an official Pipecat+Nemotron demo repo) are addressing. **Not
independently confirmed as what the operator meant** — couldn't be traced
back to their own source. Ask the operator directly before integrating
against it: flowcat and Dograh would send an integration down very
different paths (Rust vs. Python-fork-of-Pipecat).

**Strategic connection, tying back to §5:** `kokoro-frontend`/`kokoro-svc`
are themselves a named Silicon Jungle hackathon-portfolio venture (per
`docs/BRIEF_cross-venture-synthesis.md`), so building on `substrate` doubles
as a sponsor-story demo, not just code reuse. Dograh specifically, being a
genuinely turnkey self-host story, would demo well at a Buildathon if the
operator wants a sponsorable capability rather than only an internal cost
fix — this is the same internal-vs-public-demo distinction from the
engineering half, now with a concrete candidate attached to the "public"
branch of that fork.

**What this section does not resolve:** whether Dograh is the right
integration target (needs the operator's confirmation first); the true
scope of dependency drift on substrate's Coolify path (needs the bounded
spike to actually run); and — unchanged from §5 — which path
(build-on-existing, custom, or the hybrid) the operator wants to pursue at
all. This is still research/estimation, not a build authorization.

**Real measured economics (gm, via ElevenLabs MCP connector, 2026-09-30
09:16 UTC) — supersedes the "biggest unknown" above with real numbers
instead of a gathered-later placeholder.** Rather than wait on the
operator's own dashboard check, gm pulled real conversation history
directly. Result: **Koherent shows 0 calls in the last 7 days — the
"Koherent owns the shared workspace's default webhook" lead from earlier
in this section pointed at the wrong candidate.** Kokoro-Astrologer
(`agent_9401kgj4fwgsevet9hnnmxbv87bb`) is the real highest-volume agent —
50 calls in the last 7 days. Two real periods measured directly from
conversation history: **March 2026** (the spring peak the operator
mentioned, corroborated by actual "exceeds your quota limit" failures in
the data) — 619 min over 23.5 days = ~791 min/month. **September 2026**
(now) — 172.5 min over 19 days = ~272 min/month. Against the ~3,600
min/month breakeven above: spring peak was 22% of breakeven, current is
7.6%. Blending both rates over the ~7 months since February gives a rough
total-spend estimate of ~$300-400 — this resolves this section's earlier
monthly-vs-total-spend ambiguity: "hundreds of dollars" reads as a
**total**, not a monthly run-rate.

**Superseded by the marginal-cost correction below — that "net" was
correct against a dedicated-GPU-box model, and the operator's own
follow-up correctly challenged that model.**

**Marginal cost on the actual shared VM, not a dedicated box (gm's
challenge, bshr's follow-up, 2026-09-30 09:22 UTC).** The breakeven
analysis above assumes a dedicated new RTX-4090-class box (~$360/month).
That's the wrong model for what's actually planned: the team already
runs (or will run) shared Coolify-hosted VMs for other infrastructure
regardless of this project, so the real question is the *marginal* cost of
adding voice self-hosting to infrastructure already justified for other
reasons — not the cost of standing up a new dedicated box. `substrate`'s
own `DEPLOY.md` states a documented **minimum of 4 vCPU / 8GB RAM**
already, for the stack already running there today (Next.js, Postgres, a
Synapse Matrix homeserver, mautrix-whatsapp bridge, LiveKit, the Pipecat
orchestrator, a pg-boss worker, plus an unrelated Flask app also named
`kokoro-svc` — astrology code, not the TTS model, flagging again so the
two are never conflated). Real current Hostinger pricing: KVM2 (2vCPU/
8GB) $8.99/mo, KVM4 (4vCPU/16GB) $12.99/mo, KVM8 (8vCPU/32GB) $25.99/mo —
tier-up deltas are **+$4/month** (2→4) and **+$13/month** (4→8). Since
substrate's stated minimum sits between KVM2 and KVM4, whatever's actually
running is very likely KVM4 or higher already, meaning RAM headroom for
the ~3-6GB voice-model footprint is probably fine — **CPU headroom is the
real open question**, given how many CPU-bound services already share
those cores. Honest range: **$0/month if headroom exists, $4-13/month if
it doesn't** — not resolvable from research alone; needs the operator to
check real utilization on the live box.

**But this cost improvement is gated on a real, evidence-backed latency
risk, not a free win.** Checked directly, not conceded: the natural-
conversation latency budget is ~700-800ms total; real CPU numbers for
STT+TTS alone (before LLM time) range 500ms-3.5s depending on CPU class,
with a documented first-hand report on a shared/hyperthreaded 8-core box
measuring 3.3 seconds to transcribe a 3.2-second clip — opened as a bug
specifically because it blew the latency budget. Concurrency makes this
worse, not neutral: CPU inference reportedly serializes rather than
parallelizing under load. No first-hand report was found of anyone
running this exact combination (generic x86 cloud vCPU, standard
faster-whisper + Kokoro-TTS, no GPU anywhere) and calling the live
conversational experience good — every positive result leaned on Apple
Silicon's unified memory/ANE or offloaded inference to GPU somewhere in
the pipeline (including Modal's own team, who needed GPU to hit sub-1s and
used CPU only for Pipecat's orchestration layer, not inference).

**Net, framed plainly, not softened in either direction: the cost
argument is much stronger than the dedicated-GPU model implied — plausibly
$0-13/month, not $360/month — but it's gated on a real latency risk nobody
has measured on the actual target hardware.** These two questions turned
out to share the same unknown (how loaded is the box's CPU right now):
if there's real headroom, cost is near-zero and latency is more likely to
land in the acceptable range; if the CPU is already tight, that's the same
condition that produces the bad-latency outcome found above. **Recommended
resolving step: a bounded spike — run faster-whisper-small (int8, not
medium) + Kokoro-TTS on the real target box under simulated 1-3 concurrent
load, and measure real end-to-end latency and CPU headroom directly** —
the same shape as the deploy-feasibility spike already recommended above,
and plausibly the same combined effort on the same box rather than two
separate asks. Not run without an explicit go-ahead — this is real
infra/build work, not research. This does not change the Dograh lead, the
deploy-feasibility read, or the branch-archaeology findings above — only
the economics conclusion, and only by making it conditional rather than
settled in either direction.

## 4. What this document does not decide

- Whether the operator wants to pursue self-hosting at all vs. the cheaper
  ElevenLabs Zero Retention Mode path (§3a) — checked tonight, genuinely the
  operator's call, not resolved here. Depends on an unknown this document
  flags but cannot answer: what ElevenLabs plan Toddito/Pulse is on today.
- Which orchestration framework — §3b's desk research narrows this to
  "Pipecat first, LiveKit as fallback," but the timeboxed spike (§3 item 3)
  that actually validates it has not run.
- Any specific infrastructure spend (GPU box) — not sized, depends on the above.
- Whether to adopt §4a's consent-capture and retention-policy draft as
  written, including the proposed 90-day window and policy language —
  drafted tonight per gm's instruction, explicitly **not adopted**, needs
  the operator's sign-off before either ships.
- AGPL legal risk on VoiceStudio specifically — flagged, not resolved; real legal
  review needed if VoiceStudio's engines are used beyond arm's-length, unmodified use.
- **Retroactive consent for existing alpha respondents.** §0's consent-capture fix
  only covers sessions created after it ships. Whatever's already stored in
  `transcripts.raw_transcript` for real alpha respondents predates any consent
  record — closing OD6 fully means deciding whether that existing data needs a
  retention/deletion pass of its own, independent of the self-hosting question.
  Not sized here; flagging so it doesn't get silently skipped as "handled."
- **Build-on-existing (`substrate`/`kokoro-frontend`) vs. custom-built (§5)** —
  a SWOT, not a decision. Genuinely the operator's call; this seat's own
  read is that a hybrid (§5's closing paragraph) is the strongest option on
  the facts, but that is a recommendation, not what got decided here.
- **Whether to pursue self-hosting AT ALL, economically (§6)** — **measured
  against a dedicated-box model, then corrected against the actual
  shared-VM plan, and now genuinely conditional rather than settled either
  way.** Real conversation history (gm, ElevenLabs MCP connector) puts the
  highest-volume agent at ~272-791 min/month, well under a dedicated
  ~$360/mo GPU box's ~3,600 min/month breakeven — but the real infra plan
  is a shared VM, where the marginal cost is plausibly $0-13/month, not
  $360. That cheaper number is itself gated on a real, evidence-backed
  conversational-latency risk on CPU-only inference that hasn't been
  measured on the actual target hardware. Net: cost argument is much
  stronger than the dedicated-GPU model implied; whether it's actually
  favorable depends on a latency/capacity spike that hasn't run yet. OD6
  compliance remains a real reason to pursue this regardless of how the
  economics resolve.
- **Whether Dograh (§6) is the lead the operator meant** — not independently
  confirmable from repo research; needs a direct one-line check with the
  operator before anyone integrates against it.
- **The true scope of dependency drift on `substrate`'s Coolify deploy path
  (§6)** — unquantified until the recommended bounded spike actually runs.

## GSTACK REVIEW REPORT

**Mode: HOLD SCOPE.** This is a research/spec task explicitly scoped as "not a
build" by both the operator and gm. The job is an honest comparison and a real
recommendation, not a pitch for the most ambitious architecture — three candidates
were evaluated with equal rigor (including one the operator didn't name) rather than
stopping at confirming the two given options.

**Step 0 — Premise Challenge:** the operator's framing ("start with something like
this and make it compliant") assumed one of the two named repos was close to
production-usable. Direct source inspection of both found neither is — this document
says so plainly rather than force-fitting the recommendation to the premise.

**Eng review — Scope Challenge:** the original pass deliberately did NOT resolve
the orchestration-layer choice (§3 item 3) or the ElevenLabs DPA/ZRM check (§2),
flagging both as follow-ups rather than guessing. Both ran tonight as a second
pass (§3a, §3b, §4a) per gm's explicit decisions (`msg_ea200df2_23495323`), each
scoped exactly as instructed: ZRM/DPA as desk research only (no sales contact,
no commitment), Pipecat/LiveKit as desk research only (not the timeboxed spike),
consent/retention as a draft spec only (not built, not adopted). None of the
three exceeded the scope gm authorized.

**Test/verification review:** every architectural claim above is cited to a
specific file, license text, `gh repo view` output, or (for §3a/§3b, tonight's
follow-up) a direct fetch of ElevenLabs' own docs/DPA pages and cross-checked
search results — not inferred from a single summary. §4a's consent/retention
spec is grounded in the real `sessions`/`transcripts` schema and `POST
/api/sessions` route, read directly via `gh api` against `brollistika/toddito`
tonight, not invented. Remaining explicit unverifieds: (a) what ElevenLabs plan
tier Toddito/Pulse is actually on today (§3a — cannot be checked without the
operator's account access), (b) VoiceStudio's own apparent contradiction between
"no fully-local PSTN path" and its documented working Twilio call agent (§1,
still unresolved from the original pass).

**VERDICT: CLEARED as a research/spec document — not a build authorization.**
All three of tonight's follow-ups (§3a ZRM/DPA, §3b Pipecat/LiveKit, §4a
consent/retention draft) stayed within the scope gm authorized. Recommend gm
relay this as: (1) a ready-to-approve consent+retention draft for the operator's
morning sign-off, (2) a real ElevenLabs-plan question the operator needs to
answer (self-serve vs. Enterprise) before ZRM can even be evaluated as an
option, (3) Pipecat as the directional orchestration-layer pick pending the
still-unrun timeboxed spike. Per gm's own instruction, any concrete build
proposal needs a multi-model congruence pass before anyone builds against it —
still true, still not run.

**UNRESOLVED DECISIONS:**
- Self-host at all, or pursue ElevenLabs Zero Retention Mode (§3a) — blocked on
  an unknown this document can't resolve: current ElevenLabs plan tier.
- Approve, edit, or reject §4a's consent-capture spec and retention policy
  draft (including the proposed 90-day window and policy language) —
  operator sign-off required before any of it ships.
- Confirm Pipecat as the orchestration framework, or require the timeboxed
  spike to run before treating §3b's desk-research pick as sufficient — §5's
  morning follow-up found real internal precedent (`substrate`) that could
  shortcut this spike, but hasn't replaced it.
- Build-on-existing vs. custom-built vs. hybrid (§5) — a SWOT was produced,
  not a decision; this seat's own read favors the hybrid named in §5's
  closing paragraph, offered as a recommendation only.
- GPU infrastructure spend, once the orchestration layer is chosen.
- Is VoiceStudio's AGPL license (§1) acceptable for even component-level,
  unmodified, arm's-length use, or does its legal risk rule it out entirely
  regardless of technical fit?
- Whether `substrate`'s self-hosted LiveKit/Pipecat path (§5) has actually
  been run/deployed recently or was written and left idle — not
  checkable from repo access alone.
