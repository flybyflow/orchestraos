# Handoff: builder-3 -> successor
- **Lineage:** builder-3 (soft-handoff, authored 2026-10-04)
- **Working Directory:** /Users/flybyflow/orchestraos
- **Authoritative memory:** `~/.orchestra/memory/builder-3/MEMORY.md` (7 entries). The
  cwd-scoped `~/.claude/projects/.../memory/` store is shared by every seat here and is
  NOT the lineage store — read both, trust neither blindly.
- **State file:** `~/.orchestra/state/builder-3.json` — carries the full per-PR detail
  this document summarises. A resume BLANKS it to a fresh `spawning` record; an empty
  state file is not evidence that nothing was in flight.

## 1. Current Goal & Phase State
- **Goal:** Keonda community-pilot Phase 0 on `flybyflow/keonda.io` (gm,
  `msg_d9ff03fb_35670722`), which widened into a live-only-code preservation sweep and
  then into two cognee cross-tenant security fixes.
- **Plan reference:** `docs/PLAN_keonda-community-manager-pilots.md` (orchestraos,
  `53f5119`). I filed one correction to its data claims — see Decisions.
- **Phase:** ALL DISPATCHED WORK COMPLETE. Five PRs open on keonda.io, none merged.
  Nothing in flight, no uncommitted work, no worktree dirty.
- **Next gate:** the operator's word. Every PR is held deliberately; `review` has
  approved #20 and has an open thread on the others.

## 2. Open Loops
Reconciled against msg_store. Two replies I sent are awaiting a response; everything
else is closed.

- [ ] **Awaiting gm** on `msg_f21234ca_40695261` — gateway check result, PR #23, and my
  recommended deploy sequencing for #22+#23.
- [ ] **Awaiting review** on `msg_853a6932_40719997` — the probe's
  `LEAK / FAIL`-means-cannot-run problem, flagged for them to reconcile rather than me
  editing their file.
- [ ] **FIVE keonda PRs held, none merged:** #19 (bshr's CRE cleanup, not mine), #20
  (pilot wiring + 3 engine fixes, **review APPROVED** at `4eaa2ce`), #21 (all 10
  never-committed live-only files), #22 (cognee read isolation), #23 (sidecar auth).
- [ ] **toddito PR #2** at `c624d6b` — separate repo, still under the operator's
  force-push hold. No merge, no rebase, nothing to toddito main.
- [ ] **MIGRATION owed if #22 lands:** chunks indexed under the old tag become invisible
  to recall. `reconcile_index.py` is the recovery path but someone must RUN it; it does
  not self-heal.
- [ ] **Three toddito product calls** still with Todd: person-private vs
  workspace-private report default (my recommendation: person-private), the one-item
  `expectations` facet, and gate strictness.
- [ ] **Which seating generator owns `seating.json`** is undecided and deliberately so.
- [ ] **Not fixed, flagged:** `_handle_send_hq_prompts` swallows per-recipient
  exceptions AND marks the dinner prompted regardless, so one transient outage
  permanently loses that dinner's HQ moment.

## 3. Decisions & Guards

**GUARDS — these are lane boundaries, not preferences.**
1. **Never run an unknown script to find out what it does.** Read its write surface
   first. I broke this once today and destroyed live tenant data.
2. **Single trunk, own worktree, never the shared checkout.** keonda.io's shared
   checkout is dirty on `feature/sje-111-cre-bdr-epic`; this repo has collision history
   that has already cost the fleet real time.
3. **Never kill or restart a running service.** The cognee sidecar on `:8077` is live
   and was not touched; all testing used a temp store and a spare port.
4. **Verify before completion, and prove the check can fail.** A check that passes when
   its inputs are missing is not a check.
5. **Nothing merges.** Every PR is held for the operator regardless of any review
   verdict.
6. **Focus boundary:** I build and verify. I do not resolve product questions (which
   generator wins, privacy defaults, gate thresholds) and I do not allocate other
   seats' time — that is gm's.

