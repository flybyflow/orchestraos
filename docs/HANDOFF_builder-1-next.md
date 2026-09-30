# Handoff: builder-1 -> next builder-1 generation
- **Lineage:** builder-1 (soft-handoff, 2026-09-30)
- **Timestamp:** 2026-09-30T15:05:00Z
- **Working Directory:** /Users/flybyflow/orchestraos (this checkout — nothing of mine is uncommitted here; the untracked BRIEF_*.md docs and the modified prompts/_agent-protocol.md belong to other seats, do not touch or commit them)
- **Active work tree:** `/tmp/build-v2` (branch `2d-view-v2`, currently at `c274a18`) — **shared with build and review; do NOT commit there, do NOT `git stash`.** Two other worktrees from earlier tonight (`/private/tmp/2dv2`, `/tmp/pr137-fix`) are now stale/detached — do not use either, HEAD moved under people sharing them and build has since moved everyone to `/tmp/build-v2`.
- **My files, currently UNCOMMITTED in `/tmp/build-v2`:**
  - `dashboard/src/lib/edgeRouting.ts` + `.test.mjs` — modified (the QA-driven "prefer short" redesign, see Decisions 2)
  - `dashboard/src/lib/nodeAlerts.ts` + `.test.mjs` — untracked (accepted by build, not yet wired or committed)
- **Committed elsewhere (not by me):** `784f990`/`6f6d8cd` on the now-stale `pr137-fix` tree carry my FIX-2 (org-chart root + retired/rotation-ghost) work — build confirmed those already merged into `2d-view-v2`'s history before `e08dae7`.

## current_goal
2D Agents View v2 cross-edge overlay: deliver and keep correct the two pure modules build is wiring into `TopologyOverlay`/`TopologyDiagram` — `edgeRouting.ts` (curve/polyline geometry so cross-edges never draw through a node or label) and `nodeAlerts.ts` (per-node/per-edge escalation+held-message counts). "Correct" now explicitly means correct against the REAL rendered page, not just invented unit fixtures — that distinction is the whole story of tonight's work on this thread.

## phase_state
- plan_ref: `docs/DESIGN_2d-view-cross-edges-overlay.md`
- phase 2 of 0 (build has not named a fixed total step count for v2; roughly: edgeRouting done+QA-redesigned, nodeAlerts done, both awaiting build's wiring)
- gates_passed: edgeRouting v1 accepted (3 mutations, build re-verified in an isolated copy — `/tmp/verify-edgeRouting/`, not in-place), nodeAlerts accepted, edgeRouting QA-driven redesign implemented+reported (not yet re-verified/committed by build)
- current_step: standing by for build's reply on the label-rect id scheme, and for confirmation the edgeRouting QA-fix is committed
- next_gate: build wires label rects into `TopologyOverlay`'s obstacles array (interface already supports it, no code change needed from this seat) and commits the QA-fix, OR assigns the next chunk

## working_state
Everything currently green (tsc, eslint, full `*.test.mjs` suite) as of my last message to build. The real story: QA (the operator) found `routeEdge` was NOT clearing boxes on the live page despite fully green unit tests. I diagnosed it by driving the actual running dashboard with the browse skill (not asking build for numbers, pulling them myself) — confirmed labels are never in the obstacle set (100% certain) and the retry/offset budget was being exhausted routinely on real dense layouts, not as a rare case, because a single-control-point curve cannot geometrically dodge obstacles spread along a long chord. Redesigned the retry policy around "prefer short, return the shortest attempt as information rather than escalating outward" per the operator's explicit framing ("a 1645px detour is worse than a short line that clips a corner"). Verified against all 78 real node-pairs captured live: 76 now clear cleanly. Build separately discovered `/messages/recent` is paginated/capped and cannot feed `nodeAlerts` an honest 24h count (undercuts by ~35x) — built a dedicated `GET /messages/alerts?hours=24` endpoint for it; `nodeAlerts.ts` itself is unaffected (still a pure function over whatever message array it's handed), but whoever wires it needs to call the new endpoint, not `/recent`.

## open_loops
- [ ] Waiting on build: confirm the label-rect id scheme for `obstacles` (I proposed `label:${pairKey(a,b)}` in msg_19e9a69e_79863885 and again in msg_00427d9a_80409636 — no reply yet as of this handoff).
- [ ] Waiting on build: whether the edgeRouting.ts QA-redesign (msg_00427d9a_80409636) is accepted/committed, or needs changes. It is currently uncommitted, live in the shared tree — verify it is still there and untouched before trusting it (see hazards).
- [ ] Not yet verified: does the fix also clear LABEL overlaps on the real page? I only proved the node-clearance half improved (76/78 real pairs) — labels aren't wired in yet, so the original QA bug is only half-closed.
- [x] ~~ElevenLabs conversation-initiation-client-data endpoint~~ — REFUSED, correctly, after verifying against primary ElevenLabs docs that the contract didn't apply to this app's SDK-based call flow. build independently re-verified and confirmed. Nothing to resume here; flagging only so a successor doesn't get re-asked and rebuild something dead.

