# HANDOFF — builder-3 → successor

Supersedes the 2026-10-04 keonda-arc handoff (`090aa77`) entirely. That arc is
closed; this session is **toddito**.

## current_goal

Land the toddito backlog cleanly via the full gstack process. PR #9 (report
depth / PLAN §14) is **merged**. PR #2 (Client Relationship facet) is
review-APPROVED with its migration blocker cleared and is waiting on `test`.
One **live blocker** of mine sits on another seat's PR #1 resolution.

## phase_state

- **plan_ref:** `docs/PLAN_toddito-backlog-merge-sequencing.md` (orchestraos),
  plus `docs/PLAN_toddito-engineering.md` §14 for the shipped work
- **phase:** backlog merge, 2 of ~6 PRs landed by the fleet; my two assigned
  PRs are 1 landed / 1 awaiting a gate
- **next_gate:** `test` runs PR #2 end-to-end against the now-live migration
  034. Nothing merges without review APPROVE **plus** test pass.

## working_state

Two worktrees, both clean, both pushed, nothing uncommitted:

- `~/conductor/workspaces/builder-3-report-depth` — PR #9, **MERGED**
- `~/conductor/workspaces/builder-3-consulting-communicator` — PR #2, open

I have merged nothing myself. Under the current pipeline no seat merges its own
work: builder → independent `review` → `test` → `ship` lands.

## next_3_actions

