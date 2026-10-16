# HANDOFF — builder-3 → successor

Authored at soft-handoff, 2026-10-15. Supersedes `eef5338`.

Arc: toddito Client Relationship self-check — the 1987 instrument, its voice
modernisation, and the provenance of the numbers it shows a consultant.

---

## current_goal

No assigned task in flight. The self-check voice arc is **landed and quiet**:
PRs #24, #26, #27 merged, migration 035 applied to production and verified
live. The one lever that remains is an **ops action, not a code change** —
setting `ELEVENLABS_AGENT_ID_SELF_CHECK` — and it is deliberately unset with
both of its preconditions written beside it in `.env.production.example`.

Your likely first real work is whatever `plan` or `gm` dispatches next. Do not
invent work on the self-check: it is in a correct, documented, deliberately
switched-off state, and the remaining risk is behavioural (the operator is
QAing it directly), not code.

## phase_state

- **plan_ref**: `docs/PLAN_toddito-selfcheck-voice-inference.md` (plan owns it;
  I contributed the four gates, the extraction prompt design, and the voice
  agent design)
- **phase**: landed / monitoring
- **next_gate**: GATES 1–5 against a real model and a real ElevenLabs agent.
  **None of them have ever run.** The operator took behavioural validation
  personally. A clean review on any of my PRs is NOT a gate passing, and the
  PR bodies say so in a callout — keep that distinction if anyone summarises
  this work back to you.

## next_3_actions

1. **Reconcile the inbox and the fleet's view of state before touching
   anything.** Four times in my session another seat dispatched work that was
   already done, already blocked, or already superseded — and twice I nearly
   acted on a stale instruction. Read every unacked message, then verify the
   claim in it against the artifact rather than the message.
   - **first_effect**: `{kind: command, target: "python3 msg_store.py inbox --agent builder-3", check: "every message either acked or has a reply sent; for any message asserting a state (merged / applied / verified), the assertion re-checked against git, gh, or Supabase before you act on it"}`
2. **Leave `ELEVENLABS_AGENT_ID_SELF_CHECK` unset** unless the operator
   explicitly sets it, and if asked to set it, check both preconditions in
   `.env.production.example` first. Unset is the off switch, by design, with
   no fallback.
3. **Let cron `182b0af3` run.** It is silent when clean — silence is the
   report, there are no all-clears. If it fires rule 5, it asks a human to
   confirm something a SQL poll cannot see; do not convert that into a claim
   you verified yourself.

## decisions

Carried as guards, not preferences. Each cost something to learn.

| decision | rationale |
|---|---|
| **Single trunk.** One worktree per seat under `~/conductor/workspaces/`, never `/tmp` (a reboot deleted one of mine). Branch from the SHA you will actually stack on, and say which. | A stacked PR whose base moves silently is how a reviewer ends up gating a commit that no longer exists. |
| **Never kill shared services.** Do not restart, reset, or `supabase start`/`stop` anything another seat may hold. Check `docker ps` before trusting "it's running". | Shared containers vanish mid-session; a stuck CLI is not the same as a dead DB. |
| **Verify before completion, and verify by RE-DERIVING.** Never report a result read off your own test file, your own doc comment, or another seat's summary. Run it; print the occurrence, not the count; branch on exit codes, never on a piped summary line. | I pushed a commit with a failing suite because `vitest \| grep && git push` exits with grep's status. A summary line is for reading; an exit code is for branching. |
| **Label inference vs. read, every time, including in your own output.** | I corrected exactly this error in another seat's summary and committed it myself an hour later, in a message to the one seat able to catch it. Catching a pattern in someone else does not immunise you against it. |
| **No self-review, no self-ship.** Builder implements; `review` reviews; `test` tests; `ship` lands. Subagents you spawned yourself are not a review. | Standing fleet norm. |
| **Once a review is in flight: batch, push once, then FREEZE and say so.** Announcing each push is not sufficient. | Four announced pushes made `review` gate two superseded SHAs, and a force-push orphaned the SHA their approve named. |
| **Respect `docs/DO_NOT_EDIT.md` as a hard boundary**, and re-read it rather than recalling it. `supabase/migrations/` and `src/app/report/` and `src/components/session/` are other people's. | I once had a revert staged against the single edit I was actually authorised to make. |
| **Error direction is part of the finding.** An error that overstates how settled something is costs more than one that overstates risk, because confidence does not get double-checked. Fallbacks default to the claim that admits less. | The whole provenance-copy design turns on this. |
| **Prefer a structural constraint to an instruction.** A comment asks; a test forbids. But scope the guard, or it becomes a freeze. | Every guard I shipped this arc took this shape, and each one was scoped with a second control proving the legitimate case still passes. |
| **Focus boundary.** My lane is toddito self-check + scoring. I do not touch admin, report UI, session UI, migrations, or `src/lib/anthropic.ts`. When a fix needs one of those, report it with the exact change named and hand it off. | Two of my best findings this arc were things I was not allowed to fix, and naming them precisely was the whole contribution. |

