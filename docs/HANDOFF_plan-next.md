# Handoff: plan (gen1, session unknown) -> plan-g2

- **Lineage:** plan (Gen 1 -> Gen 2, auto-rotated by the Lineage Daemon, canary graded PASS)
- **Timestamp:** 2026-10-01T00:10:00Z
- **Working Directory:** /Users/flybyflow/orchestraos
- **Last Commit SHA:** 51733e8

## 1. Current Goal & Phase State

- **Goal:** since the last baton update, `gm` dispatched a direct, high-priority
  operator task (`msg_fb272ce9_12597849`): design a genuinely different Pulse
  report-redesign alternative to the other session's already-shipped What/So/
  Now-What mockups, self-directed review, then hand to a fresh build pass.
  Done and reported back to `gm` (`msg_11060e74_13312495`) and `ea`
  (`msg_7a7409a2_13318209`).
- **Phase:** PARKED again, awaiting `gm`/operator's call on the two real
  blockers this surfaced (below) before any build pass starts. Also still
  watching the pre-existing v2 QA #4 thread (unchanged, see below).
- **Current Step:** None.

## 2. Open Loops & Active Callbacks

- [ ] **Report redesign Alternative B — awaiting operator/gm decision, NOT
      cleared for build.** Doc at `/Users/flybyflow/pulse/docs/
      REPORT_REDESIGN_ALT_CONTROLROOM.md`, branch `report-redesign-alt-
      controlroom` (pushed to pulse `origin`), own worktree at
      `/tmp/plan-g2-report-alt` (not the shared pulse checkout). Ran a real
      `codex exec` adversarial pass, not self-graded — it caught and this
      seat fixed: a 6x-undersized build list, two factually wrong
      token-reuse claims (`--vital`/`--alert` already in use elsewhere,
      verified directly against `src/app/report/[id]/page.tsx` and
      `ThorScoresPanel.tsx`), and a self-contradictory third archetype
      (Congruence/Incongruence) presented as buildable while its own
      selection logic was admittedly unsolved — pulled out entirely, kept
      only as a documented future extension. Two real blockers surfaced,
      escalated to `gm` rather than decided alone: (1) no respondent
      access/consent/role model exists in the product today — who can be
      "the facilitator," how the lower-power respondent's mark is
      identified/protected, name visibility, >2 respondents; (2)
      per-respondent priority matrices (needed for the stage-disagreement
      moment, and for Alternative A's own JTBD 4 completion) don't exist in
      the schema anywhere — a shared gap, not B-specific. A real,
      previously-undocumented discrepancy also surfaced in passing:
      `DESIGN.md` names Fraunces as the display face but the committed
      `tokens.css` ships Source Serif 4; Fraunces is only used ad hoc in
      `src/app/mockups/page.tsx`, outside the token system.
- [ ] **QA #4 dispatch to `build`, `msg_9b14d92b_93425899`** (subject
      "PRIORITY REVERSAL + QA #4") — sent 2026-09-30T18:37, status still
      `pending`/undelivered as of this handoff. `build` was mid Toddito
      `/ship` (branch `fix/report-tone-language`, step 8 of 21) and never
      went idle to receive it; the router parked it after 3 SLA escalations
      (`msg_391612bd_99770350`, acked 22:49:58) and will auto-retry delivery
      next time `build` idles. Nothing for this seat to do — do not re-send.
      Contents once delivered: reverse-pulse routing bug (239/301 pulses
      off-edge), dropped first/last replay events, overlay svg sized to
      client box not content box, hierarchy edges never carry pulses, plus 6
      more MED/LOW items, in the operator's exact priority order.
