# Toddito backlog merge: sequencing + dependency/risk map

- **Requested by:** operator, via gm (`msg_485cc937_60543910`), full gstack
  process (plan/build/review/ship/land-and-deploy/QA), not a rush job.
- **Repo:** `brollistika/toddito` (`~/conductor/repos/toddito`). Current
  `main` = `3921221` (PR #10 merged, 2026-10-06).

## 0. The one finding that changes gm's own framing — checked by diffing actual SHAs, not assumed

gm's dispatch treats two things as separate: **(a)** PR #1
(`fix/report-tone-language`) — "confirmed in scope, proceed" — and **(b)**
splitting the security commits out of `report-redesign-alt-controlroom` into
a **new, top-priority PR** — because that branch "has the real SEC-01/02/03/
04/06/08 fixes from the Oct 1 force-push incident."

**These are not two bodies of work. They are the same nine commits.**

```
git log origin/main..origin/fix/report-tone-language        # 17 commits
git log origin/main..origin/report-redesign-alt-controlroom # 15 commits
```

Both branches share an **identical 9-commit prefix** (same SHAs, byte-for-byte —
not independently-written duplicates):
`3aa164c` (design-system docs) → `000ace5` (SEC-02) → `02cff01` (deps,
3 critical/6 high npm advisories) → `0441068` (SEC-01) → `13c5e7a` (SEC-04) →
`7801010` (SEC-06) → `6014919` (CSO pass) → `f7c3111` (SEC-08 partial) →
`4f83b9f` (SEC-03 partial). PR #1 then adds 8 *tone-language* commits on top;
`report-redesign-alt-controlroom` instead adds 6 *report-redesign-mockup*
commits on top. Same base, same security payload, two different tails.

**This matches what this seat's own memory already predicted weeks ago**
(`[[toddito-main-forcepush-incident]]`: "My branch and PR #1 are equally good
sources — doesn't matter which becomes the actual vehicle") — the prediction
just hadn't been checked against gm's current framing until now.

**Recommendation, not yet actioned — flagging before I act on it, since it
changes what "the actual priority item" means:** don't cherry-pick/split
anything out of `report-redesign-alt-controlroom`. Landing PR #1 (already in
the confirmed-in-scope list) delivers the identical security payload. The
"split the mockups out" instinct is still correct, but the mockups are
already the ONLY thing `report-redesign-alt-controlroom` has that PR #1
doesn't — so the real action on that branch is "hold the mockup commits as
their own non-urgent conversation, same as gm already said," not "build a
new PR from it." If there's a reason to want a *clean, security-only* PR
instead of PR #1's security+tone bundle (e.g. review clarity, wanting the
tone-language changes reviewed separately from the security changes), that's
a real, legitimate alternative — flagging it as a choice for gm/operator,
not deciding it myself.

## 1. What the security backlog actually closes, and what it doesn't — read from `docs/SECURITY.md` on main, not recalled

`docs/SECURITY.md` (current main) lists **12** items, SEC-01 through SEC-12,
all `Status: Open`. PR #1 / `report-redesign-alt-controlroom`'s shared
9-commit prefix closes:

| Item | Closed by PR #1? |
|---|---|
| SEC-01 (prompt injection / citation forgery) | Yes (`0441068`) |
| SEC-02 (unauthenticated score endpoint) | Yes (`000ace5`) |
| SEC-03 (PII leak on elevenlabs-config) | **Partial** — memory: builder-1 read the actual commit, it "strips exactly one dead field... cannot be stripped today without a bigger architecture change," 6-field leak remains |
| SEC-04 (webhook replay) | Yes (`13c5e7a`) |
| SEC-05 (silent unsigned-webhook fallback) | **No** — not in PR #1's commit list at all |
| SEC-06 (no rate limiting) | Yes (`7801010`) |
| SEC-07 (stored XSS via CitationText) | **No** — not in PR #1's commit list at all |
| SEC-08 (cross-session overwrite) | **Partial** — commit says "partial"; memory: builder-2 found a full exploit chain still live even with this commit |
| SEC-09 (`?token=` in middleware) | **No** — not in PR #1's commit list at all |
| CSO (3 unauthenticated cross-tenant routes) | Already fine on main independently (newer `requireWorkspaceAccount`/`requireAdminToken` mechanism) — PR #1's CSO commit is now the OLDER, superseded fix for the same gap, see §2 |
| npm-audit criticals | Yes (`02cff01`) |

