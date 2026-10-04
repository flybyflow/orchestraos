# Agent Protocol — All T2 Specialists

This protocol applies to every specialist agent. Follow it exactly.

## ON STARTUP
0. Read your memory index: `$ORCHESTRA_DIR/memory/<lineage-id>/MEMORY.md` (your spawn prompt names the exact directory). Open only the one-fact files whose index line is relevant to the task in front of you. See **Memory** below.
1. Read predecessor handoff: `docs/HANDOFF_<agent>-next.md` or `~/scripts/omni-context/projects/{project}/handoff.md`
   - If spawned as successor under `[LINEAGE INIT]`: reconcile git state from predecessor's `last_commit_sha`, and author `state/agent-handoffs/{your-id}.readback.md` answering the 5 grounding canary questions with explicit `**Q1**`, `**Q2**`, `**Q3**`, `**Q4**`, `**Q5**` headers.
2. Read your project facts: `~/scripts/omni-context/projects/{project}/facts_db.json`
3. Check your inbox: `$ORCHESTRA_DIR/queue/inbox/{your-id}/`
4. Read any agent_task message to understand your assignment

## WHILE WORKING
Every 10 minutes (or at natural breakpoints), write a progress update:
```json
{
  "type": "progress",
  "from": "{your-id}",
  "to": "{your-pm}",
  "task_id": "{task_id}",
  "status": "working",
  "summary": "What you've done so far and what's next",
  "percent_complete": 50
}
```
Write to: `$ORCHESTRA_DIR/queue/inbox/{your-pm}/`

## ON COMPLETION
1. Write your handoff file: `docs/HANDOFF_{your-agent-id}-next.md`
2. Commit your changes with a descriptive message
3. Write a completion report to your PM's inbox:

```json
{
  "type": "agent_complete",
  "from": "{your-id}",
  "to": "{your-pm}",
  "task_id": "{task_id}",
  "success": true,
  "summary": "One sentence describing what was accomplished",
  "changes": ["List", "of", "specific", "changes", "made"],
  "files_modified": ["path/to/file1.ts", "path/to/file2.tsx"],
  "blockers": [],
  "next_steps": ["Recommended follow-up actions"],
  "git_state": "committed"
}
```

4. Update your agent state: `$ORCHESTRA_DIR/state/{your-id}.json`

## IF BLOCKED
If you can't proceed:
1. Write an escalation to your PM's inbox:
```json
{
  "type": "escalate",
  "from": "{your-id}",
  "to": "{your-pm}",
  "task_id": "{task_id}",
  "summary": "What's blocking you",
  "attempted": ["What you tried"],
  "needs": "What you need to unblock"
}
```
2. Continue with any other work you can do while waiting

## Mandatory Lineage Handoff & Auto-Rotation (70% Soft / 80% Hard)

When context reaches **70%** (or upon receiving `lineage_soft_handoff`):
1. Complete your immediate atomic step.
2. Author and git commit `docs/HANDOFF_{your-agent-id}-next.md` adhering to the Gold Standard schema:
   - Header: agent IDs, generation, timestamp, working dir, last commit SHA.
   - Current Goal & Phase State (`plan_ref`, `phase_n` of `phase_m`, `current_step`).
   - Open Loops & Active Callbacks.
   - Decisions Made & Rationale.
   - Declared First Effect (exact first file modification/command for successor).
   - Next 3 Actions.
   - 5 Grounding Canary Questions (questions and `jsonl:turn-XYZ` source pointers only; NEVER leak answers).
3. If further work is completed before 80%, commit micro-updates to the handoff doc with each atomic commit.
4. If all tasks in `tasks.db` are finished and no work is pending, mark seat as `PARKED` / `STAND_DOWN`.
5. At **80%** context, the Lineage Daemon automatically rotates you to your successor. Finish current commit and stand down cleanly.

## Memory (index + one-fact files + baton)

Every seat keeps a memory directory that survives restarts and rotations. The full walkthrough with a copy-paste prompt is `docs/MEMORY.md`; this is the contract.

**Where:** `$ORCHESTRA_DIR/memory/<lineage-id>/` — `<lineage-id>` is your seat name with any `-gN` / `-genN` generation suffix stripped (`hello-g4` → `hello`), so every generation of a seat reads and extends the same files. `spawn-agent.sh` creates the directory and an empty `MEMORY.md` on first spawn and tells you the path.

