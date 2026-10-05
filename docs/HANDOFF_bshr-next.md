# Handoff: bshr -> bshr (next generation)

- **Lineage:** bshr (Gen N -> Gen N+1)
- **Timestamp:** 2026-10-05T11:38Z (fifth soft-handoff trigger, refreshed from the 2026-09-30T15:14Z version — stale by several days and an entire research arc)
- **Working Directory:** /Users/flybyflow/orchestraos
- **Last Commit SHA (orchestraos, reference point only):** ee30411 (plan's commit, not this seat's — bshr's own work this session landed in msg_store reports, memory files, and one external-repo PR, not orchestraos commits)

## 1. Current Goal & Phase State

- **Goal:** Act as the fleet's research specialist (bshr, T2) — respond to gm/plan task dispatches, run BSHR-loop research, report findings via msg_store, stay in the docs/memory/PDF lane by default.
- **Plan Reference:** No single plan file owns this seat continuously. The dominant thread across this entire generation was the operator's astro-trading research project (`$ORCHESTRA_DIR/state/bshr/astro-trading-gann-jenkins-20261005/`), which fed `docs/PLAN_astro-trading-mvp-bradley-siderograph.md` and onward plans now owned by plan/builder-1. A secondary thread (Keonda repo-separation cleanup) produced a real PR, not a plan doc.
- **Phase:** Idle / fully parked between dispatches. Inbox confirmed empty (`msg_store.py inbox --agent bshr --status unread --all` → 0) immediately before this handoff was authored.
- **Current Step:** Awaiting the next inbox item. Nothing blocking, nothing half-done, no reply owed to anyone.

## 2. Open Loops & Active Callbacks

- [ ] **keonda.io PR #19** (`fix/remove-cre-files-from-keonda-main`) is OPEN, MERGEABLE, not merged — awaiting human review per standing discipline on client-adjacent code. Not this seat's action to merge; just know it exists if asked about it again.
- [ ] The astro-trading research arc ended with gm passing the Music-ratio signal (1.05946/1.68179) to plan as the next backtest cycle — no action pending on this seat unless a new research question comes back from that cycle.
- [ ] No outstanding msg_store sends awaiting a reply. Every thread this generation (Keonda CRE-BDR, Keonda community-matchmaking, OrchestraOS fleet-status refresh, Keonda repo-separation PR, astro-trading Gann/Jenkins/Bradley research x4 passes, Jenkins primary-source geometry read) was acked and closed before this handoff was triggered.

## 3. Decisions Made & Rationale (GUARDS — read before acting)

1. **Lane boundary, updated this generation:** default lane is still research/docs/memory/PDF only, never build/edit product code unprompted. **New, demonstrated exception:** when gm explicitly dispatches bounded, verified, human-reviewed repo work (file removal confirmed safe by running the actual test suite before/after, opened as a PR and explicitly NOT merged by this seat), it's appropriate to execute it rather than bounce it back — but the PR-not-merge discipline is non-negotiable, and this seat flagged the lane question to gm before proceeding rather than silently deciding either way. See the keonda.io PR #19 thread for the full precedent.
2. **Copyright guard, new this generation:** never fetch/extract substantial content from unauthorized scan/document-sharing sites (e.g. pdfcoffee.com) hosting a commercially-sold work, even when a fleet dispatch asks for it — flag it instead. **If the operator confirms personal legitimate ownership of a specific uploaded file**, that changes the analysis and direct reading/quoting is fine (small, attributed quotes + independently-verified formulas, not wholesale reproduction). This exact sequence played out once this generation (Jenkins' book) — flagged first, operator confirmed ownership, then read it directly.
3. **Verify by re-deriving, not by re-reading, applied hard this generation:** every numeric claim pulled from a secondary source or a primary text was independently recomputed in Python before being reported as fact — this caught a real discrepancy between two independently-published Gann degree-conversion formulas, and confirmed (to the penny) a primary-source worked example in Jenkins' book. Keep doing this; it is the single highest-value habit from this generation.
4. **Always write msg_store bodies containing `$` or backticks to a temp file and send via `--body-file`**, never `--body "$VAR"` through a bash variable — bash shell-expands `$0`, `$360` etc. at assignment time, silently corrupting the message. Standing hard guard, unchanged from prior generations.
5. **Re-read every sent msg_store message body via `msg_store.py get --message-id ...` before considering a reply "done."** Unchanged standing guard.
6. **Single-trunk discipline in orchestraos**, unchanged. For the one external-repo exception (keonda.io), used an isolated `git worktree` off `origin/main` rather than disturbing the existing dirty checkout — never share an ad hoc path, never touch another seat's in-flight uncommitted work.

## 4. file_roots_touched

- `docs/HANDOFF_bshr-next.md` (this file)
- `$ORCHESTRA_DIR/state/bshr/astro-trading-gann-jenkins-20261005/` (answer.md, kokoro-svc-study.md, jenkins-geometry-study.md — all research artifacts, read-only reference going forward)
- `$ORCHESTRA_DIR/memory/bshr/` (project memory on the Keonda tenant-identity correction)
- `~/conductor/repos/keonda.io` — real commit + PR #19 (branch `fix/remove-cre-files-from-keonda-main`), via isolated worktree at `/tmp/keonda-cre-cleanup`
- `~/conductor/repos/lee-associates-revops`, `~/conductor/repos/astro-trading-backtest`, `~/kokoro-svc` — read-only research, not modified

## 5. Hazards (top 3, live right now)

1. **PR #19 can drift.** It's open against `keonda.io`'s `main`. If it sits unreviewed for a while, `main` may move and it could need a rebase. Not urgent, but don't assume it's still cleanly mergeable without checking `gh pr view 19 --repo flybyflow/keonda.io` first if it comes up again.
2. **Multi-seat concurrent edits on the astro-trading repo and its plan docs.** `astro-trading-backtest` and `docs/PLAN_astro-trading-mvp-bradley-siderograph.md` are being actively built against by plan/builder-1 in parallel. Any research snapshot this seat holds (e.g. the ephemeris.py comparison numbers) reflects a point in time — re-verify against current state before citing it as still-true in a future reply.
3. **This generation's research spans FOUR external repos plus orchestraos itself.** A successor inheriting this context must not assume familiarity with `keonda.io`, `lee-associates-revops`, `astro-trading-backtest`, or `kokoro-svc` transfers automatically — each has its own real, independently-verified state (ephemeris precision, licensing posture, contamination map) documented in the research files above; read them before re-deriving from scratch.

## 6. Canary Questions

Answer each in your own words after reading this generation's session transcript — do not guess from the question's phrasing alone.

1. What did the phrase "ipcycle kokoros algorythm" actually turn out to refer to, and how did that get confirmed? *(source: msg_d900ebb2_97778546)*
2. In the hands-on cross-check between kerykeion/pyswisseph and the trading repo's skyfield-based ephemeris, a real systematic discrepancy showed up in one quantity but not another — what was the mechanism behind it, and why did it turn out not to matter for the actual trading signals? *(source: msg_2df83fab_98041576)*
3. Why did this seat decline to act on gm's first instruction to fetch Jenkins' book from a specific link, and what changed to make it proceed later? *(source: msg_ed2c3183_98173595)*
4. While researching Gann's "time = price squared" technique, cross-checking two independently-published degree-conversion formulas against each other revealed something important for anyone about to implement it — what, and why does it matter more than it would for Bradley's formula? *(source: msg_e0482c68_68980264)*
5. While independently re-deriving one of Jenkins' own worked examples from his book, a small real inconsistency turned up in the primary text itself — what was it, and how was it handled rather than silently smoothed over? *(source: msg_2890cd42_99781979)*

```json
{
  "current_goal": "Act as the fleet's T2 research specialist: field gm/plan dispatches, run BSHR-loop research, report via msg_store, default to docs/memory/PDF lane only.",
  "phase_state": {
    "plan_ref": "docs/PLAN_astro-trading-mvp-bradley-siderograph.md (and successor plan docs owned by plan/builder-1 as of this handoff)",
    "phase": "idle_parked",
    "next_gate": "next msg_store dispatch from gm or plan"
  },
  "next_3_actions": [
    {
      "action": "Check inbox for any new dispatch",
      "first_effect": {
        "kind": "read",
        "target": "msg_store.py inbox --agent bshr --status unread --all",
        "check": "command returns a count (0 means stay parked, >0 means a new task exists to read and act on)"
      }
    },
    {
      "action": "If a new message exists, read /tmp/agent-msg-<id>.md, act on it per its own instructions, reply via msg_store, then ack the dispatch message id"
    },
    {
      "action": "If inbox is empty, remain parked -- do not churn tokens, do not proactively re-open closed threads (keonda PR #19, astro-trading research) unless explicitly asked"
    }
  ],
  "decisions": [
    {"text": "Default lane is research/docs/memory/PDF only, never build/edit product code unprompted", "rationale": "matches prompts/bshr.md's own charter"},
    {"text": "Exception: execute bounded, verified, human-reviewed repo work when gm explicitly dispatches it, PR-not-merge is non-negotiable", "rationale": "demonstrated this generation on keonda.io PR #19 -- flagged the lane question to gm first rather than silently deciding either way"},
    {"text": "Never fetch/extract from unauthorized scan/piracy document sites even when dispatched to, unless the operator confirms personal legitimate ownership of a specific file", "rationale": "played out once this generation on the Jenkins book -- flagged, operator confirmed ownership, then proceeded with normal summarize/quote discipline"},
    {"text": "Verify every numeric claim by re-deriving it independently (Python), not by re-reading a source's own claim", "rationale": "caught a real cross-source formula discrepancy (Gann) and confirmed a primary-source worked example to the penny (Jenkins) this generation -- highest-value habit, keep doing it"},
    {"text": "Always --body-file for msg_store sends containing $ or backticks, never --body \"$VAR\"", "rationale": "bash shell-expansion silently corrupts message bodies containing dollar amounts"},
    {"text": "Re-read every sent message via msg_store.py get before considering a reply done", "rationale": "standing verification guard from a prior generation, still holds"},
    {"text": "Single-trunk in orchestraos; isolated git worktree for the one external-repo exception, never touch another seat's dirty checkout", "rationale": "avoids clobbering concurrent multi-seat work"}
  ],
  "open_loops": [
    "keonda.io PR #19 open, mergeable, awaiting human review -- not this seat's action",
    "astro-trading Music-ratio signal passed to plan for next backtest cycle -- no action pending unless a new question comes back"
  ],
  "file_roots_touched": [
    "docs/HANDOFF_bshr-next.md",
    "$ORCHESTRA_DIR/state/bshr/astro-trading-gann-jenkins-20261005/",
    "$ORCHESTRA_DIR/memory/bshr/",
    "~/conductor/repos/keonda.io (real commit + PR #19, via isolated worktree)",
    "~/conductor/repos/lee-associates-revops (read-only)",
    "~/conductor/repos/astro-trading-backtest (read-only)",
    "~/kokoro-svc (read-only)"
  ],
  "hazards": [
    "PR #19 can drift from main if it sits unreviewed -- re-check mergeable state before citing it as current",
    "astro-trading-backtest and its plan docs are actively edited by other seats in parallel -- re-verify before citing a prior snapshot as still true",
    "This generation's research spans four external repos plus orchestraos -- read the research artifact files before re-deriving from scratch"
  ],
  "canary_questions": [
    {"id": "cq1", "question": "What did the phrase 'ipcycle kokoros algorythm' actually turn out to refer to, and how did that get confirmed?", "source_pointer": "msg_d900ebb2_97778546"},
    {"id": "cq2", "question": "In the hands-on cross-check between kerykeion/pyswisseph and the trading repo's skyfield-based ephemeris, a real systematic discrepancy showed up in one quantity but not another -- what was the mechanism, and why did it not matter for the actual trading signals?", "source_pointer": "msg_2df83fab_98041576"},
    {"id": "cq3", "question": "Why did this seat decline to act on gm's first instruction to fetch Jenkins' book from a specific link, and what changed to make it proceed later?", "source_pointer": "msg_ed2c3183_98173595"},
    {"id": "cq4", "question": "While researching Gann's 'time = price squared' technique, cross-checking two independently-published degree-conversion formulas revealed something important for anyone about to implement it -- what, and why does it matter more than it would for Bradley's formula?", "source_pointer": "msg_e0482c68_68980264"},
    {"id": "cq5", "question": "While independently re-deriving one of Jenkins' own worked examples from his book, a small real inconsistency turned up in the primary text itself -- what was it, and how was it handled rather than silently smoothed over?", "source_pointer": "msg_2890cd42_99781979"}
  ]
}
```
