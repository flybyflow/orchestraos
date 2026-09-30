# Design: cross-edge rendering overlay for the 2D Agents View topology

- **Requested by:** operator GO-ahead via gm (`msg_82aec53c_63958954`,
  2026-09-30 10:25 UTC), for v2's org-chart-edges work, item (1).
- **Stakes:** everything downstream in this sprint (persistent flow-cue
  dashes, labelled pulses, Play replay) is specified to reuse whatever
  edge-rendering mechanism this design produces — a wrong foundation here
  compounds through three more build phases.
- **Constraint, confirmed in code (`dashboard/src/components/
  TopologyDiagram.tsx`):** the current renderer has no SVG/canvas layer at
  all. Every line today is a literal CSS `<div>` border between directly
  adjacent flex siblings in a strict parent-then-children tree. Hierarchy
  edges and the existing tree layout **stay as-is** — this design adds a
  new layer alongside them, not a replacement.
- **Multi-model congruence note:** the standing protocol
  (`prompts/_agent-protocol.md`) names `~/.agents/skills/
  multi-model-congruence/scripts/consensus.py` for exactly this class of
  decision. That script does not exist on this install — checked, not
  assumed (flagged separately to gm as a real infra gap). Substituting an
  independent `codex exec` review of this design as the practical
  equivalent, since `codex` the CLI is installed even though its skill
  wrapper is an empty stub. Not blocking the build start on this gap, per
  gm's explicit "don't let it stall" instruction.

## 1. What has to be true when this is done

- Any two agents (or an agent and an external endpoint) with real message
  traffic in the window get a drawable, clickable line between them, even
  when they are not adjacent in the hierarchy tree.
- That line is visually distinct from a hierarchy edge (thinner, dashed or
  curved, lower contrast) and carries the same conventions hierarchy edges
  already use: thickness `sqrt(count)`, a count label, click opens the
  conversation panel, hover shows a tooltip.
- External non-agent endpoints (telegram, operator, approval-loop,
  message-router) get their own small nodes, positioned so they don't
  disrupt the existing hierarchy tree's layout, and participate in the
  same edge system as real agents.
- No edge visually crosses through a node's box.
- A lead row that wraps to a second line keeps its hierarchy "bus" line
  intact (existing v1 behavior — this design must not break it).
- Toggleable independently of hierarchy edges.
- The same position/edge machinery has to be reusable, without rework, for
  round 2's persistent flow-cue dashes and labelled pulses — those are
  literally "more things drawn along the same edges," not a new system.

## 2. Architecture

**A separate `<svg>` overlay, absolutely positioned over the existing tree,
`pointer-events: none` on the `<svg>` itself with `pointer-events: auto` on
individual interactive elements inside it.** The flex tree keeps rendering
hierarchy nodes and hierarchy edges exactly as today; the overlay only adds
cross-edges and external-node markers on top.

### 2.1 Position tracking

- Each node (hierarchy agent, external endpoint) gets a `ref` on its
  container element.
- A single `useLayoutEffect` (not `useEffect` — must run before paint to
  avoid a visible jump) walks all current refs, calls
  `getBoundingClientRect()`, converts to coordinates relative to the
  overlay's own container (subtract the container's own
  `getBoundingClientRect()` origin), and stores `{id: {cx, cy, width,
  height}}` in a `positions` state map.
- Re-runs on: initial mount, a `ResizeObserver` on the container (catches
  window resize and font-load reflow), and whenever the *set* of rendered
  node ids changes (toggle state, filter changes, data changes). Re-running
  on every render would be wasteful and is not needed — position only
  changes when layout changes, not when e.g. a message count updates a
  label's text.
- Failure mode to guard explicitly: a ref that hasn't mounted yet (node
  filtered out, or first paint before the DOM exists) must not throw —
  skip missing refs, don't crash the layout effect for the nodes that DO
  exist.

### 2.2 External endpoint nodes ("the rim")

- Computed as: every distinct `from_agent`/`to_agent` value present in
  `/api/messages/pair-counts` output that is NOT in the live agents list.
  Confirmed in `api/src/routes/messages.ts` that `pairCounts` is unfiltered
  by agent registry — no backend change needed, this is a frontend
  computation only.
- Layout: a fixed perimeter placement (e.g., evenly spaced along the
  bottom edge of the container, below the lowest tier of workers, OR a
  loose arc if the bottom edge gets crowded) — deliberately NOT
  force-directed or physics-based. A fixed, deterministic rim keeps the
  overall picture calm (spec §2, "calm by default") and avoids the
  overlay needing a simulation loop.
- Each rim node gets the same `ref`-based position tracking as hierarchy
  nodes — no special-cased edge-drawing logic for "edge to a rim node" vs.
  "edge to a hierarchy node."

### 2.3 Cross-edge drawing and the "no lines through boxes" constraint

- For each pair with traffic where BOTH ends have a known position and the
  pair is not already represented by a hierarchy edge: draw one `<path>`
  as a quadratic Bezier curve between the two node centers, not a straight
  `<line>`. A curve, not a line, for two reasons: it reads as visually
  distinct from hierarchy edges (which are straight), and it gives a
  cheap, real lever against the "no lines through boxes" constraint.
- Straight-line-through-a-box check: before drawing, test the direct
  straight-line segment between the two endpoints against every OTHER
  node's bounding box (not the two endpoints' own boxes). If it intersects
  one or more boxes, offset the curve's single control point
  perpendicular to the direct line, scaled by how many boxes it would
  otherwise cross (more crossings → larger offset), capped at a maximum
  offset so a far-apart pair doesn't produce an absurd loop. This is a
  bounded, deterministic geometry check — not a general graph-layout
  solver, and it doesn't need to be perfect on the first pass (spec
  doesn't require zero edge-edge crossings, only no edge-through-box).