- [ ] **`build`'s toddito resume, `msg_ed6b9b74_93574614`** — build told this
      seat (not asked) it was resuming `/ship` because the operator's QA
      dispatch said Toddito stays top priority and build was mid-way (step
      8/21, branch `fix/report-tone-language`, commits `0c86ed5`/`7e8f8fa`/
      `e8e5fab`). This seat had previously told build to stay paused; build's
      read of the operator overriding that hold was correct and not
      contested. No action needed unless build's outcome contradicts this.
  - v2 side-note from that same message: 19 commits on `2d-view-v2`,
    unpushed, undeployed; 2 HIGH defects out to `builder-1`/`builder-2`
    (reverse pulses off-edge, replay event loss at both ends — same two
    items as QA #4 above); 1 MED (overlay svg vs content-box mismatch) build
    is keeping for itself after toddito.
- [ ] **Toddito 3 threads build-ready** (`[[project_toddito-congruence-and-buildready]]`
  in memory, commit `8f8b4df`) — Congruence/Incongruence (new), the
  consultant-feedback facet, and Executive Communicator are all at
  build-ready state per the last planning session. Not yet confirmed whether
  a `msg_store.py send --to build` for these went out separately from the
  toddito `/ship` build already in flight — check before assuming it's
  unsent.
- [ ] Carried forward from the 09-29 baton, still open, not re-verified this
  round: `docs/PLAN_toddito-1987-venture.md` stale A–T mapping (flagged,
  untouched); BSHR's unconfirmed Koherent V3 lineage claim (no diff run).

## 3. Decisions Made & Rationale

1. **Decision:** Did not re-send or otherwise touch the parked QA #4 message.
   — **Rationale:** it's mid-flight in the router's own retry mechanism
   (`router_parked_reason: "not-idle, target: build"`); re-sending would
   duplicate delivery once `build` idles.
2. **Decision:** Left the untracked `docs/BRIEF_*.md/.pdf` and
   `topo-*.jpg`/`topology-*.jpg` files in the working tree untouched. —
   **Rationale:** shared-working-directory-hazard discipline
   (`[[feedback_shared-working-directory-branch-hazard]]`) — these look like
   another seat's in-flight output (Todd scoping briefs, topology
   screenshots match the bshr/2d-view threads in git log), not confirmed
   mine to commit or discard.

## 4. Declared First Effect

None required. If a successor picks this up next: `python3 msg_store.py
inbox --agent plan --limit 20` first, before anything else, to check whether
`build`'s QA #4 delivery or reply has landed.

## 5. Next 3 Immediate Actions

1. Check `msg_store.py inbox --agent plan` for build's reply on QA #4 or the
   toddito `/ship` outcome before doing anything else.
2. If build reports back on either: verify the claim against the real repo
   (tests passing, files changed) before relaying to `ea`/`gm` as done —
   don't relay an unverified "done" claim.
3. Otherwise stay parked — no churning; do not touch the untracked BRIEF/topo
   files or `prompts/_agent-protocol.md`'s uncommitted diff, both belong to
   other seats' concurrent work in this shared checkout.

## 6. Grounding Canary Questions (Questions Only — No Answers!)

1. **Q1:** What specific routing bug causes 239 of 301 reverse-direction
   pulses to sit off their drawn edge, and what is the one-line fix (jsonl
   regarding `msg_9b14d92b_93425899`, item (1))?
2. **Q2:** Why did `build` decide to resume Toddito `/ship` against this
   seat's earlier explicit hold instruction, and what verified state did it
   cite before resuming (jsonl regarding `msg_ed6b9b74_93574614`)?
3. **Q3:** Why was the QA #4 message never delivered to `build`, and what
   mechanism will retry it (jsonl regarding `msg_391612bd_99770350` and the
   `router_parked_reason` metadata on `msg_9b14d92b_93425899`)?
4. **Q4:** What did the independent adversarial review find as the single
   biggest ethical gap in duel-mode's "mastered" signal, and in what file (
   `[[project_toddito-congruence-and-buildready]]` / Toddito thread lineage,
   distinct subsystem from the duelo-de-dibujo roadmap's own duel-mode gap —
   do not conflate the two)?
5. **Q5:** What are the two HIGH v2 defects build is keeping separate from
   MED item (3), and which builder is each assigned to (jsonl regarding
   `msg_ed6b9b74_93574614`'s v2 status paragraph)?
