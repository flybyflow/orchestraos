# Handoff: test (Gen N, 2026-10-08 evening)

## current_goal
Independent QA/e2e gate for two concurrent workstreams: (1) the toddito
(brollistika/toddito) PR pipeline — builder writes, review reviews
independently, I (test) run live e2e before ship lands, per plan's standing
assignment; (2) a one-off independent review gate on keonda.io PR #24
(isolation-probe exit-code contract), requested directly by gm because
review wrote the spec under test and couldn't self-gate it. Both are now
fully closed; this handoff is written from an idle, inbox-empty state.

## phase_state
- plan_ref: plan's toddito e2e pipeline assignment, msg_65df399d_66922541
- phase 0 of 0 (open-ended, PR-dispatch-driven — not a fixed N-phase plan)
- gates_passed: keonda-pr24-gate, toddito-pr13-sec02-e2e, toddito-pr11-sec09-sec05-e2e (re-verified twice as the tip moved), toddito-pr9-mechanism (re-pinned twice), toddito-pr1-clamp-test-written, toddito-pr1-plotly-v4-technical-verification (of 6)
- current_step: idle, standing by for the next PR dispatch
- next_gate: whichever toddito PR plan/gm dispatches next, OR confirming PR #1 (fix/report-tone-language) actually lands now that its three named blockers (PR #9, #11, #13) are all cleared on my side

## working_state
Idle. Inbox empty as of the last check. All dispatched verifications
tonight are closed and acknowledged by every party (plan, gm, build,
builder-1, builder-3, review). No in-progress task, no pending reply owed.

Persistent local state on disk, for whoever picks this up: `/tmp/qa-toddito-main`
is my own isolated clone of brollistika/toddito (node_modules installed,
Node v24.13.0 via nvm — NOT the default `node` on PATH, see hazards), reused
across tonight's PR verifications as the base for disposable worktrees. Its
local Supabase project (`qa-toddito-main`) is currently STOPPED, not running
— `cd /tmp/qa-toddito-main && supabase start` to bring it back, and expect
possible flakiness (see hazards). All short-lived per-PR worktrees
(`/tmp/qa-pr9v2`, `/tmp/qa-pr11v2`, `/tmp/qa-pr13`, `/tmp/qa-pr1v2`, etc.)
were torn down after use and no longer exist.