**Three parts:**
1. `MEMORY.md` — the index. One line per memory, no content: `- [Title](file.md) — hook`. It is loaded at boot, so keep it short and skimmable.
2. One-fact files — `<type>_<slug>.md`, one fact per file, with frontmatter:
   ```markdown
   ---
   name: <short-kebab-slug>
   description: <one line — what this is, used to decide relevance>
   type: user | feedback | project | reference
   ---
   <the fact. For feedback/project add **Why:** and **How to apply:** lines. Link related memories with [[name]].>
   ```
   `user` = who the operator is; `feedback` = corrections and confirmed approaches; `project` = ongoing work, goals, constraints (convert relative dates to absolute); `reference` = pointers (URLs, tickets, dashboards).
3. The baton — `docs/HANDOFF_<lineage-id>-next.md` (the lineage handoff above). Memory is *durable knowledge*; the baton is *where I stopped and what is next*. Never put one in the other.

**Rules:**
- Before writing, check the index for a file that already covers it — update that file; delete a memory that turns out to be wrong.
- Do not save what the repo already records (code structure, git history, CLAUDE.md) or what matters only to this conversation.
- Write the fact when you learn it, not at handoff time — the handoff may never come (OOM, crash, hard rotation).
- After writing a file, add its one-line pointer to `MEMORY.md` in the same step.
- Shared facts the voice brain should know (client details, project state) go to the **facts store** instead: `POST /api/facts {"text": "..."}` or the dashboard Facts pane. `services/arturo/facts_recall.py` reads that store on Arturo's next turn.

## Brief Updates

When working on a task, send brief updates to the operator via Telegram. Use:
```bash
python3 $ORCHESTRA_ROOT/brief.py <your-agent-id> <stage> "<message>"
```

Stages:
- `ack` — When you receive a task: "On it — reading the codebase now"
- `checkpoint` — At milestones: "Fixed the endpoint. Running tests."
- `result` — When done: "Done. 3 files changed. Tests passing."
- `blocker` — When stuck: "GENERATE returns 500. Need the operator's input on auth format."

Rules:
- Send ack IMMEDIATELY when you start a task
- Send checkpoint every 10-15 minutes of work
- Send result when done
- Send blocker when stuck — don't wait
- Keep messages under 100 words
- DO NOT send "still working" or "thinking about it" — only real updates

## Multi-Model Congruence (mandatory for high-stakes changes)

Before any high-stakes change — architectural decisions, structural refactors, editing files >500 lines, multi-tenant/API-contract changes, or when multiple valid designs exist — do NOT act alone. Use the `multi-model-congruence` skill to seek peer consensus first:
1. Draft `.workspace/proposals/<feature>-spec.md`.
2. `python3 ~/.agents/skills/multi-model-congruence/scripts/consensus.py request --dir "." --topic "..." --proposal "..." --models "<peers>" --agent "{your-id}"`.
3. Peers vote; build only once `consensus.py status` = `CONSENSUS_REACHED`. Resolve REJECT/COUNTER_PROPOSE and re-vote otherwise.

Triggers: "seek congruence", "get consensus", "congruence check".

## RULES
1. Only modify files in your working directory
2. Commit changes before session end
3. ALWAYS write a completion report — your PM is waiting for it
4. ALWAYS write a handoff file — the next agent needs it
5. Never contact clients directly — escalate to PM
6. For high-stakes changes, seek multi-model congruence BEFORE building (see above)
7. **Shared checkout — no raw `git add`/`git commit`.** Most seats work in the SAME
   working tree (no per-seat worktree), so a bare `git add`/`git commit` can sweep up
   another seat's concurrently staged files or land under a misleading message (hit
   live 2026-09-29). Wrap your full add+commit sequence through `scripts/git-lock.sh`
   instead: `scripts/git-lock.sh bash -c 'git add <files> && git commit -m "..."'`.
8. **One worktree per seat, always — never share an ad hoc `/tmp/...` path with
   another seat.** Two seats independently working in the same ad hoc worktree (hit
   live 2026-09-30, `/private/tmp/2dv2`, build + review) moved HEAD under each other
   silently — one seat's commits landed detached with the branch ref still pointing
   at the old commit (recovered cleanly via reflog + `git branch -f`, verified
   fast-forward both directions before forcing), and the other's bisect ran against
   an unreconstructable tree at the moment HEAD moved. Both seats followed every
   other rule correctly; nothing in the protocol said which *directory* a seat was
   in, and a commit SHA silently assumes everyone gating it is looking at the same
   tree. Fix, cheap and total: `git worktree add /tmp/<seat>-<branch> <branch>`
   before starting any multi-commit work outside the shared checkout — costs
   seconds, removes the whole class of bug. If you're ever handed a SHA to gate,
   also get the worktree path it lives in, not just the SHA — and if
   `git rev-parse --abbrev-ref HEAD` ever prints `HEAD` (detached) in a tree you
   didn't intentionally detach, stop and find out why before committing further.
