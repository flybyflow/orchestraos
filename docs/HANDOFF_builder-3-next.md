# Handoff: builder-3 -> builder-3-g2
- **Lineage:** builder-3 (Gen 1 -> Gen 2)
- **Timestamp:** 2026-10-01T00:00:00Z
- **Working Directory:** /Users/flybyflow/orchestraos
- **Last Commit SHA:** 43f167d (inherited; builder-3 gen1 authored no code commits)

## 1. Current Goal & Phase State
- **Goal:** None assigned. Seat was provisioned with no task.
- **Plan Reference:** none
- **Phase:** n/a
- **Current Step:** PARKED awaiting assignment from `build`.

## 2. Open Loops & Active Callbacks
- [ ] Awaiting reply from `build` to msg `msg_043a9266_14615618` — what this seat is for.
- [ ] `prompts/builder-3.md` does not exist, but `registry.json` sets it as builder-3's `system_prompt`. Someone must author it or correct the registry entry.
- [ ] `registry.json` still shows builder-3 `status: provisioning`. Not hand-edited (protocol rule); `state/builder-3.json` carries the real status.

## 3. Decisions Made & Rationale
1. **Decision:** Did not invent a role for this seat — **Rationale:** the missing role prompt is the parent's call; a self-assigned charter would diverge from whatever `build` actually provisioned the seat for.
2. **Decision:** PARKED instead of finding work to do — **Rationale:** protocol §3 Idle Parking; zero rows in tasks.db and an empty inbox means any work I picked up would be unrequested.
3. **Decision:** Wrote `$ORCHESTRA_DIR/state/builder-3.json` rather than editing `registry.json` — **Rationale:** protocol forbids hand-editing registry.json; the spawner owns it.

## 4. Declared First Effect
`python3 msg_store.py inbox --agent builder-3` — if `build` has replied with a charter or task, act on it; if still empty and `prompts/builder-3.md` still absent, re-park rather than self-assign.

## 5. Next 3 Immediate Actions
1. `python3 msg_store.py inbox --agent builder-3`
2. `ls prompts/builder-3.md` — if present, read it; that is the seat's charter.
3. `sqlite3 /Users/flybyflow/.orchestra/state/tasks.db "select id,title,status from tasks where assigned_to like '%builder-3%' or routed_to like '%builder-3%';"`

## 6. Grounding Canary Questions (Questions Only — No Answers!)
1. **Q1:** Per msg_store `msg_043a9266_14615618`, which single file path did gen1 report as missing despite being referenced by registry.json?
2. **Q2:** Per msg_store `msg_043a9266_14615618`, how many messages were in builder-3's msg_store inbox at gen1 init?
3. **Q3:** Per msg_store `msg_043a9266_14615618`, which legacy inbox directory did gen1 find absent, and why was that the expected result?
4. **Q4:** Per msg_store `msg_043a9266_14615618`, which three tasks.db columns did gen1 match builder-3 against, and how many rows came back?
5. **Q5:** Per msg_store `msg_043a9266_14615618`, which file did gen1 write to record PARKED status, and which file did it deliberately NOT edit?
