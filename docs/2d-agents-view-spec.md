# 2D Agents View Upgrade: Spec

## 1. Goal
The 2D view becomes the everyday control room. At a glance you should see who is up, who is busy, and who is talking to whom. With one click you should see what any agent is doing, read any conversation, and message an agent. The 3D view stays for exploring, and both views share the same data and the same selection.

## 2. Rules for the design
- Nothing important is hidden. A down agent stays on screen, in red.
- One definition of "live" and "down", used everywhere, in both views.
- Calm by default, detail on click. No glow, no camera, no clutter.
- Everything is clickable. Boxes open the agent, lines open the conversation.
- Motion means something. If a dot moves, a message is actually moving.

## 3. Screen layout
**Top bar (fixed, never covered)**
- Title, and the machine name (SRV1397016) with a live indicator
- Summary strip: agents up out of total, messages in the last 24h, active connections, busiest connection right now
- Search box (agents, repos, prompts, files)

**Second row: controls**
- Status filter: All / Active / Down (default All, not Active)
- View toggle: Cards / Table / Topology
- Client and machine filters (keep what exists)
- Layer toggles: traffic dots, message labels, counts on lines, repos and prompts

**Center: the graph** — same tree as now: gm on top, the leads below it, the workers below them

**Right side: one panel with two modes**
- Click an agent to open the Agent panel.
- Click a line to open the Conversation panel.
- One panel is open at a time, and the graph stays visible beside it.

**Bottom: time bar and live ticker**
- Scrubber, window picker (1h, 6h, 24h), and a Live button
- Ticker line: "gm → telegram · reply" style, newest on the left

## 4. The graph
**Agent boxes:** Name, tier badge, machine, status color (green up, amber stale, red down); a small "working now" badge (pulse/spinner); a tiny current-task line, cut off if long; down agents greyed with red border and "last seen" time.

**Lines:** thickness = message count in the window; small dots travel in the message direction; dot color = type (TASK yellow, REPLY blue, TASK REQUEST orange); message count sits mid-line (e.g. "49"), replacing the hub-spoke and mesh labels; hover tooltip "build ⇄ gm · 49 messages · last 2 min ago"; no-traffic line turns thin grey.

**Selection:** selected agent gets a bright border; its connections stay bright, everything else fades to ~30%; click empty space clears.

## 5. Agent panel
Opens on the right when you click an agent box.
- Header: name, status pill (live / stale / down), tier badge
- Details: Role, Tier, Session (tmux), Working folder, Prompt file (click to view), Connection count (click to list; each opens its conversation)
- Live feed (docked, not floating): what the agent is doing as it happens (files read, commands run, notes); tool calls as small tags, plain text as normal lines; auto-scroll with pause + jump-to-latest; long lines wrap, never cut off (the 3D popup cuts them today); copy button per block
- Message box: type+send to that agent; attach button; shows "sending" then "delivered", red on fail; disabled with a note when the agent is down
- Recent problems: short list of the agent's last errors, each with a time

## 6. Conversation panel
Opens when you click a line.
- Header: "build ⇄ gm", total message count, close button
- Filter chips: All / Task / Reply / Task request
- Each card: type label, time, subject, body (first ~8 lines, "expand"), "sender → receiver · status" (sent, delivered, acknowledged)
- Order: newest first, toggle to flip
- Loading: 40 at a time, "load older" at the bottom
- Live: new messages slide in at the top while open
- Jump: clicking either agent name in the header opens that agent's panel

## 7. Time control
Scrubber sets the moment shown; Live snaps to now. Window picker sets how far back thickness/counts/ticker look. Scrubbing replays traffic on the lines. Time setting is shared with 3D — scrubbing one view moves the other.

## 8. Search and filters
Search matches agents first, then repos, prompts, files, grouped by type. Picking an agent selects it and opens its panel. Picking a repo/prompt highlights the agents that use it. Status filter defaults to All; the count next to each option always matches the summary strip.

## 9. Shared state between 2D and 3D
Kept in one place, read by both: selected agent/line; time position and window; search text and filters; layer toggles that make sense in both. Switching views should feel like turning the camera on the same scene.

## 10. Data the view needs
2D must read the SAME source 3D uses: agent list (name, tier, role, status, session, folder, prompt, machine, last seen, current task); connection list (which two agents + link type); messages (type, time, subject, body, sender, receiver, status); message counts per connection per window; a live stream of new messages + each agent's activity; recent errors per agent; a way to send a message to an agent.

## 11. Fix before building
- **The numbers disagree.** 2D says 13 of 14 agents; 3D says 14 agents and 18 live. Decide what "live" counts, and show the same number in both.
- **49 vs 40.** The line says 49 messages, the thread says 40. Either the thread only loads part of history (add "load older") or the count is wrong. Check which.
- **Stats strip covered in 3D.** It runs under the side panels. In 2D it lives in the fixed top bar, so this doesn't repeat.

## 12. Edge cases
Agent down: greyed + red, message box disabled, last-seen shown. No traffic in window: thin grey line + "no messages in this window". Very busy line: thickness caps, dots thin out. Long bodies: collapse with "expand". Connection lost: top banner "reconnecting", live features pause (never show stale as fresh). Small screens: side panel becomes a full-screen sheet.

## 13. Build order
1. Fix the counting mismatch, and show down agents by default
2. Summary strip and fixed top bar
3. Line thickness and message counts
4. Click an agent, open the details panel
5. Click a line, open the conversation panel
6. Selection highlight and fade
7. Travelling message dots and the bottom ticker
8. Live activity feed and message box in the agent panel
9. Time scrubber and window, shared with 3D
10. Search
11. Shared selection between 2D and 3D

Steps 1–5 are the big win: after them, 2D already does most of what 3D does, in a layout that's easier to read.

