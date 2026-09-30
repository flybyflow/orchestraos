# Handoff: bshr -> bshr (next generation)

- **Lineage:** bshr (Gen N -> Gen N+1)
- **Timestamp:** 2026-09-30T14:58Z (third soft-handoff trigger, refreshed from the 14:43Z version)
- **Working Directory:** /Users/flybyflow/orchestraos
- **Last Commit SHA:** 12639c8 (this seat's own commit, current with HEAD as of this refresh)

## 1. Current Goal & Phase State

- **Goal:** Act as the fleet's research specialist (bshr, T2) — respond to gm/plan task dispatches, run research/archaeology/BSHR-loop work, report findings via msg_store, never build/commit product code (docs and memory only).
- **Plan Reference:** No single plan file owns this seat's work — it's a standing research role fielding a stream of dispatches from gm and plan across several parallel threads tonight (Koherent lineage archaeology, OD6 voice-agent economics, 2D dashboard bug root-causing, cross-venture synthesis, plain-language doc rewrites, product-roadmap matrix).
- **Phase:** Idle / between dispatches. The most recent task (product roadmap impact/feasibility matrix, msg_0c83a385_78375884) was completed, sent to gm, and acked. No task currently in flight.
- **Current Step:** Awaiting the next inbox item. Nothing blocking, nothing half-done.

## 2. Open Loops & Active Callbacks

- [ ] gm/plan have not yet replied to the roadmap impact/feasibility matrix (msg_0c83a385_78375884) — no action needed from this seat until they do; this is their decision to make, not a pending task of mine.
- [ ] No other outstanding msg_store sends awaiting a reply — every other thread this session was acked/closed before this handoff was triggered.
- [ ] docs/PLAN_toddito-engineering.md, docs/PLAN_silicon-jungle-agentic-platform.md, and docs/PLAN_od6-voice-agent.md are all live, frequently-edited documents that other seats (plan, build) are actively writing to in parallel — always re-read the current section before citing or extending it; several sections changed multiple times across this single session without this seat's own edits.
- [x] **RESOLVED since the 14:43Z handoff:** the Self/Other/Whole framing correction was already sent to both gm (msg_347eb17d_79525742) and plan (msg_f0b7d59c_79525797) before this refresh — both acked, gm confirmed relaying a one-line correction to the operator too (msg_9b18f1df_79871181). No longer an open loop.
- [x] **RESOLVED, plan's own doc fix:** plan committed `2b1cf71` ("fix stale survey -- Executive Communicator and Investor Insight both have real decoded content"), closing the §7a.1 staleness this seat originally flagged in the roadmap matrix. No action needed.

## 3. Decisions Made & Rationale

1. **Decision:** Always write msg_store bodies containing `$` (dollar amounts) or backticks to a temp file and send via `--body-file`, never `--body "$VAR"` through a bash variable. — **Rationale:** bash shell-expands `$0`, `$360` etc. inside a double-quoted variable at assignment time, silently corrupting the message (observed twice this session, once in this seat's own send, once in gm's). This is now a hard guard, not a preference — see memory `feedback_msg-store-body-file-for-dollar-signs.md`.
2. **Decision:** Re-read every sent msg_store message body via `msg_store.py get --message-id ...` before considering a reply "done," especially any paragraph quoting/paraphrasing a tool result closely. — **Rationale:** a stray rendered tool-error box was found stitched mid-sentence into one sent message this session; the underlying research was correct, only the composed text was corrupted. See memory `feedback_verify-sent-message-bodies.md`.
3. **Decision:** This seat's lane is research and documentation only — never write or edit product/application code, never push, never build. Docs, memory files, and PDFs (via the make-pdf skill) are the only artifacts this seat produces. — **Rationale:** matches the `bshr` prompt's own charter (`prompts/bshr.md`) and every task dispatched this session was explicitly scoped "research only, no build authorization."
4. **Decision:** Single-trunk discipline — all commits this session landed directly on `fix-arturo-mapfile-bash32` (the branch already checked out at session start); no new branches created, no destructive git operations run. — **Rationale:** standing git-safety guidance; nothing in tonight's work required branch isolation.
5. **Decision:** Never touch another seat's in-flight file changes without checking git status/log first — several docs changed on disk mid-session from other seats' concurrent work; this seat always re-read current state before editing, never overwrote silently. — **Rationale:** avoids clobbering concurrent work from plan/build/gm, who were editing the same doc set in parallel all session.

## 4. Declared First Effect

`Check the inbox / wait for the next msg_store task dispatch to bshr — no other action is pending. If resuming a specific thread, first re-run: python3 /Users/flybyflow/orchestraos/msg_store.py inbox --agent bshr --status unread --all` — this is the checkable first result: either a new task appears, or the inbox is genuinely empty and the seat should park.

## 5. Next 3 Immediate Actions

1. `python3 msg_store.py inbox --agent bshr --status unread --all` — check for anything dispatched after this handoff was authored.
2. If a new task exists, read the full referenced message file, check `msg_store.py conversations --agent plan/gm --limit 10` for any parallel dispatch on the same topic before starting research from zero (this session's own established pattern — several tasks this session were split halves of the same question dispatched to both bshr and plan simultaneously).
3. If the inbox is empty, remain parked — do not churn tokens; this seat's memory index (`/Users/flybyflow/.orchestra/memory/bshr/MEMORY.md`) is current and does not need proactive maintenance right now.

## 6. Grounding Canary Questions (Questions Only — No Answers!)

1. **Q1:** What real, working UI pattern did this seat find in a deleted "init" commit of one of the Koherent repos, and what happened to it exactly one commit later? (source: msg_25785f88_77361808, and the addendum this seat committed to `docs/BSHR_koherent-lineage-synthesis.md` around the same time)
2. **Q2:** What specific bug pattern caused dollar-figure corruption in msg_store sends this session, and who else besides this seat hit the exact same bug later in the session? (source: the exchange starting at msg_9bbd73c4_55317673 and continuing through msg_a8c1f89a_60255987)
3. **Q3:** Of the six unbuilt Application Suite modules for Toddito, which two did this seat's final roadmap matrix rank highest, and what real (not invented) 1987-era evidence backed each one? (source: msg_0c83a385_78375884)
4. **Q4:** According to this seat's cross-venture synthesis, how many of the six originally-named ventures/initiatives turned out to be genuinely separate things, and what's the one real financial dependency found between them? (source: docs/BRIEF_cross-venture-synthesis.md and its authoring message thread, conv starting msg_da7fb5fe_55189408)
5. **Q5:** Why was `docs/PLAN_silicon-jungle-agentic-platform.md` deliberately left un-rewritten during the plain-language pass, and what did gm say about that judgment call afterward? (source: msg_c4347ceb_75430121 and gm's reply msg_2896006c_75820191)

```json
{
  "current_goal": "Act as the fleet's research specialist (bshr, T2) -- respond to gm/plan task dispatches, run research/archaeology/BSHR-loop work, report findings via msg_store, never build/commit product code.",
  "phase_state": {
    "plan_ref": null,
    "phase": "idle-between-dispatches",
    "next_gate": "next msg_store task dispatched to bshr"
  },
  "next_3_actions": [
    {
      "action": "Check inbox for any task dispatched after this handoff was authored.",
      "first_effect": {
        "kind": "command",
        "target": "python3 /Users/flybyflow/orchestraos/msg_store.py inbox --agent bshr --status unread --all",
        "check": "command returns either a non-empty messages array (new task to read) or count: 0 (genuinely idle, park without churning tokens)"
      }
    },
    {
      "action": "If a new task exists, check for a parallel dispatch on the same topic to plan/gm before researching from zero.",
      "first_effect": {
        "kind": "command",
        "target": "python3 /Users/flybyflow/orchestraos/msg_store.py conversations --agent plan --limit 10",
        "check": "review conversation subjects for topical overlap with the new task before dispatching research agents"
      }
    },
    {
      "action": "Remain parked if inbox is empty -- do not proactively churn on memory/doc maintenance.",
      "first_effect": {
        "kind": "state",
        "target": "no-op",
        "check": "no commits, no msg_store sends occur unless a real task arrives"
      }
    }
  ],
  "decisions": [
    {"text": "Always send msg_store bodies containing $ or backticks via --body-file (temp file), never --body \"$VAR\".", "rationale": "bash shell-expands $0/$360 etc. inside a double-quoted variable at assignment time, silently corrupting the message -- observed twice this session, including by the person who broadcast the fleet-wide warning about it."},
    {"text": "Re-read every sent msg_store message via `get` before considering a reply done.", "rationale": "a stray rendered tool-error box was found stitched mid-sentence into one sent message this session; the research itself was correct, only the composed text was corrupted."},
    {"text": "Lane boundary: research and documentation only, never product/application code, never build, never push.", "rationale": "matches prompts/bshr.md's charter; every task this session was explicitly scoped research-only."},
    {"text": "Single-trunk: all work lands on the branch already checked out at session start, no new branches, no destructive git ops.", "rationale": "standing git-safety guidance; nothing tonight required isolation."},
    {"text": "Never edit a shared doc without re-reading its current state first.", "rationale": "plan/build/gm were concurrently editing the same doc set all session; several files changed on disk between this seat's own reads."}
  ],
  "open_loops": [
    "gm/plan have not yet given a final build-dispatch decision on the roadmap impact/feasibility matrix (msg_0c83a385_78375884) -- their decision, not a pending action for this seat.",
    "No other outstanding msg_store sends await a reply as of this handoff.",
    "RESOLVED (was open in the two prior handoff refreshes): the Self/Other/Whole framing correction and the §7a.1 stale-survey fix are both closed -- see decisions/hazards below for what to watch for if this recurs."
  ],
  "file_roots_touched": [
    "docs/BSHR_koherent-lineage-synthesis.md",
    "docs/BRIEF_cross-venture-synthesis.md",
    "docs/BRIEF_cross-venture-synthesis.pdf",
    "docs/PLAN_od6-voice-agent.md",
    "docs/PLAN_toddito-1987-venture.md",
    "docs/PLAN_silicon-jungle-agentic-platform.md",
    "/Users/flybyflow/.orchestra/memory/bshr/"
  ],
  "hazards": [
    "The $-in-double-quoted---body msg_store corruption bug is real and has bitten multiple seats this session, including after a fleet-wide warning went out -- always use --body-file for any message containing a dollar amount.",
    "docs/PLAN_silicon-jungle-agentic-platform.md is ~2400 lines and almost entirely internal security/review material -- easy to misjudge scope on a future rewrite/edit pass; its narrative content already has a plain-language home elsewhere (docs/BRIEF_silicon-jungle-the-why.md).",
    "Several docs in docs/ are being actively co-edited by other seats in parallel (plan, build) -- always check git log/diff before assuming a section's content matches what this seat last saw."
  ],
  "canary_questions": [
    {"id": "Q1", "question": "What real, working UI pattern did this seat find in a deleted 'init' commit of one of the Koherent repos, and what happened to it exactly one commit later?", "source_pointer": "msg_25785f88_77361808"},
    {"id": "Q2", "question": "What specific bug pattern caused dollar-figure corruption in msg_store sends this session, and who else besides this seat hit the exact same bug later in the session?", "source_pointer": "msg_9bbd73c4_55317673..msg_a8c1f89a_60255987"},
    {"id": "Q3", "question": "Of the six unbuilt Application Suite modules for Toddito, which two did this seat's final roadmap matrix rank highest, and what real (not invented) 1987-era evidence backed each one?", "source_pointer": "msg_0c83a385_78375884"},
    {"id": "Q4", "question": "According to this seat's cross-venture synthesis, how many of the six originally-named ventures/initiatives turned out to be genuinely separate things, and what's the one real financial dependency found between them?", "source_pointer": "conv:msg_da7fb5fe_55189408"},
    {"id": "Q5", "question": "Why was docs/PLAN_silicon-jungle-agentic-platform.md deliberately left un-rewritten during the plain-language pass, and what did gm say about that judgment call afterward?", "source_pointer": "msg_c4347ceb_75430121..msg_2896006c_75820191"}
  ]
}
```