- Click/hover: SVG paths support `onClick`/`onMouseEnter` natively. Use a
  two-path technique — a thin visible stroke (the drawn line) plus a wider
  transparent stroke on top for the actual hit target (`stroke="transparent"
  strokeWidth={12}`), so a 1-2px line is still comfortably clickable
  without inflating its visual weight. Cursor `pointer` on the hit path
  only.
- Thickness: `sqrt(count)` over the busiest edge ACTUALLY DRAWN in the
  current view (same convention `TopologyDiagram.tsx` already uses for
  hierarchy edges — `busiest` must be recomputed to include cross-edges
  once they exist, not left as hierarchy-only).

### 2.4 Layering and toggles

- Render order (SVG paints in document order, later = on top): hierarchy
  edges (existing, unchanged, in the flex tree below the overlay) → cross
  edges (dimmer/thinner) → node boxes (flex tree, same z-index as today,
  ABOVE the edge overlay so text/interactive controls in a node are never
  obscured by a line) → later: flow-cue dashes and pulses draw on the SAME
  overlay, above cross edges.
- This means the overlay itself needs to be split or z-indexed so edges
  sit visually BEHIND node boxes but the overlay's SVG element as a whole
  can't simply be "on top of everything," or a thick edge would visually
  cover node text. Concretely: the overlay `<svg>` sits between the
  hierarchy-tree layer and a following sibling that re-renders just the
  node boxes' interactive chrome — OR, simpler and avoiding a double-render
  of nodes: give each node box a solid background (already true today —
  `bg-neutral-900`) and a z-index above the overlay, so an edge visually
  passing near a box is naturally covered by the box's own background.
  **Recommend the simpler option** — no double-rendering, relies on
  existing opaque node backgrounds, one fewer synchronization point to get
  wrong.
- Toggle state: a `layers` object in the page's existing state (same
  pattern as v1's Cards/Table/Topology view toggles) —
  `{hierarchy: true, cross: true, external: true, counts: true}` today,
  extended with `{pulses, flowCues}` in round 2 without restructuring.
  Default per gm's instruction: hierarchy + top-12-cross-edges-by-count,
  with an explicit "show all" toggle for the rest.

## 2.5 Independent review (codex, substituting for the missing consensus.py — §0) and corrections made

Real, substantive pushback, not a rubber stamp — two genuine gaps in the
original draft above, corrected here rather than only noted:

1. **Stale geometry was under-specified.** The original invalidation set
   (container `ResizeObserver` + node-id-set changes) misses real cases:
   node dimensions change from status/task-text updates, selection
   styling, and font loading, none of which change the container's
   observed size or the set of node ids. **Correction: `ResizeObserver` on
   every rendered node individually, not just the container, batched via
   `requestAnimationFrame`** so many simultaneous node resizes don't
   thrash the position recompute. **Also missed entirely: the container
   scrolls horizontally (`overflow-x-auto`, confirmed present in this
   component tonight during an earlier review pass) — overlay coordinates
   must be computed relative to the CURRENT scroll offset, with a scroll
   listener triggering recompute, or every cross-edge silently drifts the
   moment a user scrolls.** Stale edge endpoints are worse than missing
   edges — they look plausibly connected to the wrong thing rather than
   visibly absent.
2. **The "no lines through boxes" routing claim didn't actually hold.**
   Testing the straight chord for intersection, then offsetting one
   quadratic control point, does not guarantee the resulting *curve*
   avoids the rectangle — a single control-point nudge can still produce a
   Bezier that clips a corner. **Correction: after computing a candidate
   curve, sample points along it (e.g. 10-20 points via the quadratic
   Bezier formula) and check each against every node's bounding box; if
   any sample point falls inside a box, increase the offset and retry, up
   to a capped number of attempts; if no simple single-control-point curve
   clears all boxes, fall back to a polyline route (two or three straight
   segments) rather than shipping a curve known to clip.** Opaque node
   backgrounds remain a real visual safeguard but must not be treated as a
   substitute for actual routing correctness.

Also adopted as a straightforward improvement: **edge endpoints clip to
the node box's boundary, not its center** — a curve should visually
originate/terminate at the edge of a box, not appear to emerge from
underneath its label.

One correction to this design doc's own §0 framing: connections in the
current renderer are not literally "CSS borders between adjacent flex
siblings" — they are narrow, background-colored `<div>` segments embedded
directly in each parent→child column of the tree. Doesn't change the
architecture conclusion (still no SVG/canvas today), just a more accurate
description of what "no SVG/canvas exists" actually looks like in code.

## 3. What this design does NOT solve, flagged rather than glossed

- General graph-layout crossing minimization — only the specific
  "no edge through a box" constraint is handled; two cross-edges can still
  cross each other, which the spec doesn't ask to avoid.
- Real-time re-layout during Play replay at high speed — the position
  tracking re-runs on node-set changes, not on every animation frame;
  Play (round 2, last) will need its own perf pass once built, not
  assumed free here.
- Mobile/narrow-viewport behavior for the rim — the fixed perimeter
  placement assumes reasonable width; narrow-viewport handling for this
  specific layer isn't sized here (same class of gap review already found
  in the v1 top bar).

## 4. Effort read, not fabricated

Real new architecture, not a tweak: position tracking + SVG overlay +
curve-routing geometry + click/hover targets is a genuine multi-part build,
sized earlier (this seat, `msg_0a9b7b60_63645440`) as the single biggest
piece of the v2 sprint. This design doesn't change that sizing — it makes
the shape concrete enough to build against, which is what was asked for.