## 14. What stays out of 2D
Glow, the retro filter, free camera movement, and floating windows. They belong to 3D.

## 15. Done means
- You can find any down agent within two seconds of opening the page
- Any conversation is reachable in two clicks
- You can message an agent without leaving the view
- Both views show the same numbers, and the same agent stays selected when you switch

## 16. Architecture lock (plan, pre-build — 2026-09-29)

Locked per gm's task (`msg_54f39654_22957254`), after bshr's root-cause research
(`msg_90e11c4a_24024374`) and this seat's own direct read of the cited source
(not taken on trust — `api/src/routes/system.ts`, `api/src/routes/agents.ts`,
`dashboard/src/lib/agentStatus.ts` all read tonight). Both §11 blockers are
architecture decisions, not bugs to patch in place — decided here so build
doesn't rediscover them mid-implementation.

**§11 item 1 — "live" gets ONE definition: `GET /api/agents`, not
`GET /api/system`.**
`api/src/routes/agents.ts` is already the correct canonical source: DB-cutover
union over the flat registry, plus an explicit boundary dedup (`agents.ts:263-292`)
that guarantees exactly one row per agent id, alive-first/generation-aware —
built specifically to prevent a retired predecessor row from clobbering its
live successor. `api/src/routes/system.ts`'s `machines.mac/vps.agents_alive`
(`system.ts:59,69,82,91`) is a **raw tmux session count**
(`getVpsTmuxSessions().size` / local session-name membership) — no identity
dedup, no rotation-awareness, no filter for a non-agent pane. That's the "18":
it's counting sessions, not agents. Decision: any UI number labeled "alive" or
"live" reads from `/api/agents`'s deduped `alive` field only. `system.ts`'s
machine-level counts get relabeled (e.g. "N tmux sessions") as an ops/debug
signal, not presented as a competing "live" number anywhere in 2D or 3D. This
is a real fix, not a guess — re-derived independently by reading both routes,
not just accepting bshr's report.
Unresolved, not blocking: bshr could not confirm where "14 agents and 18 live"
or any literal 3D/field-view surface currently renders — the only hit for that
exact phrase in the repo is this spec. Overview.tsx's MachineStatusSection is
the closest existing candidate shape. Flagged to gm/operator as informational;
doesn't change the fix above, which corrects the underlying mismatch
regardless of which screen it was observed on.

**Update (gm, `msg_bb29bcb0_24412115`, 2026-09-29 23:26 UTC):** gm saw the 3D
view directly tonight via an operator screenshot — full-screen orbital/particle
visualization titled "SECOND BRAIN" / "LIVE VPS INFRASTRUCTURE · SRV1397016",
reading "14 agents · 28 repos · 0 clients · 19 live · 26 comm[?] · 453
msgs/24h," 72h window picker, GROW/LIVE controls. Note: **19 live, not 18** —
small enough delta to be time-of-observation drift rather than a different
number, consistent with this being a live, moving count rather than a fixed
discrepancy. gm did not see a URL bar or confirm whether it's served from this
repo or a separate app — consistent with this section's own finding of zero
react-three-fiber in `dashboard/src`, so it's very likely a genuinely separate
service, not confirmed. Not resolved further tonight — not blocking build
order steps 1-5, and not worth waking the operator over; ask for the URL/
screen origin at the next natural check-in instead of guessing further.

**§11 item 2 — "49 vs 40" is a missing architecture, not a pagination bug.**
The connection-line message count doesn't exist in code yet
(`TopologyDiagram.tsx`'s `ConnectionLabel`, lines 96-167, only ever renders the
literal strings "hub-spoke"/"mesh" today — no count, no click handler). Building
it directly on top of any of this codebase's existing counters guarantees a
repeat of the same bug: there are **three independent, already-disagreeing
message stores** live today (SQLite `tasks.db` `iteration_count`, undercounting
because it's only bumped in `reply()` not `send()`; per-agent JSONL logs whose
line counts can drift from the canonical per-conversation JSONL; and the
queue/inbox JSON store, whose `/:id/messages` response truncates to 20 while
reporting an untruncated `total`). Two different send paths don't even write to
the same store, so a message sent one way can be invisible to a count computed
the other way. Decision: pin BOTH the connection-line count and the
conversation panel's thread/pagination (spec §6) to **one** backend —
`msg_store.py`'s SQLite `messages` table, using its `COUNT(*)` for the line
label and its `created_at` cursor for "load older." Building against any other
of the three stores is out of scope for this feature.

**Build order (§13) — confirmed, step 1 scope widened.**
Sequencing holds. Step 1 ("fix the counting mismatch") is actually two fixes,
not one — the agent-alive fix above AND pinning the message-count backend
above. Do both as step 1, since steps 3 and 5 both build directly on the
message-count decision; discovering the three-store problem mid-step-3 would
mean rework. Steps 2, 4, 6-11 unchanged from §13.

**PR #133 overlap — real, confirmed via `gh pr view`, must be coordinated
before build starts.** PR #133 (open, same branch `fix-arturo-mapfile-bash32`)
already modifies `dashboard/src/components/TopologyDiagram.tsx`,
`dashboard/src/lib/agentStatus.ts`, and `api/src/routes/agents.ts` — the exact
files step 1 touches. Build must diff PR #133's actual changes to these three
files before starting (not assume no conflict) and coordinate merge order
rather than building against a version of these files that's about to change
underneath it. All commits through `scripts/git-lock.sh`, per gm's instruction
and the standing shared-checkout discipline.

**Scope not touched here:** §12 edge cases, §14 exclusions, and steps 6-11 of
the build order are unchanged from the original spec — this lock only resolves
the two named blockers and confirms sequencing around them.