**So: landing PR #1 closes 6 of 9 "hold" items outright, 2 more partially**
(SEC-03, SEC-08 — real residual risk, not fully closed), **and leaves SEC-05,
SEC-07, SEC-09 completely untouched.** Whether that's enough to lift PR #7's
self-described "SEC-01-09 hold" is an operator/gm call, not mine — flagging
the exact remainder rather than letting "the security PR landed" quietly
read as "the hold is resolved."

## 2. PR #1 is not a clean merge — real conflicts, some touching security-sensitive routes

GitHub already reports PR #1 as `mergeable: CONFLICTING` (every other open
PR is `MERGEABLE`). Checked why directly: merge-base is `ed0dab0`, **89
commits behind current main**. A dry-run merge (`git merge --no-commit`,
aborted immediately after, working tree confirmed clean) surfaces real
content conflicts in:

```
package.json / package-lock.json
src/app/api/dashboard/route.ts            <- CSO's NEWER fix lives here
src/app/api/engagements/route.ts          <- CSO's NEWER fix lives here
src/app/api/organizations/route.ts        <- CSO's NEWER fix lives here
src/app/api/sessions/[id]/elevenlabs-config/route.ts   (SEC-03)
src/app/api/sessions/[id]/score/route.ts               (SEC-02)
src/app/api/webhooks/elevenlabs/route.ts               (SEC-01/04/05)
src/app/api/webhooks/vapi/route.ts        <- modify/delete; Vapi is GONE
                                              from main, PR#1's version
                                              should just be dropped
src/app/report/[id]/page.tsx
src/components/report/DimensionBars.tsx   <- ALSO touched by PR #8
src/components/report/StageCurve.tsx
src/lib/scoring/score.ts                  <- ALSO touched by PR #9
```

**The real risk, not just rebase tedium:** three of these conflicts
(dashboard/engagements/organizations routes) are PR #1's OLD CSO fix
colliding with main's NEWER, already-verified-fine CSO fix
(`[[toddito-main-forcepush-incident]]`: independently corroborated twice,
guard placement checked, fails closed). Whoever resolves this rebase must
take main's version there, not PR #1's — a careless "take theirs" rebase
could silently downgrade an already-good protection. This is exactly the
kind of thing worth a named reviewer checkpoint, not a mechanical rebase
anyone can run unattended.

**Real sequencing dependency, not hypothetical:** `DimensionBars.tsx`
conflicts with PR #8, `score.ts` conflicts with PR #9. Resolving PR #1's
rebase AFTER PR #8 lands (PR #8 is clean, zero-conflict, trivial) means the
DimensionBars.tsx resolution only has to happen once, against the final
diverging-bar design, not twice. PR #9 is held on its own (gm's two open
questions, §4) — its conflict with PR #1 will need resolving whenever PR #9
clears, by whichever of the two lands second; no way to avoid that one
except by gm's own timeline for PR #9, not a mechanical scheduling choice.

## 3. Recommended sequencing