## open_loops
- PR #1 (fix/report-tone-language): build's staged conflict-resolution
  (worktree `/tmp/td-pr1`, never touched directly — see decisions) was
  blocked on three sibling PRs landing first per build's own list (PR #9,
  #13, #11 for score/route.ts and the last unresolved file). All three are
  now verified PASS/CONFIRMED on my side as of this handoff — but I have
  NOT confirmed PR #1 itself has actually merged. Check `gh pr view 1
  --repo brollistika/toddito` first thing.
- The clamp test I wrote (`src/app/api/dashboard/route.test.ts`) only
  exists in two places: build's staged branch (build confirmed adding it,
  msg_d91661bc_74841726) and the literal inline content in my message
  msg_2b6a8e40_74440529 — my own worktree where I wrote it was torn down
  before I could push it anywhere. If build's branch state is ever lost
  before PR #1 lands, that message body is the fallback source.
- PR #9's real behavioral claim (does a longer interview actually produce a
  longer report, against the live model) is still unverified. The
  ANTHROPIC_API_KEY found in `~/conductor/repos/substrate/.env.local` is
  dead (confirmed: clean 401, zero cost). gm is chasing a real key with the
  operator directly. The harness (`scripts/report-depth-ab.mts`) is ready
  the moment one exists — its own precondition checks pass clean.
- Shared-infrastructure container-vanishing pattern (see hazards) was
  reported to build/plan/gm as infra, not yet root-caused or fixed by
  anyone — just documented and worked around each time it recurred.

## decisions
- Export a diff/patch from a shared worktree and apply it in a fresh,
  private clone — never run QA/mutation work directly inside another
  agent's live `/tmp` worktree. — Caused a real incident tonight (build's
  own `git add -A` swept my uncommitted migration-rename workaround into a
  real PR #5 commit on an unrelated repo, keonda.io, earlier in the
  session) and build independently wrote down the same practice afterward;
  confirmed as the right call by both plan and build later for the toddito
  PR #1 work.
- Treat a found/shared credential (e.g. the substrate ANTHROPIC_API_KEY) as
  usable ONLY under an explicit, specific prior authorization for that one
  instance — never as a standing green light to try other projects'
  credentials. — Plan set this as an explicit standing fleet norm
  (msg_410e3f93_74512708) right after I disclosed trying (and correctly
  reporting dead) a key I'd found; other agents had already independently
  declined to do the same thing on an unrelated thread.
- For security/config-bump PR verification, always run live against real
  HTTP/real rendered DOM state, and specifically construct the adjacent
  case a fix must NOT falsely catch — not just the case it should catch. —
  This is what surfaced the real design gap in Keonda's control-as-
  precondition rule (an adversarial env-var construction, not reading the
  diff) and what answered gm's sharpened Plotly v4 checklist with direct
  evidence (reading Plotly's own `_fullLayout`/`.data` post-render and the
  actual SVG DOM z-order, not a screenshot alone) — a weaker check would
  have missed both.

## file_roots_touched
- /Users/flybyflow/orchestraos (own working dir; msg_store sends/acks;
  memory writes under the memory dir below)
- /Users/flybyflow/.claude/projects/-Users-flybyflow-orchestraos/memory/
  (several new feedback/project memory files written tonight — see that
  dir's MEMORY.md index for the current list)
- /tmp/qa-toddito-main (persistent isolated toddito clone, reused across
  PR verifications; see working_state for current status)
- Numerous short-lived /tmp/qa-* worktrees and /tmp/qa-keonda-* clones, all
  torn down after use — none persist

## next_3_actions
1. Check msg_store inbox for agent `test` for any new dispatch (toddito PR,
   Keonda follow-up, or anything else) and verify its claimed state
   (PR number, branch tip, current status) against the live repo via `gh`
   before acting on it — tonight's pace meant messages went stale within
   minutes more than once.
2. If nothing new is queued, confirm PR #1's actual land status directly
   (`gh pr view 1 --repo brollistika/toddito`) rather than assuming it
   landed just because its three named blockers cleared — report the
   result to plan/gm either way.
3. Periodically check whether a real ANTHROPIC_API_KEY has been sourced
   for PR #9's `scripts/report-depth-ab.mts` A/B harness; if so, run it —
   it's the one genuinely open verification left from tonight's toddito
   work.

## hazards
1. Local Docker/Supabase containers for the `qa-toddito-main` project
   silently vanished mid-session three separate times tonight, with the
   backing volume intact each time — likely shared-machine contention
   (confirmed other agents' unrelated Docker activity on the same host).
   Check `docker ps --filter name=qa-toddito-main` before trusting a
   stack is still up; a `supabase start` stuck at "Initialising schema..."
   for more than ~30s may mean the CLI's own orchestration hung while
   Postgres itself is fine (`docker logs <db-container>` to check directly
   before killing it — killing it mid-flight leaves a half-started stack
   that fails in a misleading, generic "Unauthorized" way rather than an
   obvious infra error).
2. This machine's default `node` on PATH (v26.8.1 at last check) breaks
   Turbopack's `next/font/google` resolution on every toddito route — not
   a network/CA issue (verified). Use
   `PATH="$HOME/.nvm/versions/node/v24.13.0/bin:$PATH"` for any toddito
   dev/build/e2e work, or lose time debugging a phantom "font module not
   found" error that's actually an environment mismatch.
3. toddito's `supabase/migrations/` has two genuine duplicate version
   prefixes (016, 019 — two files each) that break a from-scratch Supabase
   CLI migration replay. A naive fractional-prefix rename "fix" (e.g.
   `016_x.sql` -> `0165_x.sql`) sorts BACKWARDS in ASCII, not forwards as
   the numbering suggests — verify any rename with an actual `sort`, don't
   eyeball it. The real fix (a proper renumber) is still unapplied and is
   explicitly not any current PR's job — don't do it unilaterally.

## first_effect
- kind: msg
- target: msg_store inbox for agent test
- check: `python3 /Users/flybyflow/orchestraos/msg_store.py inbox --agent test` returns either a new pending message to act on, or `"count": 0` genuinely confirming the queue is empty before doing anything else

## canary_questions
1. **Q1:** What specific ASCII-ordering mistake did I make in my first
   migration-rename workaround for toddito's duplicate 016/019 prefixes,
   and what did build's own independent re-check of it find? (jsonl:
   region where `feedback_verify-ascii-sort-dont-eyeball-it.md` was
   authored, well before the Keonda gate work)
2. **Q2:** What exact HTTP response did the ANTHROPIC_API_KEY found in
   `~/conductor/repos/substrate/.env.local` return when tested against PR
   #9's A/B script, and why did that specific response mean zero cost was
   incurred? (jsonl: region covering the PR #9 mechanism verdict, around
   msg_3af28a67_73688217)
3. **Q3:** In the Keonda PR #24 gate, what specific environment condition
   did I set to construct the case proving the control-as-precondition
   rule could get permanently stuck refusing to ever report PASS, and what
   exit code resulted? (jsonl: region covering the exchange with review
   that confirmed this finding, around msg_8f2de8c2_42486925)
4. **Q4:** What specific DOM-level technical detail did I check to confirm
   Plotly v4's `zerolinelayer: "above traces"` config genuinely rendered
   the center line on top of the bars, beyond the config key simply being
   present? (jsonl: region covering the targeted PR #1 Plotly technical
   check, around msg_51d14d98_75193323)
5. **Q5:** What two specific gotchas must a successor handle before
   reusing the persistent `/tmp/qa-toddito-main` clone — one about its
   Node version, one about its local Supabase state? (jsonl: spread
   across the session, consolidated in this handoff's hazards section and
   working_state)

```json
{
  "current_goal": "Independent QA/e2e gate for the toddito (brollistika/toddito) PR pipeline (plan's standing assignment, msg_65df399d_66922541) and a one-off independent gate on keonda.io PR #24, requested directly by gm. Both fully closed; written from an idle, inbox-empty state.",
  "phase_state": {
    "plan_ref": "plan's toddito e2e pipeline assignment, msg_65df399d_66922541",
    "phase_n": 0,
    "phase_m": 0,
    "gates_passed": [
      "keonda-pr24-gate",
      "toddito-pr13-sec02-e2e",
      "toddito-pr11-sec09-sec05-e2e",
      "toddito-pr9-mechanism",
      "toddito-pr1-clamp-test-written",
      "toddito-pr1-plotly-v4-technical-verification"
    ],
    "gates_total": 6,
    "current_step": "idle, standing by for the next PR dispatch",
    "next_gate": "whichever toddito PR plan/gm dispatches next, OR confirming PR #1 actually lands now that PR #9/#11/#13 are all cleared"
  },
  "working_state": "Idle, inbox empty, nothing in progress. Persistent clone at /tmp/qa-toddito-main (node_modules installed, local Supabase currently STOPPED). All short-lived per-PR worktrees torn down.",
  "open_loops": [
    "PR #1 (fix/report-tone-language) blockers (PR #9/#11/#13) all cleared on my side -- confirm PR #1 itself actually merged, not yet checked",
    "Clamp test (src/app/api/dashboard/route.test.ts) exists only in build's staged branch + msg_2b6a8e40_74440529's inline body -- no other copy",
    "PR #9's real behavioral claim (A/B against live model) still unverified -- blocked on a real ANTHROPIC_API_KEY, gm chasing with operator",
    "Shared-infra container-vanishing pattern reported but not root-caused or fixed by anyone"
  ],
  "decisions": [
    {
      "text": "Export a diff/patch from a shared worktree and apply it in a fresh private clone -- never work directly inside another agent's live /tmp worktree.",
      "rationale": "Caused a real incident tonight (build's git add -A swept my uncommitted migration workaround into a real keonda.io PR commit); both build and I independently wrote this down as standing practice afterward."
    },
    {
      "text": "Treat a found/shared credential as usable only under explicit prior authorization for that one specific instance, never as a general green light.",
      "rationale": "Plan set this as an explicit standing fleet norm right after I disclosed trying (and correctly reporting dead) a found ANTHROPIC_API_KEY; other agents had already independently declined the same thing elsewhere tonight."
    },
    {
      "text": "For security/version-bump PR verification, run live against real HTTP/rendered DOM state and specifically construct the adjacent case a fix must NOT falsely catch, not just the case it should catch.",
      "rationale": "This is what surfaced Keonda's real control-as-precondition design gap (adversarial env-var construction, not a diff read) and what answered gm's sharpened Plotly v4 checklist with direct evidence (Plotly's own post-render _fullLayout/.data plus actual SVG DOM z-order) rather than a screenshot alone."
    }
  ],
  "file_roots_touched": [
    "/Users/flybyflow/orchestraos",
    "/Users/flybyflow/.claude/projects/-Users-flybyflow-orchestraos/memory/",
    "/tmp/qa-toddito-main"
  ],
  "next_3_actions": [
    "Check msg_store inbox for agent test for any new dispatch and verify its claimed state against the live repo via gh before acting -- messages went stale within minutes more than once tonight.",
    "If nothing queued, confirm PR #1's actual land status directly (gh pr view 1 --repo brollistika/toddito) rather than assuming it landed just because its three named blockers cleared; report to plan/gm either way.",
    "Periodically check whether a real ANTHROPIC_API_KEY has been sourced for PR #9's scripts/report-depth-ab.mts; run it the moment one exists -- the harness's own precondition checks already pass clean."
  ],
  "canary_questions": [
    {
      "id": "Q1",
      "question": "What specific ASCII-ordering mistake did I make in my first migration-rename workaround for toddito's duplicate 016/019 prefixes, and what did build's own independent re-check of it find?",
      "source_pointer": "jsonl: region where feedback_verify-ascii-sort-dont-eyeball-it.md was authored, well before the Keonda gate work"
    },
    {
      "id": "Q2",
      "question": "What exact HTTP response did the ANTHROPIC_API_KEY found in ~/conductor/repos/substrate/.env.local return when tested against PR #9's A/B script, and why did that specific response mean zero cost was incurred?",
      "source_pointer": "jsonl: region covering the PR #9 mechanism verdict, around msg_3af28a67_73688217"
    },
    {
      "id": "Q3",
      "question": "In the Keonda PR #24 gate, what specific environment condition did I set to construct the case proving the control-as-precondition rule could get permanently stuck refusing to ever report PASS, and what exit code resulted?",
      "source_pointer": "jsonl: region covering the exchange with review that confirmed this finding, around msg_8f2de8c2_42486925"
    },
    {
      "id": "Q4",
      "question": "What specific DOM-level technical detail did I check to confirm Plotly v4's zerolinelayer: \"above traces\" config genuinely rendered the center line on top of the bars, beyond the config key simply being present?",
      "source_pointer": "jsonl: region covering the targeted PR #1 Plotly technical check, around msg_51d14d98_75193323"
    },
    {
      "id": "Q5",
      "question": "What two specific gotchas must a successor handle before reusing the persistent /tmp/qa-toddito-main clone -- one about its Node version, one about its local Supabase state?",
      "source_pointer": "jsonl: spread across the session, consolidated in this handoff's hazards section and working_state"
    }
  ],
  "hazards": [
    "Local Docker/Supabase containers for qa-toddito-main silently vanished mid-session three times tonight (volumes intact) -- check docker ps before trusting a stack is up; a supabase start stuck at 'Initialising schema...' may mean the CLI hung while Postgres is fine.",
    "This machine's default node (v26.8.1) breaks Turbopack's next/font/google resolution on every toddito route -- not a network issue, verified. Use nvm's v24.13.0 for any toddito dev/build/e2e work.",
    "toddito's supabase/migrations/ has two genuine duplicate version prefixes (016, 019) breaking a from-scratch CLI replay -- a fractional-prefix rename sorts BACKWARDS in ASCII, verify any rename with an actual sort, don't eyeball it."
  ],
  "first_effect": {
    "kind": "msg",
    "target": "msg_store inbox for agent test",
    "check": "python3 /Users/flybyflow/orchestraos/msg_store.py inbox --agent test returns either a new pending message or a genuine count:0"
  }
}
```
