# Spec: Toddito-at-Kickoff (Events Top-of-Funnel)

- **Requested by:** operator, via gm (msg_2e5e4773_63231626, 2026-10-03) —
  build toward `BRIEF_toddito-keonda-revenue-paths.md`'s recommendation #1:
  run Toddito at Weekender/Buildathon kickoff so Silicon Jungle events
  become the top-of-funnel for the toddito product.
- **What this is:** a concrete, buildable spec, grounded in the actual
  toddito schema and API on `toddito/main` (`1731e66`) — not a new product
  surface imagined from the brief. Hands to build/review/QA after this.
- **Headline finding, checked not assumed:** the mechanism this feature
  needs **already exists end-to-end**. There is close to zero new
  application code required. The real work is a precondition check, one
  small optional copy change, and a QA pass proving the existing pipeline
  holds up under a usage pattern nobody has run through it before — not new
  architecture.

## 1. The mechanism (what's real vs. what would be invented)

Toddito's existing `POST /api/engagements` (`src/app/api/engagements/
route.ts:16-19`) already does exactly what a kickoff diagnostic needs in
one call: **org (upsert, per-account) → engagement → N sessions**, returns
every session ID for link/QR generation. Respondent `email` is optional —
the existing `InviteMintPanel`/`NewSessionLauncher`/`EngagementRoster`
components already support **hand-delivered link + QR, no email round-
trip** (`EngagementRoster.tsx:11`, `qrserver.com` QR generation already
wired in three places). Once enough of an engagement's sessions score, the
existing `POST /api/engagements/[id]/report` triggers group-report
synthesis (`021_group_reports_status.sql`'s `pending→scoring→scored`
lifecycle), viewable at the existing `/group/[id]` page.

**Mapped onto a Weekender team, nothing here is new:**
- One team = one `organization` + one `engagement` ("Weekender Kickoff —
  <date>").
- Each team member = one `respondent`, no email required — show the QR
  code on a screen/printout at the kickoff table, each person scans their
  own.
- Each person does the existing voice-interview flow on their phone, same
  as any respondent today.
- Once scored, the existing group-report synthesis produces one
  team-level read — exactly the "team-level report instead of individual"
  shape the brief flagged as the real question, now answered: it's already
  built, for a different audience (consulting clients), not a different
  mechanism.

**Who creates the engagements:** `POST /api/engagements` is workspace-
gated (`requireWorkspaceAccount`). The founder/operator account already
has **unlimited `max_assessments`/`max_group_reports`** caps
(`025_accounts_tenancy.sql`'s backfill comment: "caps = unlimited") and
`role = 'operator'`. **No new account, no cap override, no new
infrastructure is needed to create engagements at an event** — the
operator's own account can do this today, via the existing admin UI or a
direct API call.

**One real precondition this surfaces, not previously connected:** the
founder-workspace-takeover fix landed `2026-10-01` but the operator has
never actually signed into that account end-to-end — `profiles` is still 0
rows database-wide (see [[toddito-founder-workspace-takeover]]).
**Confirming that sign-in now becomes a load-bearing precondition for this
feature**, not just open housekeeping — if the operator can't get into
`/admin` or `/dashboard`, they can't create a single kickoff engagement
either way.

**Correction, same day (build, post-crash resume, 2026-10-03T11:55Z):**
the single-respondent session→webhook→score→report path was proven for
the **first time this deployment has ever completed it** at 18:39 UTC
today — real session, real transcript, real report, verified against a
seed-vs-real discriminator written before the result was known. Build
explicitly confirmed this does **not** exercise founder sign-in, since the
respondent flow is anonymous — the two preconditions stay separate, as
Section 1 already treats them. This narrows what Section 5's QA plan
still needs to prove: the single-session pipeline itself is no longer in
question; what's still never-run is the **engagement/roster bulk-creation
call, the no-email/QR-only delivery path specifically, and multi-
respondent group-report synthesis** — updated in Section 5.

## 2. What's genuinely new to build (small, scoped, not invented)

1. **Event-context report copy (optional, not blocking v1).** The existing
   group-report synthesis prompt is written for a consulting engagement
   evaluating a client org. A facilitator/team audience at a hackathon
   kickoff may read better with different framing (team dynamics at hour
   0, not organizational health for a paying client). This is a copy/
   prompt change in the scoring layer, not new architecture — scoped as
   its own small PR, reviewable independently, shippable on its own
   branch with zero interaction with the SEC-hold surface (it touches
   prompt text, not auth/webhook/rate-limit code).
2. **Nothing else, for v1.** A bulk "create N teams at once" admin helper
   is a real idea if one-at-a-time engagement creation proves too slow
   across a dozen teams at a live kickoff — **explicitly deferred** until
   a real event actually shows that's the bottleneck, not built
   speculatively against a guess.
3. **The actual build/QA substance is proof, not code:** nobody has run
   org→engagement→session(no-email)→webhook→score→group-report synthesis
   through its full cycle on this exact usage shape (same-day
   creation-to-report cycle, no email channel, multiple concurrent
   respondents from one roster). That's a real QA gap worth closing with
   a synthetic dry run before any real attendee touches it, independent
   of whether the copy change ships.

## 3. The SEC-01-09 hold — the fork gm asked to be surfaced, not routed around

Per gm's constraint: design this so build/review/QA can proceed without
needing SEC-01-09 resolved, and say so explicitly if it genuinely can't.

**Build/review/QA CAN proceed independent of the hold.** Section 2's one
real code change (report copy) touches only prompt text. The QA dry run in
2.3 can run against synthetic respondents in a non-production path,
validating existing `main` behavior under a new usage pattern — it's not a
merge to `main` and doesn't require SEC remediation to execute.

**Going live with real attendees CANNOT be designed around the hold,
because there is no separate code surface to isolate it from.** This
feature's entire mechanism IS the existing session→webhook→score pipeline
— the exact pipeline carrying SEC-02 (unauthenticated score endpoint, no
rate limit — unbounded Claude spend against the event's own budget),
SEC-03 (unauthenticated PII leak on `elevenlabs-config`, now leaking real
attendees' names/orgs instead of test data), SEC-04/05 (webhook signature
freshness + unsigned fallback), SEC-06 (no rate limiting anywhere), and
SEC-08 (a rescored session silently overwrites an already-scored one, no
guard). **Zero new code would change any of that.** Whether this ships
with 0 lines or 500, a real attendee's voice flowing through kickoff hits
every one of those open items at full production stakes.

**The honest framing for the operator, not softened:** this feature is the
first real event where the SEC backlog would be exercised by a live,
non-engineering, operator-watched audience, rather than sitting as a
catalogued risk. Shipping it is what converts those items from a list into
something that happened to real people. That doesn't mean don't build it —
Section 2 shows the build is genuinely small and safe to do now — but it
does mean **SEC-02/03/04/05/06/08 at minimum need remediation (or an
explicit operator-accepted risk call) before any real attendee's session
runs through this at a live event.** Recommend treating this as the actual
trigger that forces the operator's remediation ruling, rather than
something this feature can be sequenced around.

## 4. The two gates from the original brief — still open, still blocking

Carried forward from `BRIEF_toddito-keonda-revenue-paths.md`, explicit per
gm's instruction not to route around either silently:

- **Voice-recording consent/legal question, open 3+ months.** Running this
  on real attendees is a smaller-scale instance of the same question the
  venture doc flagged as the one thing that can't be left out of an
  external pitch. Scale does not remove the question.
- **Paul Schwartz's existing live diagnostic work at these events**
  (`BRIEF_cross-venture-synthesis.md`) — still unconfirmed whether this
  duplicates, complements, or conflicts with that. One direct question to
  the operator settles it; not answered here.

Neither gate blocks Section 2's build/QA work. Both block a real pilot.

## 5. Build/review/QA plan

1. **Build (small, branch-isolated):** event-context copy variant for
   group-report synthesis (Section 2.1). Separately: write and run the
   synthetic dry run targeting specifically what's still never been
   run (Section 2.3's correction) — the single-session webhook→score
   path is already proven as of today, so this dry run exercises
   `POST /api/engagements` → N no-email sessions → simulated webhook
   completions → `POST /api/engagements/[id]/report`, asserting the
   group report renders sensibly for a 3-5 person team roster created
   same-day with no email channel.
2. **Review:** normal gate on the copy-variant PR; the dry-run script
   itself gets reviewed for whether it actually proves the claim (catches
   a repeat of this incident's own "measurement bug that looks like a
   clean result" pattern — assert on real output, not exit code alone).
3. **QA verdict:** does the full cycle hold up under this usage shape?
   Specifically check: engagement creation with zero emails in the
   roster (no code path assumes an email exists), QR-only link delivery
   end-to-end, and whether the existing group-report synthesis output
   reads sensibly for a 3-5 person ad hoc team rather than its usual
   client-org shape (independent of whether the copy variant ships).
4. **Not in this build's scope, explicitly:** anything touching
   SEC-01-09's surface, any real attendee data, any production run. Those
   wait on Section 3/4's gates.

## 6. Open decisions for gm/operator, not answered here

- SEC-02/03/04/05/06/08 remediation ruling — this feature is the reason it
  can't wait indefinitely; still the operator's call, not decided here.
- Voice-consent/legal answer, and the Paul Schwartz overlap question —
  both from Section 4.
- Whether the event-context copy variant (Section 2.1) ships for v1 or the
  existing consulting-engagement copy is acceptable for a first real
  pilot.