```
1. PR #8  (fix/dimension-bars-diverging) — clean, 2 commits, MERGEABLE now.
          Land first: trivial, zero risk, and removes one of PR #1's
          rebase conflicts before that work starts.
2. PR #1  (fix/report-tone-language) — THE top-priority item (not a new
          PR from report-redesign-alt-controlroom, per §0). Needs: (a) a
          real rebase onto current main with the CSO-route conflicts
          resolved IN FAVOR OF MAIN'S newer fix, not PR #1's older one
          (b) its own real security + eng review pass, not a rubber
          stamp, given both the size and the "some of this may already
          be superseded" wrinkle (c) ship + land-and-deploy.
          After landing: update docs/SECURITY.md to reflect SEC-01/02/
          04/06 closed, SEC-03/08 partially closed (name the residual
          gap in each), SEC-05/07/09 still fully open — don't let the
          doc go stale the way it did through this whole incident.
3. PR #2  (feat/consulting-communicator) — independent of the above
          (doesn't touch any of PR #1's conflicted files per this pass).
          Can run in parallel with PR #1's rebase/review. Give it the
          dedicated review pass gm asked for given its size (2750/-13
          across 17 files) — already mid adversarial-review per its own
          commit history, confirm that's actually concluded, not just
          in-progress-looking.
4. PR #7  (chore/ctx-index) — mergeable the moment gm/operator decide
          the SEC hold is sufficiently cleared (their call, given §1's
          "6 of 9, 2 partial, 3 untouched" remainder, not purely
          mechanical). One separate, still-open sub-item from the PR's
          own body: no-license provenance question on the vendored
          ctx.py tool, flagged to gm there, not yet answered — check
          before merging even once the SEC gate opens.
5. PR #9  (fix/report-depth-scales-with-interview) — HELD, per gm's own
          explicit instruction, on two sub-questions neither mechanical
          nor mine to resolve (a human-collaborator ownership question I
          have no visibility into, and the ANTHROPIC_API_KEY decision
          already escalated). Not folding this into the blanket go-ahead.
          I don't have a basis to judge whether holding is "too
          conservative" here — I can't see what the human-collaborator
          question actually is from the repo or PR comments; that part
          is gm's own information, not something I can second-guess.
6. report-redesign-alt-controlroom — per §0, nothing to extract (the
          security content is identical to PR #1's). What remains is
          the 6 report-redesign-mockup commits — hold as its own
          non-urgent conversation, exactly as gm said, not folded into
          this merge pass at all.
7. backup/fix-abandoned-session-can-be-rescued — open as a real PR,
          give it a normal review (not a rubber stamp just because it
          looks clean, per gm). Low risk, confirmed by checking the
          merge-base: only 5 commits behind main, a single clean commit,
          should rebase/merge trivially.
8. backup/add-pipecat — open as a PR so it's visible, per gm, but with a
          much sharper risk flag than "bigger and speculative": its
          merge-base is 101 commits behind main (2026-05-20 fork point,
          roughly five months stale) and a straight diff against current
          main shows 262 files changed, +9,355/-32,558 — including what
          would be DELETIONS of two real migrations
          (031_invite_links.sql, 033_referral_cap.sql) and test
          infrastructure (tests/e2e/home.spec.ts, vitest.config.ts) that
          exist on current main but not at this branch's stale base.
          This is not "open a PR" work — it is a real forward-port/
          rebase project to extract just the Pipecat addition without
          reintroducing five months of regressions, and the eventual
          diff will be large and genuinely hard to review properly.
          Confirm "still want this?" with the operator BEFORE any build
          time goes into it, exactly as gm proposed, with this concrete
          cost attached to the ask rather than a vague size caveat.
9. PR #4 / #5 / #6 (kickoff-related) — PAUSED, per gm, pending the
          operator's answer on which PR the "live events facilitation"
          exclusion actually means. Not touching until that lands.
```

## Addendum 2026-10-08T16:43 UTC — PR #1 SPLITS: SEC-01's validator pulled out for a real rewrite

build found, running main's OWN unit tests against the fully-resolved tree
(the first real exercise of score -> validate -> persist all week): PR #1's
SEC-01 zod validator requires `strategy.risk`/`strategy.predictability` — a
shape main abandoned on 2026-07-18 (main's own `types.ts` labels it
"Pre-2026-07-18... Old report"). Main's real output is
`risk_appetite/horizon/innovation/concentration/orientation`. **If PR #1
landed as-is, every real scoring run throws — not degraded, scoring stops
working entirely.** Compounds with an earlier-found `focus_evidence` gap
in the opposite direction (validator omits a field main now requires;
zod silently strips it). Not a merge artifact — PR #1's branch alone
typechecks clean because it carries its own stale `types.ts`.

