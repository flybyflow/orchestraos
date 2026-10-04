# SnapEat: iOS Build Plan

- **Requested by:** operator, via gm (msg_ba3fa84f_11870442) — a concrete
  plan for going from the current PWA/web prototype to a real iOS build,
  for gm to dispatch T2 builder sub-agents against.
- **What this is not:** a decision about whether native iOS should happen
  now. That's flagged explicitly below, not resolved here.

## The decision this reverses — flagged plainly, not actioned

Two separate documents on record, not one, both say the same thing: native
iOS was deferred on purpose.

- `decisions.active.json` (2026-09-09): *"MVP = harden the Next.js
  prototype into a PWA... Native iOS deferred to post-retention... Reverses
  the design-review native-first call now that eng review confirmed only a
  web prototype exists."*
- `docs/planning/mvp-architecture.md` (2026-09-08): *"harden the Next.js
  prototype into an installable PWA, reuse the working Claude pipeline...
  Native iOS deferred to post-retention. Supersedes the design-review
  'native iOS first' call."*

Both predate real usage data existing at all. The operator's current
request — build an iOS plan now, dispatch T2 against it — either reverses
that call or means "do both, native work can start now without waiting for
retention data." **Not this seat's or gm's call to resolve.** What follows
assumes the operator wants to proceed; if the answer turns out to be "no,
hold for retention data as planned," nothing below is wasted — it's the
same plan, just starts later.

One thing worth knowing either way: `DESIGN.md`'s own "Project type" field
has said "Native iOS app" since 2026-08-23 and was never corrected after
the very next day's reversal — the design doc and the engineering decision
have quietly disagreed with each other for about a month. Worth a one-line
fix to `DESIGN.md` regardless of what the operator decides on timing.

## The headline finding: most of this is a client, not a rewrite

The entire Claude-powered pipeline — fridge photo → ingredient extraction
→ recipe generation → allergen safety guard → shopping-cart handoff — lives
in Next.js API routes already deployed and working:

| Route | Does | iOS change needed |
|---|---|---|
| `/api/scan` | Claude vision → ingredient list | **None.** Call it over HTTPS from Swift exactly like the web client does. |
| `/api/extract` | Parses the schedule/effort note into structured fields | **None.** |
| `/api/generate` | Schedule-aware recipe generation + the allergen safety guard | **None.** This is the safety-critical part (see below) — do not reimplement it client-side. |
| `/api/cart-link` | Builds the Instacart handoff per missing item | **None.** |
| `/api/transcribe` | Voice note → text | **None.** |

**None of the recipe logic, the allergen safety guard, or the Claude
integration needs to be touched, ported, or re-reasoned-about for iOS.**
A native app is a new front door on the same house. This is the single
most important fact for scoping — it means the iOS build is a real but
bounded UI/platform project, not a second product to build from scratch.

## What genuinely needs native work

1. **The UI itself.** `DESIGN.md`'s own "Native iOS Adaptation" section
   already specs this in real detail — radius-to-`RoundedRectangle`
   mapping, bundled fonts (no runtime fetch), reduced-motion fallback for
   the breathing-pulse loader, 44pt touch targets, VoiceOver labels, one
   56px primary button height. This is unusually ready to build from —
   someone already did the native design spec work in anticipation of
   this exact ask.
2. **Camera capture.** Native `AVFoundation`, not a web `<input
   type=file>`/camera API — per `DESIGN.md`'s own adaptation note. This is
   also the step real usability testers had the most trouble with (one of
   two testers failed it outright, see the companion review doc) — a
   native camera flow is a real opportunity to fix that, but it needs to
   be validated with real testing, not assumed to fix itself just because
   it's native.
3. **Voice input**, if kept: native `Speech` framework instead of Web
   Speech API, per the same adaptation note.
4. **Local storage.** The web app stores `household`, `allergies[]`,
   `prefs`, `todaysMeal`, and `cookedHistory[]` in a typed `localStorage`
   wrapper (`lib/store.ts`). iOS needs an equivalent (`UserDefaults` or a
   small `SwiftData` model — this is a few KB of data, no database
   needed). **One invariant must carry over exactly, not get
   reinterpreted:** allergy reads/writes fail LOUD, never silently reseed
   to an empty list — this is a documented, deliberate safety property
   (`profile-repair-never-reseed`), not an implementation detail free to
   change.
5. **Permission priming.** Camera/mic prompts primed in-context (first
   scan, not cold at app launch) — already specified in `DESIGN.md`,
   needs the native `Info.plist` usage-description strings written to
   match that framing, not the default system copy.

## Two risks that exist regardless of platform — worth fixing before, not after

- **Generation speed.** Both real usability testers felt recipe generation
  was slow. This is a property of the `/api/generate` Claude call itself —
  wrapping it in a native client does not make the call faster. Worth a
  look at caching, a smaller/faster model for a first-pass suggestion, or
  a better loading-state experience (the breathing-pulse loader already
  exists for this) before or alongside the iOS build, not after it ships
  and the same complaint repeats on a new platform.
- **Allergen matching has a known false-positive risk** on short/category
  tokens (e.g. "dairy" matching "dairy-free") — already logged as a real
  finding, not an iOS-specific issue, but worth closing before a native
  build gives this feature to more real users. The architecture doc's own
  layered mitigation (structured ingredient enumeration, pinned vocabulary,
  a curated ontology, fail-closed on unreadable allergy data) is the real
  fix — confirm it's actually implemented, not just planned, before
  iOS multiplies the audience.

## Phased plan, for T2 dispatch

**Phase 1 — SwiftUI shell on the existing API, zero backend changes.**
Build the core loop (Home → Schedule/effort → Scan → Ingredient review →
Planning → The Meal → Shopping gap) as native SwiftUI screens, each
calling the existing deployed API routes over HTTPS. Reuses `DESIGN.md`'s
already-written native adaptation spec directly as the build target — this
phase needs no new design work, only implementation. This is the
highest-value phase to dispatch first: it proves the "client, not a
rewrite" premise for real, and gets to a demoable app fastest.

**Phase 2 — Native camera + local storage.** Real `AVFoundation` capture
replacing the web camera flow (the step most likely to need iteration
given the usability-test finding above), plus the `UserDefaults`/
`SwiftData` local store with the allergy fail-closed invariant explicitly
tested, not assumed.

**Phase 3 — Polish, deferred items made real.** Dynamic Type support
(explicitly deferred in `DESIGN.md` — "post-MVP, flag don't build now" —
revisit once Phase 1/2 are real), full dark-mode token swap (already
specified in `DESIGN.md`, not yet implemented even on web — a native build
is a reasonable place to finally ship it), VoiceOver pass against the
already-written a11y spec.

**Suggested T2 tickets, in dispatch order:**
1. SwiftUI navigation shell + Home/Schedule/Planning screens on the
   existing API (Phase 1 core).
2. Scan + Ingredient review screens, wired to `/api/scan` (Phase 1,
   can run in parallel with #1 once the shell exists).
3. The Meal + Shopping gap screens, wired to `/api/generate` and
   `/api/cart-link` (Phase 1, depends on #1).
4. Native camera capture, replacing the Phase-1 placeholder (Phase 2).
5. Local storage port + allergy fail-closed test (Phase 2, can run
   parallel to #4).
6. Settings + a11y/Dynamic Type/dark-mode pass (Phase 3, last).

## What this plan deliberately does not include

No backend rewrite. No new Claude prompts or scoring logic. No decision on
the color question or the Schedule-screen hybrid-intake question raised in
the companion design review — those are product decisions that affect
both platforms equally and shouldn't be decided twice, once per client.