9. **Shared tooling daemons (the gstack browse CDP driver) have the same
   collision class as shared worktrees.** Hit live 2026-09-30: `test` and `build`
   drove the same browse daemon concurrently to visually verify different things —
   `test`'s tab kept getting redirected to `build`'s live dev server even after a
   fresh tab and a full daemon restart, pure resource contention, not a bug in
   either seat's setup. Fourth shared-resource collision the same day (after the
   main-checkout git race, the ad hoc worktree collision, and TMUX env
   inheritance) — the pattern is "one shared mutable thing, two seats, no
   isolation," not specific to git. No structural fix shipped for this one yet
   (unlike worktrees). Until one exists: if two seats need to visually verify
   concurrently, coordinate/stagger rather than assume the daemon multiplexes
   cleanly, and if a browser tab keeps landing on the wrong page after a fresh
   tab + daemon restart, suspect contention before suspecting your own setup.
   **Concrete mitigation, adopt now:** every rendered-page claim (a screenshot, a
   measurement, a "it renders") must assert the actual `location.href`/port in the
   same call that produces the result — not a separate check beforehand. Two
   independent seats hit silent tab-hijacking from a concurrent seat tonight
   (`build`, `test`) and both only caught it because they'd already adopted this
   habit; without it, a wrong-port reading goes into a report as verified fact.
10. **Re-check current HEAD before dispatching work from any report on a
    multi-agent branch — a report naming the commit it ran against is not enough
    on its own.** On a branch with several agents committing, HEAD moves faster
    than any report describing it. Hit live 2026-09-30/10-01 four times in one
    night in different forms (stale operator QA re-raising already-fixed items,
    `build` dispatching `builder-1-g2` onto two already-fixed defects by
    redirecting straight from a report without re-reading HEAD first, the speed
    control and arrow-sprites items each getting re-asked after landing). Cheap
    fix, adopt before any dispatch sourced from a report rather than live
    observation: `git log --oneline <report's-commit>..HEAD`, plus a grep for the
    symbol/function the fix would introduce, to confirm the work doesn't already
    exist before assigning it.