**Decisions with rationale**
- **Isolate the store, not the tenant names, when fixing `events.py --demo`.** The
  demo's whole point is one engine serving two tenants with different vocabularies;
  renaming them would weaken what it proves.
- **Rebind the module global instead of `importlib.reload`.** Run as a script that
  module IS `__main__`, so reloading re-executes the entry block into infinite
  recursion.
- **`capability: interview` for the volleyball tenant, not a new capability.** The
  organize tools register unconditionally, the only runtime branch on capability is the
  CRE send gate (which a community tenant must not inherit), and a new capability means
  editing a file another open PR is already editing.
- **Named the preserved generator for what it does, not its status.** "legacy" would
  have smuggled in a decision gm explicitly said to leave open.
- **Booking is opt-in, not the default.** On principle rather than on the measured size
  of the risk — the whole reason that PR exists is that a default pointed at production.
- **Test `main()`, not `build_plan()`, for a CLI default.** The inner function takes the
  flag explicitly, so a test of it could pass forever while the wiring defaulted wrong.
- **Kept an unreachable guard rather than deleting it,** labelled unreachable, because
  widening the extractor is a plausible future change that would silently reopen a
  patched bug.
- **Corrected the plan's pilot-data claim.** Most of the "real RSVP" evidence was
  written by a demo seeder in a single burst, not organic activity. The plan's
  conclusion survives for a stronger reason than it gave.
- **Reported `review`'s own headline number as wrong** after reproducing it, while
  accepting their conclusion. Their restated framing then beat mine, and I adopted it.

## 4. File Roots Touched
- `~/conductor/workspaces/builder-3-keonda-phase0` — PR #20 (`feat/community-pilot-phase0`)
- `~/conductor/workspaces/builder-3-keonda-preserve` — PR #21 (`chore/preserve-live-seating-script`)
- `~/conductor/workspaces/builder-3-keonda-isofix` — PR #22 (`fix/memory-cognee-read-isolation`)
- `~/conductor/workspaces/builder-3-keonda-sidecar-auth` — PR #23 (`fix/cognee-sidecar-auth`)
- `~/conductor/workspaces/builder-3-consulting-communicator` — toddito PR #2
- `~/conductor/repos/keonda.io` (clone), `~/conductor/repos/toddito` (clone)
- Read-only: `~/.hermes/skills/keonda/{scripts,graph,crm}`, `~/.hermes/plugins/keonda-tools`,
  `~/.hermes/logs`, `~/.hermes/hermes-agent`, `~/.hermes/gateway`
- orchestraos: `docs/HANDOFF_builder-3-next.md`, `~/.orchestra/{state,memory}/builder-3`

## 5. Hazards (top 3, live)
1. **`events.py --demo` is destructive against REAL tenant names** and is only safe on
   `fix/...` branches where PR #20's fix exists. On `main` it still unlinks and rewrites
   the live volleyball and immigration community files. Do not run it outside a branch
   that carries the fix, and never without checking which store it resolves to.
2. **An unauthenticated service is live right now.** Any local process can read any
   tenant's facts from it. PR #23 closes it but is unmerged, so the exposure is open
   until the operator acts. Do not restart or reconfigure the running process.
3. **`~/.hermes` has no backup.** Time Machine would not mount. Recovery today worked
   only because a logging side effect happened to retain what was lost. Treat anything
   under there as unrecoverable before you write to it.

## 6. Next 3 Actions
1. **Check for responses and PR verdicts before doing anything else.**
   - *first_effect:* `kind=command`, `target=gh pr view 23 --repo flybyflow/keonda.io
     --json state,reviewDecision,mergeable`, `check=state == "OPEN"` and
     `reviewDecision` is recorded in the reply to gm. If any of the five PRs has moved
     to MERGED, stop and reconcile before touching anything — a merge changes what
     `main` contains and therefore which hazards above are still live.
2. `python3 msg_store.py inbox --agent builder-3` and answer the two open callbacks if
   gm or review have replied.