## open_loops

Reconciled against msg_store as of handoff.

- **Founder-account lockout has no DB guard.** Production: 2 accounts, 1
  founder, **zero** unique indexes or constraints on `is_founder`.
  `founderAccount()` uses `.maybeSingle()` with no `.limit(1)`, so a second
  founder row makes admin login 401 silently. Found by `test` as a local
  artifact; I checked prod and it is latent there too. Dispatched to builder-2
  (migrations are Moe's domain). **Not mine to fix — do not fix it.** Verify
  it got landed rather than assuming.
- **GATES 1–5 never run.** Operator QAing directly. The eval harness (EL
  simulate-conversation + eval criteria) can test the GATE 5 criterion
  with no key and no human — that remains the cheapest unstarted check.
- **The voice branch of the provenance copy has rendered only synthetically.**
  `test` rendered it from a local disposable DB. A real voice-sourced report
  has never existed.
- **`plan` was mid-flight asking gm for authorization to apply migration 035**
  when I told them to stand down (gm had applied it). Confirm they did stand
  down; two seats applying one migration to prod is harmless only by luck here.

## file_roots_touched

- `src/lib/self-check/` — `prompt.ts`, `provenance.ts` (new), `provenance.test.ts` (new)
- `src/app/api/sessions/[id]/elevenlabs-config/` — `route.ts`, `route.test.ts`
- `src/app/dashboard/self-check/[id]/page.tsx`
- `.env.production.example`
- `docs/BRIEF_self-check-voice-input-research.md`, `docs/BRIEF_self-check-extraction-prompt-draft.md`, `docs/BRIEF_self-check-voice-agent-design.md` (orchestraos)
- `.claude/scheduled_tasks.json` (cron `182b0af3`)

## hazards

1. **Setting `ELEVENLABS_AGENT_ID_SELF_CHECK` while the ElevenLabs agent is
   still on its create-time defaults.** The agent exists but runs the wrong
   model/temperature with no `end_call` tool. Those settings are the entire
   mitigation for a recorded production failure in the sibling agent, and the
   self-check has no redundancy to absorb it. The unset variable is the only
   thing holding this, and there is no fallback by design.
2. **Any summary that reports a gate, a render, or a provenance value as
   "verified" when it was inferred or relayed.** This happened three times in
   my session in three different directions, twice by me. Re-derive before
   repeating, and say which of the two you did.
3. **Code merging ahead of its migration.** PR #27 merged the writer of a
   column that did not exist in production; the next submission would have
   failed at persist. It was armed and never fired only because the feature
   had no traffic for six days. Merged ≠ applied ≠ deployed, and only one of
   those three is visible from `gh`.

## canary_questions

Answer in your own words after reading my transcript. There is no answer key
anywhere, by design — the grader checks your words against the transcript.

| id | question | source_pointer |
|---|---|---|
| CAN-1 | One piece of analysis took me four separate attempts before it produced any output. Three ways of running it failed outright and the fourth worked only after a further trick. Describe the failures and what finally got the numbers out. | `jsonl` ISO range `2026-10-08T22:45Z`–`2026-10-08T23:15Z` |
| CAN-2 | Before I concluded the schema had no way to tell the two write paths apart, I tested one existing column as a candidate discriminator and ruled it out. Which column, and what specifically ruled it out? | `jsonl` ISO range `2026-10-15T19:40Z`–`2026-10-15T20:00Z` |
| CAN-3 | On two occasions my own output filtering made a command look like it produced nothing when it had in fact produced a result, and I had to re-run it differently to see the result at all. What were those two commands, and what was each actually producing? | `jsonl` ISO range `2026-10-08T22:45Z`–`2026-10-15T20:40Z` |
| CAN-4 | Late in the session I told another seat that a production row's ratings provenance was "verified." I had not read that column at all. What had I actually queried that made the inference sound, and what event later turned the same claim into a genuine read? | `jsonl` ISO range `2026-10-15T20:40Z`–`2026-10-15T21:10Z` |
| CAN-5 | On two separate occasions I declined to write to the production database, for the same underlying reason. What were the two situations, and what was the reason? | `jsonl` ISO range `2026-10-08T23:00Z`–`2026-10-15T21:00Z` |

---

```json
{
  "current_goal": "No task in flight. The toddito self-check voice arc is landed and quiet: PRs #24/#26/#27 merged, migration 035 applied to production and verified live. The only remaining lever is an ops action, not a code change -- setting ELEVENLABS_AGENT_ID_SELF_CHECK -- and it is deliberately unset with both preconditions documented beside it in .env.production.example. Await dispatch from plan or gm; do not invent further self-check work, because the residual risk is behavioural (operator QAing directly), not code.",
  "phase_state": {
    "plan_ref": "docs/PLAN_toddito-selfcheck-voice-inference.md",
    "phase": "landed / monitoring",
    "next_gate": "GATES 1-5 against a real model and a real ElevenLabs agent. None have ever run. A clean review is NOT a gate passing; the PR bodies state this in a callout."
  },
  "working_state": "All three PRs merged and verified. Migration 035 applied to prod and independently re-checked by me: column exists, NOT NULL, default 'form', CHECK constraint on ('form','voice') present, the one existing row literally reads 'form', zero nulls, zero out-of-domain. Worktrees clean. Cron 182b0af3 armed (daily, silent when clean, 7-day auto-expiry -- re-arm near 2026-10-22 and tell gm). Inbox reconciled.",
  "open_loops": [
    "Founder-account lockout has NO database guard: prod has 2 accounts, 1 founder, zero unique indexes or constraints on is_founder, and founderAccount() uses .maybeSingle() without .limit(1) -- a second founder row silently 401s admin login. Dispatched to builder-2 since migrations are Moe's domain. NOT mine to fix; verify it landed rather than assuming.",
    "GATES 1-5 have never run against a real model or agent. The EL simulate-conversation eval harness can test the GATE 5 criterion with no API key and no human -- cheapest unstarted check.",
    "The voice branch of the provenance copy has rendered only synthetically (test used a local disposable DB). No real voice-sourced report has ever existed.",
    "plan was mid-flight requesting authorization to apply migration 035 when I told them to stand down (gm had already applied it). Confirm they stood down."
  ],
  "decisions": [
    {"text": "Single trunk: one worktree per seat under ~/conductor/workspaces/, never /tmp. Branch from the SHA you will actually stack on, and state it.", "rationale": "A reboot deleted a /tmp worktree of mine, and a stacked PR whose base moves silently is how a reviewer gates a commit that no longer exists."},
    {"text": "Never kill shared services. Do not restart/reset Supabase or Docker containers another seat may hold; check docker ps before trusting 'it is running'.", "rationale": "Shared containers vanish mid-session, and a hung CLI is not the same as a dead database."},
    {"text": "Verify before completion by RE-DERIVING, never by reading your own test file, your own doc comment, or another seat's summary. Print the occurrence, not the count. Branch on exit codes, never on a piped summary line.", "rationale": "I pushed a commit with a failing suite because `vitest | grep && git push` exits with grep's status. A summary line is for reading; an exit code is for branching."},
    {"text": "Label inference vs. read every time, including in your own output.", "rationale": "I corrected that exact error in another seat's summary and then committed it myself an hour later, in a message to the one seat able to catch it. Catching a pattern in someone else does not immunise you against it."},
    {"text": "No self-review, no self-ship. Builder implements; review reviews; test tests; ship lands. Subagents you spawned are not a review.", "rationale": "Standing fleet norm."},
    {"text": "Once a review is in flight: batch changes, push ONCE, then freeze and say so explicitly. Announcing each push is not sufficient.", "rationale": "Four announced pushes made review gate two superseded SHAs, and a force-push orphaned the SHA their approve named."},
    {"text": "Treat docs/DO_NOT_EDIT.md as a hard boundary and RE-READ it rather than recalling it. supabase/migrations/, src/app/report/, src/components/session/, src/app/admin/ are other seats' territory.", "rationale": "I once had a revert staged against the one edit I was actually authorised to make."},
    {"text": "Error direction is part of the finding: an error that overstates how settled something is costs more than one overstating risk, because confidence is not double-checked. Fallbacks must default to the claim that admits less.", "rationale": "The entire provenance-copy design turns on this; unknown provenance must not render as 'you did this'."},
    {"text": "Prefer a structural constraint to an instruction -- a comment asks, a test forbids -- but scope the guard or it becomes a freeze.", "rationale": "Every guard shipped this arc took that shape, each with a second control proving the legitimate case still passes."},
    {"text": "Focus boundary: toddito self-check and scoring only. No admin, report UI, session UI, migrations, or src/lib/anthropic.ts. When a fix needs one of those, name the exact change and hand it off.", "rationale": "Two of my best findings this arc were things I could not fix, and naming them precisely was the whole contribution."}
  ],
  "file_roots_touched": [
    "src/lib/self-check/",
    "src/app/api/sessions/[id]/elevenlabs-config/",
    "src/app/dashboard/self-check/[id]/page.tsx",
    ".env.production.example",
    "docs/BRIEF_self-check-voice-input-research.md",
    "docs/BRIEF_self-check-extraction-prompt-draft.md",
    "docs/BRIEF_self-check-voice-agent-design.md",
    ".claude/scheduled_tasks.json"
  ],
  "next_3_actions": [
    {
      "action": "Reconcile the inbox and the fleet's view of state before touching anything. Read every unacked message, then verify any state it asserts (merged / applied / verified) against git, gh, or Supabase before acting on it -- four dispatches in my session described work already done, already blocked, or already superseded.",
      "first_effect": {
        "kind": "command",
        "target": "python3 msg_store.py inbox --agent builder-3",
        "check": "every message either acked or answered; and for each message asserting a state, that assertion re-checked against the artifact rather than the message"
      }
    },
    {
      "action": "Leave ELEVENLABS_AGENT_ID_SELF_CHECK unset unless the operator explicitly sets it. If asked to set it, check BOTH preconditions documented beside it in .env.production.example first. Unset is the off switch by design and there is deliberately no fallback."
    },
    {
      "action": "Let cron 182b0af3 run. It is silent when clean -- silence is the report and there are no all-clears. If rule 5 fires it asks a human to confirm something a SQL poll cannot observe; do not convert that request into a claim you verified yourself."
    }
  ],
  "first_effect": {
    "kind": "command",
    "target": "python3 msg_store.py inbox --agent builder-3",
    "check": "every message either acked or answered; and for each message asserting a state, that assertion re-checked against the artifact rather than the message"
  },
  "hazards": [
    "Setting ELEVENLABS_AGENT_ID_SELF_CHECK while the ElevenLabs agent is still on its create-time defaults. The agent exists but runs the wrong model and temperature with no end_call tool, and those settings are the entire mitigation for a recorded production failure in the sibling org agent. The self-check has no redundancy to absorb it. The unset variable is the only thing holding this and there is no fallback by design.",
    "Any summary reporting a gate, a render, or a provenance value as 'verified' when it was inferred or relayed. This happened three times in my session in three directions, twice by me. Re-derive before repeating, and say which of the two you did.",
    "Code merging ahead of its migration. PR #27 merged the writer of a column that did not exist in production, so the next submission would have failed at persist(); it was armed and never fired only because the feature had no traffic for six days. Merged, applied and deployed are three different states and only one is visible from gh."
  ],
  "canary_questions": [
    {
      "id": "CAN-1",
      "question": "One piece of analysis took me four separate attempts before it produced any output. Three ways of running it failed outright and the fourth worked only after a further trick. Describe the failures and what finally got the numbers out.",
      "source_pointer": "jsonl ISO range 2026-10-08T22:45Z..2026-10-08T23:15Z"
    },
    {
      "id": "CAN-2",
      "question": "Before I concluded the schema had no way to tell the two write paths apart, I tested one existing column as a candidate discriminator and ruled it out. Which column, and what specifically ruled it out?",
      "source_pointer": "jsonl ISO range 2026-10-15T19:40Z..2026-10-15T20:00Z"
    },
    {
      "id": "CAN-3",
      "question": "On two occasions my own output filtering made a command look like it produced nothing when it had in fact produced a result, and I had to re-run it differently to see the result at all. What were those two commands, and what was each actually producing?",
      "source_pointer": "jsonl ISO range 2026-10-08T22:45Z..2026-10-15T20:40Z"
    },
    {
      "id": "CAN-4",
      "question": "Late in the session I told another seat that a production row's ratings provenance was 'verified'. I had not read that column at all. What had I actually queried that made the inference sound, and what event later turned the same claim into a genuine read?",
      "source_pointer": "jsonl ISO range 2026-10-15T20:40Z..2026-10-15T21:10Z"
    },
    {
      "id": "CAN-5",
      "question": "On two separate occasions I declined to write to the production database, for the same underlying reason. What were the two situations, and what was the reason?",
      "source_pointer": "jsonl ISO range 2026-10-08T23:00Z..2026-10-15T21:00Z"
    }
  ]
}
```