## decisions
- Refused to build the ElevenLabs initiation-webhook task after checking the real docs myself rather than trusting the task spec — the webhook type doesn't fire for SDK/widget conversations at all, and the request-body contract in the task was invented. Building it would have shipped confidently-wrong code while the real exposure stayed open. (GUARD: verify a third-party API contract against its own docs before building to a spec that assumes it, especially security-adjacent work.)
- Redesigned edgeRouting's offset/retry policy to "prefer short" (cap tightened to real box-size scale, removed the polyline's separate wider ceiling, exhaustion now returns the shortest attempt not the widest) after live-page QA — a single control point cannot solve "dodge several obstacles spread along a long chord" regardless of how far the search is allowed to reach, so escalating the search further was making real failures WORSE (a visible sprawling detour), not better.
- Kept every "hide this ghost row" predicate (`isRetired`, `isRotationPredecessor`) keyed on explicit registry fields, never an id-shape/pattern, even under repeated pressure to generalize quickly — an id pattern silently misses the next differently-named rotation ghost, which is the exact bug class each of these fixes exists to close.
- GUARD, fleet-wide, learned the hard way twice tonight: never `git stash` in a shared `/tmp` worktree, and never mutate a file (even via `cp`-backup-and-restore) while its owner is still actively editing it — copy the file to a scratch path and mutate the copy instead. Both build and I separately raced the same live file this session; build's own restore is what re-broke my already-fixed file the second time.
- GUARD: never commit in any of the shared `/tmp/*` worktrees (`build-v2`, formerly `pr137-fix`/`2dv2`) — build owns every commit on `2d-view-v2`. Never touch `api/` or any rotation/retire-lifecycle script (e.g. the `build-gen1` tmux session) — display/count fixes only, per gm's explicit scope ruling.
- GUARD: verify every claim by re-deriving it against the real running page/API before reporting a fix as done — a green unit-test suite and a correct algorithm are not the same claim as "this works on the actual page." This is the thread connecting nearly every real finding tonight (an untested OR-branch in `isRetired`, `routeEdge`'s real-page failure despite all-green tests, and my own misdiagnosis-avoided-by-diffing during the file-clobber incident).

## file_roots_touched
- /tmp/build-v2/dashboard/src/lib/edgeRouting.ts
- /tmp/build-v2/dashboard/src/lib/edgeRouting.test.mjs
- /tmp/build-v2/dashboard/src/lib/nodeAlerts.ts
- /tmp/build-v2/dashboard/src/lib/nodeAlerts.test.mjs
- (historical, committed by build, now on a stale tree but merged into 2d-view-v2's history) dashboard/src/lib/topologyLines.ts, dashboard/src/lib/topologyLines.test.mjs, dashboard/src/pages/Agents.tsx

## next_3_actions
1. Check `python3 msg_store.py inbox --agent builder-1` for build's reply on the label-rect id scheme and/or edgeRouting QA-fix commit status — this is the declared first effect, see below.
2. Before trusting anything in `/tmp/build-v2/dashboard/src/lib/edgeRouting.ts` or `nodeAlerts.ts`, re-run `node --experimental-strip-types src/lib/edgeRouting.test.mjs` and `src/lib/nodeAlerts.test.mjs` from `/tmp/build-v2/dashboard` — this worktree has a real history of files changing under agents mid-session; do not assume the content matches this handoff without checking.
3. If build has wired labels into `obstacles`, verify (via the browse skill against the live page, not by reading code alone) that label overlaps are actually gone now — the original QA-reported bug is not fully closed until that half is confirmed too, not just the node-clearance half.

## canary_questions
(Questions only. No answers, no answer keys, anywhere. Each source_pointer names a real msg_store message id in my own sent history — read it to answer in your own words.)
1. **Q1:** In the live-browser measurement of the real 1440x900 page, what specifically made the "gm to brain" (or similarly long, same-column) pair a HARD case for a single-control-point curve — not just "there were obstacles," but the specific geometric reason a bigger offset couldn't have fixed it? (source_pointer: jsonl:msg_19e9a69e_79863885)
2. **Q2:** My second mutation-proof attempt on edgeRouting's `scale` cap landed cleanly (diff confirmed the edit applied) but the test suite stayed green anyway. What was the actual structural reason that specific mutation "did not matter," and what did I do instead once I noticed? (source_pointer: jsonl:msg_00427d9a_80409636)
3. **Q3:** During the file-clobbering incident with build, what specific piece of evidence — not just "the file changed" — let me identify that BOTH observed anomalies traced back to build's own restore mechanism, rather than an external/automated process? (source_pointer: jsonl:msg_cd07c506_65615289)
4. **Q4:** What real registry field does `isRetired()` key on as its primary signal, and what did build discover when they tried to mutate a clause I had added to that function's OR expression? (source_pointer: jsonl:msg_cbc55c65_60885594)
5. **Q5:** In the very first AgentsSummaryStrip task, I deviated from one explicit instruction in the spec. What was the deviation, and what two independent technical reasons made the originally-requested thing impossible in this repo? (source_pointer: jsonl:msg_8de9524d_26434214)

## hazards
1. Three separate `/tmp` worktrees for this same feature branch have been corrupted or gone stale THIS SESSION (HEAD detached under concurrent use, a file clobbered by a concurrent `cp`-based mutation test — twice). Never assume a shared worktree's content matches what you last wrote; diff or checksum before trusting it.
2. My edgeRouting.ts QA-redesign is sitting uncommitted in a tree build actively edits too. If build does anything broad (a wide `git checkout`, another careless cp/stash) before committing it, this fix is at real risk of being silently lost a third time.
3. The original QA bug (edges drawing through nodes/labels) is only HALF fixed from this seat's side — node-clearance is substantially better (76/78 real pairs), but labels are not wired into the obstacle set yet, and that half is entirely build's side of the work, not yet done as of this handoff.

## first_effect
```
kind: command
target: cd /tmp/build-v2 && git status --short dashboard/src/lib/edgeRouting.ts dashboard/src/lib/nodeAlerts.ts
check: edgeRouting.ts shows modified (M) and nodeAlerts.ts shows untracked (??) — if either is missing, clean, or looks different from what this handoff describes, the work moved or was lost since this was written; check with build (msg_store) before assuming anything.
```

```json
{
  "current_goal": "2D Agents View v2 cross-edge overlay: deliver and keep correct edgeRouting.ts (curve/polyline routing geometry) and nodeAlerts.ts (per-node/per-edge alert aggregation) that build is wiring into TopologyOverlay/TopologyDiagram, verified against the REAL rendered page rather than only invented unit fixtures.",
  "phase_state": {
    "plan_ref": "docs/DESIGN_2d-view-cross-edges-overlay.md",
    "phase_n": 2,
    "phase_m": 0,
    "gates_passed": [
      "edgeRouting v1 accepted (3 mutations, build re-verified in an isolated copy)",
      "nodeAlerts accepted",
      "edgeRouting QA-driven short-route redesign implemented and reported"
    ],
    "gates_total": 0,
    "current_step": "standing by for build's reply on the label-rect id scheme and edgeRouting QA-fix commit status",
    "next_gate": "build wires label rects into TopologyOverlay's obstacles array and commits the edgeRouting QA-fix, or assigns the next chunk"
  },
  "working_state": "Everything green (tsc, eslint, full *.test.mjs suite) as of the last report to build. Real QA (the operator) found routeEdge failing on the live page despite all-green unit tests; diagnosed via live browser measurement (browse skill against the running dashboard, not invented geometry) that labels were never in the obstacle set and the retry/offset budget was being exhausted routinely on real dense layouts. Redesigned the retry policy to prefer short routes over escalating search width, per the operator's explicit framing. Verified against 78 real node-pairs captured live: 76 now clear cleanly. Build separately found /messages/recent is paginated and cannot feed nodeAlerts an honest 24h count, and built a dedicated /messages/alerts endpoint for it -- nodeAlerts.ts itself is unaffected, but whoever wires it must call the new endpoint.",
  "open_loops": [
    "Waiting on build: confirm label-rect id scheme for obstacles (proposed label:${pairKey(a,b)}) -- no reply yet.",
    "Waiting on build: is the edgeRouting.ts QA-redesign accepted/committed? Currently uncommitted in the shared tree.",
    "Not yet verified: does the fix clear LABEL overlaps on the real page too, or only node overlaps? Labels are not wired in yet."
  ],
  "decisions": [
    {"text": "Refused to build the ElevenLabs initiation-webhook task after checking the real docs myself.", "rationale": "The webhook type does not fire for SDK/widget conversations at all, and the task's request-body contract was invented; building it would have shipped confidently-wrong code while the real exposure stayed open."},
    {"text": "Redesigned edgeRouting's offset/retry policy to prefer short routes over guaranteed-but-escalating clearance search.", "rationale": "A single control point cannot geometrically solve dodging several obstacles spread along a long chord regardless of search width, so escalating further was making real failures worse (a visible sprawling detour), not better -- confirmed via live-page QA."},
    {"text": "Kept every ghost-hiding predicate (isRetired, isRotationPredecessor) keyed on explicit registry fields, never an id-shape pattern.", "rationale": "An id pattern silently misses the next differently-named rotation ghost -- the exact bug class each fix exists to close."},
    {"text": "GUARD: never git stash in a shared /tmp worktree, and never mutate a file (even via cp-backup) while its owner is actively editing it.", "rationale": "Both build and I separately raced the same live file this session; build's own restore mechanism is what re-broke my already-fixed file the second time."},
    {"text": "GUARD: never commit in any shared /tmp/* worktree (build owns all commits on 2d-view-v2); never touch api/ or any rotation/retire-lifecycle script.", "rationale": "Explicit, repeated scope boundaries from build and gm across every task this session."},
    {"text": "GUARD: verify every claim by re-deriving it against the real running page/API before reporting a fix as done.", "rationale": "A green unit-test suite and a correct algorithm are not the same claim as 'this works on the real page' -- the thread connecting nearly every real finding this session."}
  ],
  "file_roots_touched": [
    "/tmp/build-v2/dashboard/src/lib/edgeRouting.ts",
    "/tmp/build-v2/dashboard/src/lib/edgeRouting.test.mjs",
    "/tmp/build-v2/dashboard/src/lib/nodeAlerts.ts",
    "/tmp/build-v2/dashboard/src/lib/nodeAlerts.test.mjs",
    "dashboard/src/lib/topologyLines.ts",
    "dashboard/src/lib/topologyLines.test.mjs",
    "dashboard/src/pages/Agents.tsx"
  ],
  "next_3_actions": [
    "Check python3 msg_store.py inbox --agent builder-1 for build's reply on the label-rect id scheme and edgeRouting QA-fix commit status.",
    "Before trusting edgeRouting.ts or nodeAlerts.ts in /tmp/build-v2, re-run both *.test.mjs files -- this worktree has a real history of files changing under agents mid-session.",
    "If labels are wired into obstacles, verify via the browse skill against the live page that label overlaps are actually gone -- the original bug is not fully closed until that half is confirmed too."
  ],
  "canary_questions": [
    {"id": "Q1", "question": "In the live-browser measurement of the real 1440x900 page, what specifically made the long same-column pair a HARD case for a single-control-point curve -- the specific geometric reason a bigger offset could not have fixed it?", "source_pointer": "jsonl:msg_19e9a69e_79863885"},
    {"id": "Q2", "question": "A mutation-proof edit landed cleanly (diff-confirmed) but the suite stayed green anyway. What was the actual structural reason that specific mutation did not matter, and what was done instead once noticed?", "source_pointer": "jsonl:msg_00427d9a_80409636"},
    {"id": "Q3", "question": "During the file-clobbering incident, what specific piece of evidence identified that BOTH observed anomalies traced back to one seat's own restore mechanism rather than an external/automated process?", "source_pointer": "jsonl:msg_cd07c506_65615289"},
    {"id": "Q4", "question": "What real registry field does the retired-seat predicate key on as its primary signal, and what did the reviewing seat discover when they tried to mutate a clause added to that function's OR expression?", "source_pointer": "jsonl:msg_cbc55c65_60885594"},
    {"id": "Q5", "question": "In the very first summary-strip task, one explicit spec instruction was deviated from. What was the deviation, and what two independent technical reasons made the originally-requested thing impossible in this repo?", "source_pointer": "jsonl:msg_8de9524d_26434214"}
  ],
  "hazards": [
    "Three separate /tmp worktrees for this feature branch have been corrupted or gone stale this session (HEAD detached under concurrent use, a file clobbered by a concurrent cp-based mutation test -- twice). Never assume a shared worktree's content matches what you last wrote.",
    "The edgeRouting QA-redesign is uncommitted in a tree build actively edits too -- at real risk of being lost a third time if not committed soon.",
    "The original QA bug is only half fixed from this seat's side -- node-clearance improved substantially, but labels are not wired into the obstacle set yet, entirely on build's side."
  ],
  "first_effect": {
    "kind": "command",
    "target": "cd /tmp/build-v2 && git status --short dashboard/src/lib/edgeRouting.ts dashboard/src/lib/nodeAlerts.ts",
    "check": "edgeRouting.ts shows modified (M) and nodeAlerts.ts shows untracked (??) -- if either is missing, clean, or different, the work moved or was lost since this was written; check with build before assuming anything."
  }
}
```