3. Only if the operator clears something: for keonda, deploy #22 and #23 **together**
   (a patched sidecar with an unpatched client 401s everything and silently falls back
   to the record). For toddito, if old history is restored, rebase
   `feat/consulting-communicator` BEFORE anyone reads PR #2's diff as my change.

## 7. Grounding Canary Questions (questions only — never write an answer anywhere)
1. **Q1:** During the data-loss incident, recovery was possible because of a side
   effect of normal operation rather than any backup, and the restored timestamps were
   confirmed against a second, independent artifact of a different kind. Name both
   sources and say why the second one mattered more than the first for fidelity.
   *(source_pointer: `jsonl:2026-10-04T17:55Z..18:05Z`)*
2. **Q2:** A verification loop reported success while having copied nothing at all.
   Explain the precise mechanism that produced that false green, and what the rewritten
   check required in order to be incapable of passing vacuously.
   *(source_pointer: `jsonl:2026-10-04T19:05Z..19:20Z`)*
3. **Q3:** A figure describing a seating regression was withdrawn after reproduction.
   Explain what two variables had moved between the two things being compared, and the
   property of the current data that makes the original figure unreachable by any
   algorithm.
   *(source_pointer: `jsonl:2026-10-04T18:30Z..18:45Z`)*
4. **Q4:** Porting a read-side filter without changing a write-side tag would have
   produced a result that looked like a successful fix but was a different failure.
   Describe that failure mode and why the probe used to verify the real fix would have
   caught it.
   *(source_pointer: `jsonl:2026-10-04T18:50Z..19:00Z`)*
5. **Q5:** A committed security probe reports the same alarming prefix and exit status
   in two situations that mean opposite things. State both situations and why the
   direction it fails in makes it unsafe to wire into CI as-is.
   *(source_pointer: `jsonl:2026-10-04T19:00Z..19:10Z`)*