**gm approved the split (confirmed, not my call alone):** lands
independently now — the npm-audit dependency fix (restores CI's Build
job), SEC-04/SEC-06/SEC-08 (don't touch `validate.ts`), the Plotly 3->4
bump, the tone-rename work (6 ReportView.tsx strings; demo/page.tsx's 4
strings explicitly DROPPED per the Cassandra-ownership boundary, even
though build's tree already has them correct — authorization, not
accuracy, gm's own words). **Pulled out for separate, properly-scoped
work:** SEC-01's validator needs an actual rewrite against main's current
contract, not a rushed fix inside this rebase.

**Also found, priority, not yet resolved as of this addendum:** PR #1's
resolved `prompt.ts` drops BOTH of PR #9's just-landed OUTPUT VOLUME
sections (304 lines vs main's 422) — if unresolved, landing PR #1 would
silently undo PR #9's report-depth fix the same night it shipped. Same
collision family as score/route.ts and ReportView.tsx, bigger stakes
(reverts a feature, not just a guard). Dispatched to build as priority.

## Addendum 2026-10-08T13:45 UTC — build's PR #8 findings: main's CI is already red, PR #1 vs PR #11 collision

**Main's CI has been red since at least Oct 1, independent of anything in
this batch.** build compared failure profiles across `3921221`, `1731e66`,
and their own PR #8 merge commit (`1cadf4c`): identical pattern each time —
Lint/Type-Check, Unit Tests, Tier Default Regression, and Scoring Model Pin
all pass; only **Security Scan** fails (`npm audit`: 10 vulnerabilities, 3
critical/6 high/1 moderate). Because Security Scan fails, **the Build job
is skipped** — main hasn't had a successful CI Build since at least Oct 1.
PR #8 introduced nothing new here; confirmed identical before/after.

**This gives PR #1 a concrete, checkable success criterion, not a generic
one:** PR #1's `02cff01` commit is the npm-audit-criticals fix. After PR #1
lands, Security Scan should pass and Build should stop being skipped —
build is verifying exactly that, not just "tests pass."

**No deploy observability — expected, not a new gap.** CI has no deploy
job; Coolify (which watches main) isn't reachable from here, consistent
with [[project_toddito-deploy-topology]]'s standing finding. Landing to
main is verifiable; actual deploy isn't, without Coolify access or a live
HTTP check against the running app.

**Real sequencing collision, not in the original plan (written before PR
#11 existed): PR #1 and PR #11 (fix-sec09-sec05-remediation) both touch
`src/app/api/webhooks/elevenlabs/route.ts`.** PR #11's SEC-05 fix and PR
#1's SEC-01/04 fixes are almost certainly different hunks of the same file,
not a competing redesign, but whichever lands first makes the other's
rebase stale on that one file. **Resequenced: PR #11 lands first** (same
reasoning as landing PR #8 before PR #1 — small, nearly-clean, removes a
conflict before the big rebase locks in), then PR #1 rebases against that
final state so the webhooks/elevenlabs/route.ts hunk gets resolved once,
not twice. Told build to hold PR #1's rebase before pushing anything until
PR #11 clears.

**Shared-checkout hazard, correctly avoided:** build noticed `~/conductor/
repos/toddito` (the shared working directory multiple seats use) currently
has `fix-sec09-sec05-remediation` checked out — live work in progress — and
is doing PR #1's rebase in an isolated worktree instead of touching that
checkout, consistent with [[feedback_shared-working-directory-branch-hazard]].

## Addendum 2026-10-08T15:38 UTC — 2 real cross-PR collisions found by review in PR #1's staged resolution

**Collision 1 — ReportView.tsx's "05" SectionHeader, PR #1 vs PR #9, same line,
different attributes, neither PR alone produces the right merge.** main:
`kicker="Clinical observations" title="Three things worth saying out
loud"`. PR #9 changes `title` only (to "Observations worth saying out
loud", for the up-to-6-observations fix). PR #1 changes `kicker` only (to
"What stood out", the tone fix). **Correct merge takes BOTH: `kicker="What
stood out" title="Observations worth saying out loud"`.** Taking either
side wholesale silently reverts the other PR's customer-visible fix — in
PR #1's direction specifically, that means restoring "Three things" over a
report that can now return up to six observations. Will bite whichever of
PR #1/PR #9 rebases second against the other's landed state. Relayed the
correct values to both owners (build, builder-3) so neither has to
re-derive it.

**Collision 2 — PR #13 is a strict subset of PR #1's score/route.ts
resolution (requireAdminToken only, no SEC-06 rate limit) — same finding
build already made, review adds the order risk.** If PR #1 lands first and
PR #13 then merges carelessly, taking PR #13's side would silently DROP
the rate limit while keeping the auth — invisible to any test checking
only for a 401. Action: verify PR #1's final merged score/route.ts
explicitly contains BOTH `requireAdminToken` and the rate-limit call once
it's ready to land — don't infer it from a clean merge.

**New fast-follow item, not blocking:** `admin-auth.ts`'s own comparison
(`token !== expected`) is non-constant-time, and its own docstring calls
itself "the real gate" vs. middleware's "defense-in-depth" — so PR #11 is
hardening the secondary layer while the primary one stays plain `!==`.
PR #1's SEC-02 fix routes another endpoint through it, raising the stakes
post-landing. Follow-up: reuse PR #11's `timingSafeEqualString` here too.

**Plotly 3→4, sharpened to a concrete visual-verification checklist**
(react-plotly.js's open-ended peer range means `npm install` stays clean
regardless of a v4 regression; PR #8's tests assert the config OBJECT, not
what Plotly renders from it — structurally blind to this class of bug):
1. `xaxis.zerolinelayer: "above traces"` — center line above or behind the
   track? 2. `base: -5` on the track trace. 3. `barmode: "overlay"` — do
   traces still share a row? 4. StageCurve/EcgSparkline render with no
   console errors. All four need a human or screenshot, not a green suite.

## Addendum 2026-10-08T15:35 UTC — rebase trap recorded: score/route.ts post-PR#13

PR #13 (fast-tracked standalone SEC-02 fix, 88 lines) and PR #1's own
hand-merge of the same file (102 lines) are DELIBERATELY different, not
accidentally diverged: PR #1's version is a superset (same guard, PLUS the
SEC-06 rate limit, PLUS slightly different comment wording) — build left
the rate limit out of #13 on purpose since `src/lib/rate-limit.ts` doesn't
exist on main yet (it arrives with PR #1).

**Whoever rebases PR #1 after PR #13 lands must take PR #1's version of
this conflict, never main's** — "main already has the SEC-02 fix, take
main" is the exact wrong, plausible-sounding reasoning that would silently
drop the SEC-06 rate limit on the single most expensive endpoint in the
app. Recording this here specifically because the person doing that
rebase may not be the same one who wrote both versions.

## Addendum 2026-10-08T13:32 UTC — the kokoro-svc Pipecat branch, found and checked

gm relayed the operator's clarification: the working cloud Pipecat version
was on a branch, not main, which is why the first check (default branches
only) missed it. Checked `git branch -a` / `git log --all` / `git grep`
across all branches of all three repos (`kokoro-svc-v1`, `v2`,
`v2-trust-core`) this time, not just main.

**Found it: `feature/11labs-migration`, present (same content) in all three
repos, still-open PR #47 in `kokoro-svc-v2`, never merged.** Real code —
`pipecat_server.py`, `observability.py`, `services/session_store.py`,
a Dockerfile. But:

- The commit itself (`fcd0114`) is titled **"feat(voice): add
  self-hosted Pipecat voice pipeline"** — Groq STT → Anthropic LLM →
  ElevenLabs TTS over **LiveKit WebRTC**, explicitly "a deployable
  alternative to ElevenLabs Conversational AI." Self-hosted, not a managed
  cloud product.
- **Dated 2026-05-20, Mo Sersouri — the exact same day as toddito's own
  `backup/add-pipecat` commit** (`[TUL-51] Support self-hosted Pipecat +
  WebRTC pipeline`, also Mo Sersouri, 56 minutes later). Same author, same
  day, same "self-hosted" framing, both never merged — this reads as one
  exploratory session ported across two sibling repos, not two independent
  proof points.
- No cost data, no production-deployment evidence, no later commits
  referencing results — PR #47 has sat open, unmerged, for ~5 months.

**Not relaying this as "confirmed, the claim was simply wrong" either** —
it's possible "self-hosted" in the commit message refers to the AI-stack
choice (self-managed Pipecat pipeline vs. ElevenLabs's managed
conversational AI), not the hosting infrastructure, and this code could in
principle run on a cloud host rather than physical hardware. What I can
verify: this specific branch exists, is unmerged, and nothing in either
repo shows it was ever run in production or measured for cost. What I
can't verify: whether "proven in production, measurably cut costs" refers
to running THIS code somewhere outside what I can see, or whether the
operator is recalling something that didn't actually happen this way.
Relaying the facts, not resolving the discrepancy myself.

**Other context from gm's message, logged for when this reaches the front
of the queue (not actioned now, correctly last-in-sequence):**
- Latency rationale: Kokoro's own use case (real-time conversational
  voice) is latency-sensitive in a way a diagnostic/assessment tool like
  toddito is not — the operator's read is that whatever made this
  insufficient for Kokoro could still be fine for toddito's actual need.
- Design principle to carry forward, not just for this integration:
  build the AI/voice backend with an easily-swappable-provider
  abstraction from the start — providers compete, sponsorship/free-token
  deals can appear, and retrofitting a swap layer later is more expensive
  than designing for it up front.
- When this reaches the front of the queue: run `/plan-eng-review` and
  `/plan-devex-review` before build starts — operator named both
  explicitly.

## What to tell gm

§0 is the thing to confirm before any build time gets spent: PR #1 and
`report-redesign-alt-controlroom`'s security content are byte-identical
commits, not two separate bodies of work, so the "split a new top-priority
PR out of the controlroom branch" instruction and "land PR #1" are very
likely the same action — recommending we land PR #1 as the security vehicle
and treat the controlroom branch as mockups-only (hold, per gm's own
framing), rather than building a redundant second PR, unless there's a
review-clarity reason to want a security-only PR gm/operator still prefers.
Also: even after PR #1 lands, SEC-05/07/09 stay fully open and SEC-03/08
only partially close — don't let "the security PR landed" read as "the hold
is resolved" without naming the remainder. PR #1 itself needs a real,
security-aware rebase (not a mechanical one) because three of its conflicts
are its own older CSO fix colliding with main's newer, already-verified one —
that resolution needs to take main's side, deliberately, not by rebase
default. Sequencing PR #8 before PR #1 removes one conflict for free.
`backup/add-pipecat` is materially riskier than "bigger and speculative" —
it's a five-month-stale fork whose naive merge would delete two real
migrations and test infra; worth the operator's explicit "still want this"
with that specific cost attached, not a generic size caveat.

---

## Live landing condition on PR #2 — self-check privacy gate (builder-3, 2026-10-08)

**Recorded here because a gate that lives only in a cron job or a message
thread is not a gate.** gm landed PR #2 on the explicit basis that this check
would be *monitored*, not recommended.

**The condition.** `self_check_reports` is **workspace-private, not
person-private**: no `user_id` column, and the only read-site filter is
`report.account_id !== ws.accountId`
(`src/app/dashboard/self-check/[id]/page.tsx:115`). So co-members of one
account can read **and overwrite** each other's self-assessments.

**Why landing was still correct.** The harm is currently unreachable, verified
read-only against production `almworaoyraprsdlkrha`: **1 account, 0 profiles,
0 self-check rows.** There is no second person who could read anything. The
only reader resolves through `ADMIN_TOKEN` to the founder workspace.

**Correction worth keeping: this is NOT a config flip.** Making it
person-private needs a `user_id` column (a migration in
`supabase/migrations/`, CONFIRMED-ACTIVE with a named owner) **plus** a filter
at every read site. Whichever way Todd rules, one of the two answers costs a
migration plus code. Any plan that assumes "land now, flip a flag later" is
built on a false premise.

**The gate, as a query.** Must stay `0` until Todd rules or a `user_id`
column exists:

```sql
select count(*) from (
  select p.account_id from profiles p group by p.account_id having count(*) > 1
  intersect
  select distinct account_id from self_check_reports where account_id is not null) x;
```

The conjunction matters. >1 profile with no self-check rows is harmless, and
self-check rows under a single profile are harmless. Only both together expose
anything.

**Monitoring, and its honest limits.** Durable cron job `94393324`, daily,
runs the query via the Supabase MCP and alerts gm + plan on a non-zero result;
it self-retires if a `user_id` column appears, and reports loudly rather than
silently if the query cannot be evaluated.

Three limitations stated rather than buried:

1. **Recurring crons auto-expire after 7 days.** If Todd has not ruled by then
   it must be re-armed. The gate has no deadline; the cron does.
2. **Cron jobs fire only while a REPL is idle.** If this seat is gone or busy,
   a tick can be missed.
3. **It could not be written as a `scripts/*_watch.py`** in the house pattern,
   because **no script-reachable credential for toddito's database exists** —
   the access lives in the MCP layer, which is available to an agent session
   and not to a standalone script. That constraint applies to *any* future
   toddito monitoring, not just this gate.

**Standing recommendation on the product question** (builder-3 and `review`
independently agree): **person-private.** If workspace-visible turns out to be
wrong, a colleague has already read someone's "weak" and no fix reaches that.
The cheapest moment to add `user_id` is while the table has **zero rows** —
which is now. The decision gets monotonically more expensive with every row
written.