1. **Confirm the PR #1 prompt-prose blocker is closed before it lands.**
   - `first_effect`: {kind: `grep`, target: `src/lib/scoring/prompt.ts` on the
     PR #1 resolution branch, check: `zero occurrences of the old wire-key name
     remain in PROSE instruction lines, while the output-schema block uses the
     new name consistently`}
   - If prose and schema disagree, the §14 volume rules name a key the model is
     no longer asked to emit, the scaling silently stops binding, and CI stays
     green because no test reads prompt prose.
2. **Chase `test` on PR #2.** Its risk is not unit coverage (192 pass, tsc and
   lint clean). It is that nothing has exercised the real data path: the visual
   pass stubbed the Supabase client and the transcript→responses model call has
   zero test references. Migration 034 is applied, so a genuine end-to-end
   self-check is possible for the first time.
3. **Collect the post-fix arm of the §14 measurement** once Full sessions
   accumulate on the new prompt. The pre-fix baseline is already collected and
   the null held. Honour the pre-registered rule below or the result is
   meaningless.

## decisions

Carrying guards and lane boundaries. Each has a rationale because the rationale
is the part that transfers.

1. **Read the dated artifact, never the freshest message.** — Two seats were
   operating off different undocumented restricted-file lists; what resolved it
   was a committed, dated doc that outranks any thread. I was one command from
   reverting the only authorized edit in my own PR, acting on an instruction
   that was sincere and stale.
2. **Treat CONFIRMED-ACTIVE restricted paths as hard walls, even to fix a real
   bug.** — A correct one-line fix of mine is parked behind a human-ownership
   answer. Reverting it cost a day; shipping it would have crossed a boundary
   that is not mine to decide. The fix is recorded in the repo so waiting is
   cheap instead of lossy.
3. **Say the SHA or path you read.** — Two of us reached opposite, individually
   correct conclusions about one "collision" because neither named which
   artifact we were reading. Applies to claims, not just approvals.
4. **Verify "I was wrong" as hard as "they were wrong."** — I concluded I had
   applied one standard two ways; the peer had been pre-authorized and I could
   not see their dispatch. Self-blame skips verification because it feels safe,
   and it lands an implication on someone else.
5. **Never restate a status learned from prose — reopen the diff.** — Twice in
   one session, opposite directions: I widened a model-scoped rule into a
   per-PR blocker, and called two already-fixed items "still open" by echoing
   a peer's summary of my own work. The first reached an operator as an action
   item.
6. **Ask what the test observes, not whether the code is testable.** — Three
   guards were thoroughly tested while the thing at risk stayed unprotected.
   When the vulnerable artifact is a call site, extraction moves the gap and
   adds a green that implies coverage.
7. **A constant the brief tells you to loosen may be a product boundary.** —
   Following the dispatched wording literally would have shipped two
   regressions of one kind. Grep the constant's neighbours before touching it.
8. **Fail closed on an unreadable row when the branch is a security branch.** —
   A Supabase helper reports "absent" and "failed" identically; a condition
   keyed only on data cannot tell them apart.
9. **Remove a risk rather than mitigate it when the mitigation has no owner.**
   — An output cap was raised for free headroom behind a post-deploy action
   nobody could perform. Lowering it deleted the risk instead of monitoring it.
10. **Never edit an applied migration; `supabase/migrations/` is owned.** —
    Standing repo rule, and this project already paid for the lesson once.
11. **Lane boundary: single trunk, never kill services, verify before
    completion.** — I push only to my own PR branches, never to `main`, and I
    report a gate as passed only with the command output in hand.

## open_loops

Reconciled against outstanding msg_store traffic:

- **PR #1 prompt-prose blocker** — raised to the owning seat and gm, not yet
  confirmed closed. **The only thing with my name on it that can still break
  shipped behaviour.**
- **PR #2 awaiting `test`** — review APPROVE stands, migration verified in
  production; the test gate has never run against this PR.
- **Three product decisions with the operator** on the facet: report privacy
  default, a single-item facet carrying a sixth of the headline, and gate
  strictness. None are bugs; all change what the headline number means.
- **A one-line copy fix parked** behind the human-ownership answer for a
  CONFIRMED-ACTIVE path. Recorded in the repo so it survives the revert.
- **The §14 behavioural claim is unverified** and the operator declined a key
  "at this stage." The production-data route needs no key and is the live path.
- **An advisor WARN** on a definer function with an unnecessary public EXECUTE
  grant. Checked twice, independently, by two seats: not exploitable. One
  REVOKE closes it, in an owned directory.

## file_roots_touched

- `src/lib/scoring/` — prompt, score, persist, contract + their tests
- `src/lib/transcript/` — richness measurement and the scoring user message
- `src/app/api/webhooks/elevenlabs/` — structured-richness threading
- `src/components/report/` — two lines under a dated, named exception
- `src/app/dashboard/guide/` — tier copy
- `scripts/report-depth-ab.mts`, `scripts/report-depth-fixtures.mts`
- `supabase/migrations/034_*` (PR #2, authored earlier; **do not edit**)
- `docs/DO_NOT_EDIT.md` — recorded the parked fix

## hazards

1. **The prompt-prose/schema mismatch on the unlanded resolution.** It reverts
   a shipped feature silently. No test reads prompt prose, and the behavioural
   check is blocked on a credential the operator declined. Green CI proves
   nothing here.
2. **A staged conflict resolution older than `main`.** This is the specific
   case where "resolve the conflict" and "take the newer side" diverge.
   Applying a pre-merge resolution now reverts live code. `main` moved four
   times in the last hour of this session.
3. **Richness degrades silently on an unrecognised transcript shape.** A real
   production transcript exercises the zero-turn fallback. The fallback is
   correct and deliberate, but it means a richness-driven feature can
   no-op on real data with nothing in the logs saying so.

## measurement rule (pre-registered — do not fit this after the data exists)

The post-fix check is informative **only** if the sample contains at least one
Full session in the top quartile of respondent characters for this project.
Below that, record **"insufficient range,"** not "no effect." The floor means a
thin interview returning the minimum is the prompt working correctly, which is
indistinguishable from the fix having done nothing.

## canary_questions

Answer these in your own words after reading my jsonl. There is no answer key
anywhere, by design.

See the machine block for ids and pointers.

1. One existing production transcript makes both respondent-richness measures
   read zero, and the blank-line split is **not** the cause. What is
   structurally different about that transcript, and which deliberate safety
   behaviour does it therefore exercise on real data?
2. Two seats reported opposite conclusions about the same "collision" and both
   were correct. What distinguished the two things each of us had actually
   read, and why did that make the hazard deferred rather than absent?
3. An output cap was raised and then lowered again within one session. The
   model's own limit was never the deciding factor. What unavailability made
   the raise untenable?
4. I cited a repo requirement as blocking a PR and it did not apply. Name the
   two independent ways the citation was wrong.
5. Three separate guards in this session were well tested while the thing at
   risk stayed unprotected. What did all three share, and why would extracting
   a helper have failed to close the third one?

```json
{
  "current_goal": "Land the toddito backlog via full gstack process. PR #9 (report depth, PLAN §14) MERGED. PR #2 (Client Relationship facet) review-APPROVED with migration blocker cleared, awaiting test. One live blocker of mine on another seat's PR #1 resolution.",
  "phase_state": {
    "plan_ref": "docs/PLAN_toddito-backlog-merge-sequencing.md (+ docs/PLAN_toddito-engineering.md §14)",
    "phase_n": 2,
    "phase_m": 6,
    "gates_passed": ["review APPROVE on both my PRs", "migration 034 applied + independently verified in production", "PR #9 landed by ship"],
    "gates_total": 4,
    "current_step": "PR #2 awaiting the test gate; PR #1 resolution awaiting my blocker being closed",
    "next_gate": "test runs PR #2 end-to-end against live migration 034"
  },
  "working_state": "Two worktrees, both clean and pushed, nothing uncommitted. builder-3-report-depth = PR #9 MERGED. builder-3-consulting-communicator = PR #2 open. I have merged nothing myself; no seat merges its own work.",
  "open_loops": [
    "PR #1 prompt-prose blocker raised to the owning seat and gm, not yet confirmed closed — the only item of mine that can still silently break shipped behaviour",
    "PR #2 awaiting test; review APPROVE stands and migration verified in prod, but the test gate has never run on this PR",
    "Three product decisions with the operator: report privacy default, a single-item facet carrying a sixth of the headline, gate strictness",
    "A one-line copy fix parked behind the human-ownership answer for a CONFIRMED-ACTIVE path; recorded in the repo so it survives the revert",
    "The §14 behavioural claim is unverified; operator declined a key at this stage. The production-data route needs no key and is the live path",
    "Advisor WARN on a definer function with an unnecessary public EXECUTE grant — checked independently by two seats, not exploitable; one REVOKE closes it in an owned directory"
  ],
  "decisions": [
    {"text": "Read the dated artifact, never the freshest message", "rationale": "Two seats held different undocumented restricted-file lists; a committed dated doc resolved it. I was one command from reverting the only authorized edit in my own PR on a sincere but stale instruction."},
    {"text": "Treat CONFIRMED-ACTIVE restricted paths as hard walls, even to fix a real bug", "rationale": "A correct one-line fix is parked behind a human-ownership answer. Shipping it would decide something that is not mine; recording it in the repo made waiting cheap instead of lossy."},
    {"text": "Say the SHA or path you read", "rationale": "Two of us reached opposite, individually correct conclusions about one collision because neither named which artifact we were reading. Applies to claims, not just approvals."},
    {"text": "Verify 'I was wrong' as hard as 'they were wrong'", "rationale": "I concluded I had applied one standard two ways; the peer had been pre-authorized and I could not see their dispatch. Self-blame skips verification because it feels safe, and it lands an implication on someone else."},
    {"text": "Never restate a status learned from prose — reopen the diff", "rationale": "Twice in one session, opposite directions: widened a model-scoped rule into a per-PR blocker, and called two already-fixed items still-open by echoing a peer's summary of my own work. The first reached an operator as an action item."},
    {"text": "Ask what the test observes, not whether the code is testable", "rationale": "Three guards were thoroughly tested while the thing at risk stayed unprotected. When the vulnerable artifact is a call site, extraction moves the gap and adds a green that implies coverage."},
    {"text": "A constant the brief tells you to loosen may be a product boundary", "rationale": "Following the dispatched wording literally would have shipped two regressions of one kind. Grep the constant's neighbours before touching it."},
    {"text": "Fail closed on an unreadable row when the branch is a security branch", "rationale": "The Supabase helper reports absent and failed identically; a condition keyed only on data cannot distinguish them, and the fail-open copy covered three callers including an unauthenticated one."},
    {"text": "Remove a risk rather than mitigate it when the mitigation has no owner", "rationale": "An output cap was raised for free headroom behind a post-deploy action nobody could perform. Lowering it deleted the risk instead of monitoring it."},
    {"text": "Never edit an applied migration; supabase/migrations/ is owned", "rationale": "Standing repo rule with a named owner, and this project already paid for the lesson once."},
    {"text": "Lane boundary: single trunk, never kill services, verify before completion", "rationale": "I push only to my own PR branches, never to main, and report a gate as passed only with command output in hand."}
  ],
  "file_roots_touched": [
    "src/lib/scoring/",
    "src/lib/transcript/",
    "src/app/api/webhooks/elevenlabs/",
    "src/components/report/",
    "src/app/dashboard/guide/",
    "scripts/report-depth-ab.mts",
    "scripts/report-depth-fixtures.mts",
    "supabase/migrations/034_self_check_client_relationship.sql",
    "docs/DO_NOT_EDIT.md"
  ],
  "next_3_actions": [
    {
      "action": "Confirm the PR #1 prompt-prose blocker is closed before that resolution lands",
      "first_effect": {
        "kind": "grep",
        "target": "src/lib/scoring/prompt.ts on the PR #1 resolution branch",
        "check": "zero occurrences of the old wire-key name remain in PROSE instruction lines while the output-schema block uses the new name consistently; a mismatch means the volume rules name a key the model is no longer asked to emit"
      }
    },
    {"action": "Chase the test gate on PR #2 — the risk is the unexercised real data path (stubbed Supabase client, zero test references on the transcript→responses model call), not unit coverage"},
    {"action": "Collect the post-fix arm of the §14 measurement once Full sessions accumulate, honouring the pre-registered top-quartile rule or recording 'insufficient range'"}
  ],
  "hazards": [
    "Prompt-prose/schema mismatch on the unlanded resolution silently reverts a shipped feature; no test reads prompt prose and the behavioural check is blocked on a declined credential, so green CI proves nothing",
    "A staged conflict resolution older than main — the specific case where 'resolve the conflict' and 'take the newer side' diverge; main moved four times in the last hour",
    "Richness degrades silently on an unrecognised transcript shape; a real production transcript exercises the zero-turn fallback, which is correct but logs nothing"
  ],
  "canary_questions": [
    {"id": "cq1", "question": "One existing production transcript makes both respondent-richness measures read zero, and the blank-line split is NOT the cause. What is structurally different about that transcript, and which deliberate safety behaviour does it therefore exercise on real data?", "source_pointer": "jsonl ISO range 2026-10-08T16:25:00Z/2026-10-08T16:32:00Z (production read-only queries and the reasoning immediately following)"},
    {"id": "cq2", "question": "Two seats reported opposite conclusions about the same collision and both were correct. What distinguished the two things each of us had actually read, and why did that make the hazard deferred rather than absent?", "source_pointer": "jsonl ISO range 2026-10-08T15:55:00Z/2026-10-08T16:12:00Z"},
    {"id": "cq3", "question": "An output cap was raised and then lowered again within one session, and the model's own limit was never the deciding factor. What unavailability made the raise untenable?", "source_pointer": "jsonl ISO range 2026-10-08T15:50:00Z/2026-10-08T16:05:00Z"},
    {"id": "cq4", "question": "I cited a repo requirement as blocking a PR and it did not apply. Name the two independent ways the citation was wrong.", "source_pointer": "jsonl ISO range 2026-10-08T15:30:00Z/2026-10-08T15:45:00Z"},
    {"id": "cq5", "question": "Three separate guards in this session were well tested while the thing at risk stayed unprotected. What did all three share, and why would extracting a helper have failed to close the third one?", "source_pointer": "jsonl ISO range 2026-10-08T15:20:00Z/2026-10-08T16:20:00Z"}
  ]
}
```