```json
{
  "current_goal": "Keonda community-pilot Phase 0 on flybyflow/keonda.io (gm msg_d9ff03fb_35670722), which widened into preserving all never-committed live-only scripts and then into two cognee cross-tenant security fixes. All dispatched work is COMPLETE; five PRs are open and deliberately unmerged, awaiting the operator.",
  "phase_state": {
    "plan_ref": "docs/PLAN_keonda-community-manager-pilots.md (orchestraos 53f5119)",
    "phase_n": 0,
    "phase_m": 3,
    "gates_passed": ["move-a-seating-generator", "move-b-tenant-config", "move-c-hq-chain-verified", "stray-file-question-answered", "live-only-preservation", "cognee-read-isolation-fix", "sidecar-auth-fix", "gateway-caller-check"],
    "gates_total": 8,
    "current_step": "Nothing in flight. Two msg_store replies awaiting response; five PRs held for the operator.",
    "next_gate": "Operator ruling. No PR merges, and no toddito main activity, without their explicit word."
  },
  "working_state": "Clean. All five worktrees have zero uncommitted changes. Real keonda tenant data verified intact (3 events / 4 RSVPs) and byte-verified against an independent source after the incident. keonda main d13526b and toddito main 1731e66 both untouched. keonda.io has NO .github/workflows, so the --demo self-test battery is the only verification gate that exists in that repo.",
  "open_loops": [
    {"kind": "callback", "to": "gm", "what_for": "gateway check result, PR #23 sidecar auth, and recommended deploy sequencing for #22+#23", "request_id": "msg_f21234ca_40695261", "state": "sent"},
    {"kind": "callback", "to": "review", "what_for": "the isolation probe reports LEAK/FAIL when it means 'cannot run'; flagged for them to reconcile rather than edited by me", "request_id": "msg_853a6932_40719997", "state": "sent"},
    "keonda PR #19 open (bshr's CRE cleanup, not mine) -- do not touch",
    "keonda PR #20 open, review APPROVED at 4eaa2ce, NOT merged",
    "keonda PR #21 open -- all 10 never-committed live-only files, isolation tests as their own landable commit",
    "keonda PR #22 open -- cognee read isolation; verified against the repro probe with its negative control",
    "keonda PR #23 open -- sidecar bearer auth + unused raw-read routes off",
    "toddito PR #2 open at c624d6b, under the operator's force-push hold: no merge, no rebase, nothing to toddito main",
    "MIGRATION owed if #22 lands: chunks tagged under the old scheme become invisible to recall; reconcile_index.py is the recovery path but must be RUN, it does not self-heal",
    "Three toddito product calls still with Todd: person-private vs workspace-private default (recommend person-private), the one-item expectations facet, gate strictness",
    "Undecided by design: which seating generator owns seating.json",
    "Flagged not fixed: _handle_send_hq_prompts swallows per-recipient exceptions AND marks prompted regardless, so a transient outage permanently loses that dinner's HQ moment"
  ],
  "decisions": [
    {"text": "GUARD: never run an unknown script to find out what it does; read its write surface first.", "rationale": "I broke this once today and destroyed live tenant data. Fixing an unrelated bug had repointed a destructive self-test at the real store, and I ran it anyway after having already flagged it as dangerous an hour earlier."},
    {"text": "GUARD: fix the destructive thing FIRST, then the thing that arms it.", "rationale": "Ordering was the whole failure. Ask what a fix makes newly reachable, not just whether the fix is correct."},
    {"text": "GUARD: single trunk, own worktree, never the shared checkout.", "rationale": "keonda.io's shared checkout is dirty on another branch and this repo has collision history that has already cost the fleet real time."},
    {"text": "GUARD: never kill or restart a running service; test on a temp store and a spare port.", "rationale": "The cognee sidecar is live. Every auth test ran on :8099/:8098 with relocated store roots, and the running process was verified untouched afterwards."},
    {"text": "GUARD: verify before completion, and prove the check can fail.", "rationale": "A copy loop reported 'all byte-identical' while having copied nothing, because it compared two identical failures. A check that passes when its inputs are missing is not a check."},
    {"text": "GUARD: nothing merges, and product questions are not mine.", "rationale": "Everything client-adjacent is held for the operator. Which generator wins, privacy defaults and gate thresholds belong to Todd; allocating other seats' time belongs to gm."},
    {"text": "Isolate the store, not the tenant names, when fixing the destructive demo.", "rationale": "The demo exists to prove one engine serves two tenants with different vocabularies; renaming them would weaken what it demonstrates."},
    {"text": "Rebind the module global rather than importlib.reload.", "rationale": "Run as a script the module IS __main__, so reloading re-executes the entry block into infinite recursion."},
    {"text": "capability: interview for the new tenant rather than a third capability.", "rationale": "The organize tools register unconditionally; the only runtime branch on capability is a send gate a community tenant must not inherit; and a new capability means editing a file another open PR is already editing."},
    {"text": "Name the preserved generator for what it does, not its status.", "rationale": "'legacy' would have smuggled in a decision gm explicitly said to leave open -- it is not old, it has a different objective."},
    {"text": "Booking is opt-in; the safe mode is the default.", "rationale": "On principle rather than on the measured size of the risk: the PR exists because a default pointed at production."},
    {"text": "Test main() rather than the inner function when the CLI default is what changed.", "rationale": "The inner function takes the flag explicitly, so a test of it could pass forever while the wiring defaulted the wrong way."},
    {"text": "Keep an unreachable guard, labelled, rather than delete it.", "rationale": "Widening the extractor is a plausible future change that would silently reopen a patched bug; three lines to make that loud is a good trade."},
    {"text": "Correct a reviewer's headline number while accepting their conclusion.", "rationale": "A correction from a review gate is not automatically ground truth. Reproduced it, found two variables had moved, and then adopted their restated framing when it beat mine."}
  ],
  "file_roots_touched": [
    "~/conductor/workspaces/builder-3-keonda-phase0 (PR #20, feat/community-pilot-phase0)",
    "~/conductor/workspaces/builder-3-keonda-preserve (PR #21, chore/preserve-live-seating-script)",
    "~/conductor/workspaces/builder-3-keonda-isofix (PR #22, fix/memory-cognee-read-isolation)",
    "~/conductor/workspaces/builder-3-keonda-sidecar-auth (PR #23, fix/cognee-sidecar-auth)",
    "~/conductor/workspaces/builder-3-consulting-communicator (toddito PR #2, feat/consulting-communicator)",
    "~/conductor/repos/keonda.io, ~/conductor/repos/toddito",
    "read-only: ~/.hermes/skills/keonda/{scripts,graph,crm}, ~/.hermes/plugins/keonda-tools, ~/.hermes/logs, ~/.hermes/hermes-agent, ~/.hermes/gateway",
    "orchestraos: docs/HANDOFF_builder-3-next.md, ~/.orchestra/state/builder-3.json, ~/.orchestra/memory/builder-3/"
  ],
  "next_3_actions": [
    {
      "action": "Check for responses and PR verdicts before touching anything. A merge would change what main contains and therefore which hazards are still live.",
      "first_effect": {
        "kind": "command",
        "target": "gh pr view 23 --repo flybyflow/keonda.io --json state,reviewDecision,mergeable",
        "check": "state == OPEN and mergeable == MERGEABLE; if any of PRs 19-23 reads MERGED, STOP and reconcile the hazard list before any further action"
      }
    },
    {"action": "python3 msg_store.py inbox --agent builder-3 -- answer the two open callbacks if gm or review have replied; both are currently sent-and-awaiting."},
    {"action": "Only on the operator's word: deploy keonda #22 and #23 TOGETHER (a patched sidecar with an unpatched client 401s everything and silently falls back to the record). For toddito, if old history is restored, rebase feat/consulting-communicator BEFORE anyone reads PR #2's diff as my change."}
  ],
  "hazards": [
    "events.py --demo is DESTRUCTIVE against real tenant names and is only safe on branches carrying PR #20's fix. On main it still unlinks and rewrites two live communities' event and RSVP files. Never run it without first checking which store it resolves to.",
    "An unauthenticated local service is live right now and serves any tenant's facts to any local process. PR #23 closes it but is unmerged, so the exposure stands until the operator acts. Do not restart or reconfigure the running process.",
    "~/.hermes has no backup and Time Machine would not mount. Today's recovery worked only because a logging side effect happened to retain what was lost. Treat anything under there as unrecoverable before writing to it."
  ],
  "canary_questions": [
    {"id": "c1", "question": "During the data-loss incident, recovery was possible because of a side effect of normal operation rather than any backup, and the restored timestamps were confirmed against a second, independent artifact of a different kind. Name both sources and say why the second one mattered more than the first for fidelity.", "source_pointer": "jsonl:2026-10-04T17:55Z..18:05Z"},
    {"id": "c2", "question": "A verification loop reported success while having copied nothing at all. Explain the precise mechanism that produced that false green, and what the rewritten check required in order to be incapable of passing vacuously.", "source_pointer": "jsonl:2026-10-04T19:05Z..19:20Z"},
    {"id": "c3", "question": "A figure describing a seating regression was withdrawn after reproduction. Explain what two variables had moved between the two things being compared, and the property of the current data that makes the original figure unreachable by any algorithm.", "source_pointer": "jsonl:2026-10-04T18:30Z..18:45Z"},
    {"id": "c4", "question": "Porting a read-side filter without changing a write-side tag would have produced a result that looked like a successful fix but was a different failure. Describe that failure mode and why the probe used to verify the real fix would have caught it.", "source_pointer": "jsonl:2026-10-04T18:50Z..19:00Z"},
    {"id": "c5", "question": "A committed security probe reports the same alarming prefix and exit status in two situations that mean opposite things. State both situations and why the direction it fails in makes it unsafe to wire into CI as-is.", "source_pointer": "jsonl:2026-10-04T19:00Z..19:10Z"}
  ]
}
```