11. **Never run bare `git add -A`/`git add .` in any shared or ad hoc clone —
    always add by explicit pathspec, and verify what's staged before committing.**
    Second occurrence of the same failure mode (first was rule 8's root cause):
    hit live 2026-10-03 on toddito, `build` working in a `/tmp` clone `test` was
    also using — a bare `git add -A` swept in 392 lines of `test`'s uncommitted
    local workaround, including a silent RENAME of two migration files, under a
    commit `build` reported as "docs-only." `build` caught it themselves (by
    checking `git diff --cached --name-status` instead of trusting their own
    prior characterization of the commit) and reverted cleanly before anything
    reached main — but the near-miss is the second time a shared ad hoc clone has
    caused this class of damage, and this time a per-seat worktree (rule 8)
    wasn't even the gap — two seats were in the *same* `/tmp` clone, which rule 8
    already forbids but didn't prevent in practice. Concrete habit: `git add
    <file> <file>...` by name, never a wildcard add, in anything other than your
    own dedicated worktree; and before any commit whose message doesn't
    exhaustively list every changed file, run `git diff --cached --name-status`
    and confirm the list matches what you meant to change.
12. **Bare `/tmp/<filename>` is fleet-global — put ALL scratch under
    `/tmp/<your-seat>/`, not just worktrees.** Third confirmed instance of the
    same root cause as rules 8 and 11 (2026-10-03): `build`'s own mutation-proof
    workflow copied source to unnamespaced gold paths (`e.bak`, `s.bak`) and
    restored from them all night — a write from another seat between copy-out
    and copy-back would silently corrupt the restore, with no unexpected
    filename to notice (unlike the `git add -A` case). What actually caught it
    wasn't naming discipline, it was an independent reference check (a
    pre-copy shasum / clean `git status`) that happened to already be there for
    other reasons — "luck wearing discipline's clothes," in `build`'s words.
    The pattern generalizes past git: `/tmp` and shared checkouts are
    fleet-global, every seat reaches for the same obvious filename, and nothing
    in `cp`, `git add -A`, or `msg_store.py send --body-file` knows a path is
    shared. **Convention, adopt now, costs nothing**: every seat's scratch —
    worktrees, `.bak`/gold-copy files, message bodies passed via `--body-file`,
    anything written to `/tmp` — goes under `/tmp/<seat>/...`, never bare
    `/tmp/<filename>`.
    **Correction (retracted same night): for gold/restore-reference files,
    checksum verification is NOT blind and namespacing there is cheap-but-
    redundant, not load-bearing.** `build` and `review` once had byte-identical
    gold copies (filenames three characters apart) in an interleaved window —
    initially reported as a case where a shasum check would falsely report
    "restored" after reading the wrong seat's file. Retracted on re-derivation:
    if two files are byte-identical, restoring from either writes the exact
    same correct bytes — nothing is corrupted, and the shasum match is a TRUE
    positive. A mix-up only causes damage when the copies have *diverged*, and
    that's exactly the case where a shasum mismatch fires loudly. There is no
    window where a gold-copy mix-up causes harm AND the checksum misses it.
    Namespace these anyway (it's free), but don't treat it as closing a real
    gap — the checksum already does.
    **What's actually load-bearing, and sharper for the correction**: message
    bodies passed via `--body-file` have no check available BEFORE they go
    out — narrower than "no safety net at all": `msg_store.py get --message-id
    <id>` returns the sent body after the fact, so a verification path exists,
    it's just post-hoc. Of every file-based near-miss this family of incidents
    produced, this is the only one with no PRE-send check. That asymmetry —
    not "namespacing beats checksums" — is the real argument for namespacing
    `--body-file` paths under `/tmp/<seat>/`.
    **Concrete interim practice, adopt now, live-demonstrated the same night**:
    after any `--body-file` send, read back the returned message id
    (`msg_store.py get --message-id <id>`) before considering the send done.
    One command. It was proposed for the wrong-content case but caught a
    different, equally real one in practice minutes after being proposed: a
    send inside a `$(...)` command substitution executed for real while the
    next line's narration claimed it had been skipped — the read-back caught
    the stray send inside a minute. Your own narration of what your shell did
    is not evidence; the read-back is.
    **Narrowing, costs nothing**: "our core 2 repos" interpretations and other
    low-stakes ambiguities aside, when in doubt about whether an uncommitted
    change in the shared checkout is safe to reset/discard, it is not yours to
    judge — `git stash` it (never `git reset --hard`) before any experimental
    commit-then-reset cycle in the shared checkout, and pop the stash back
    immediately after. Hit live 2026-10-04: an experimental probe-commit/reset
    cycle (testing a pre-commit hook) wiped an unrelated uncommitted edit to
    this very file sitting in the shared checkout at the time — nobody's `git
    add -A` this time, a bare `git reset --hard` during unrelated testing is
    the same class of damage by a different command. Reconstructed from a
    seat's own prior context since no stash existed to recover it from;
    costs nothing to stash first and would have made this recoverable in
    seconds instead of requiring reconstruction.
13. **Fixing one bug can arm a different, previously-contained one -- ask "what
    does this fix make newly reachable?" before running anything destructive
    right after a fix, especially on another project's repo.** Hit live
    2026-10-04 on keonda.io: a store-split bug (two modules pointed at
    different data directories) was silently containing a SEPARATE,
    pre-existing destructive bug (a `--demo` function that unlinked real
    tenant files instead of isolating in a tempdir, unlike every other
    `--demo` in the repo). Fixing the store-split bug pointed the demo
    function at the real data for the first time, then running the standard
    post-change self-test battery deleted real pilot data (2 real events, 1
    real RSVP) -- fully recovered via cross-checked independent logs, but
    Time Machine was unavailable as a fallback, so this was recoverable, not
    *safely* recoverable. The agent had identified this exact footgun an hour
    earlier and written it down as a caution, then armed it themselves
    without connecting the two. **The missing step**: after any fix that
    changes what a function can reach (a path, a scope, a permission, a data
    source), explicitly ask whether anything downstream -- especially
    something you already know is unsafe in isolation -- just became
    reachable for the first time, before running it. This applies hardest on
    any repo holding real user/client/pilot data, not just this fleet's own.
