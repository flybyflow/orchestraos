/**
 * Pure half of the cross-edge SVG overlay (design §2.1, §2.3, §2.4).
 *
 * Everything here is a plain function over plain data so it can be tested
 * without a DOM. The overlay component owns only what genuinely needs the
 * browser: refs, getBoundingClientRect, ResizeObserver, rAF and the scroll
 * listener. That split is deliberate — dashboard/src/components has zero test
 * files against ~2043 lines, so any logic left in a component is logic no test
 * can reach. Last night that exact gap put 8 of 13 agents outside the org
 * chart under a fully green suite.
 */
import type { Box } from './edgeRouting';

/** A DOMRect-shaped input. Declared structurally so tests need no DOM. */
export interface RectLike { left: number; top: number; width: number; height: number }

/**
 * Convert a node's viewport rect into overlay-local coordinates.
 *
 * `scrollLeft`/`scrollTop` are NOT optional decoration. The topology container
 * is `overflow-x-auto` (TopologyDiagram.tsx), and getBoundingClientRect returns
 * VIEWPORT coordinates, which already move as the user scrolls — but the
 * overlay <svg> is positioned inside the scrolling content, so its own origin
 * moves too. Subtracting the container origin handles that; the scroll offsets
 * are here for the case where the overlay is pinned to the container's padding
 * box instead. Design §2.5 correction 1: stale endpoints are worse than absent
 * ones, because a line that connects to the wrong thing still looks connected.
 */
export function toLocalBox(
  id: string,
  rect: RectLike,
  container: RectLike,
  scrollLeft = 0,
  scrollTop = 0,
  // CSS transform scale of the diagram wrapper: getBoundingClientRect reports VISUAL px,
  // the overlay svg draws in LAYOUT px, so divide the scale back out (1 = unscaled).
  scale = 1,
): Box {
  const s = scale > 0 ? scale : 1;
  const left = (rect.left - container.left) / s + scrollLeft;
  const top = (rect.top - container.top) / s + scrollTop;
  const width = rect.width / s;
  const height = rect.height / s;
  return {
    id,
    cx: left + width / 2,
    cy: top + height / 2,
    width,
    height,
  };
}

/**
 * Are two position maps equivalent?
 *
 * This is not an optimisation — it is what stops an infinite render loop, and
 * it exists because I shipped that loop. The overlay measures in a
 * useLayoutEffect that must run after EVERY render (a node's box can move
 * without any prop changing), and measuring builds a fresh Map. A fresh Map is
 * never reference-equal to the previous one, so an unconditional setState after
 * every render re-renders forever: React bails out with "too many re-renders",
 * unmounts the tree, and the whole page goes blank. Caught by review's
 * before/after control — root.childElementCount 1 on the previous commit, 0 on
 * mine, same browser, same minute.
 *
 * So the measure pass must be idempotent: compute, compare, and only commit
 * when something actually moved.
 */
export function samePositions(a: Map<string, Box>, b: Map<string, Box>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const [id, x] of a) {
    const y = b.get(id);
    // Sub-pixel jitter from fractional layout would otherwise re-render forever
    // at a lower frequency — round-trip through a whole pixel before comparing.
    if (!y
      || Math.round(x.cx) !== Math.round(y.cx)
      || Math.round(x.cy) !== Math.round(y.cy)
      || Math.round(x.width) !== Math.round(y.width)
      || Math.round(x.height) !== Math.round(y.height)) return false;
  }
  return true;
}

/**
 * The overlay <svg>'s own width/height must cover every registered node, not just the
 * container's visible viewport (design gap, operator QA 2026-09-30): sizing the svg from
 * `container.clientWidth` alone left it NARROWER than the tree whenever the tree overflows
 * horizontally (1000px window: svg 630, tree content 854 — build/builder-1/builder-2 sit past
 * the svg's own right edge), and since an <svg>'s default overflow is hidden, any edge or pulse
 * reaching those nodes was invisible past that edge even though `positions` had the right
 * coordinates for them all along.
 *
 * Deliberately NOT `container.scrollWidth`: the overlay svg is itself an absolutely-positioned
 * child of that same scrolling container, so scrollWidth already includes whatever the svg's
 * OWN width contributed on the previous measure — a size fed from a number it also produces.
 * That exact feedback loop is this file's own toLocalBox comment's "the svg could only ever
 * grow" bug, the reason clientWidth replaced scrollWidth as the source in the first place.
 * `positions` breaks the loop: every node box comes from ITS OWN element's
 * getBoundingClientRect, never from the svg, so the max right/bottom edge across all of them is
 * the tree's true content extent, independent of whatever the svg is currently sized to.
 */
export function overlayContentSize(
  positions: Map<string, Box>,
  clientWidth: number,
  clientHeight: number,
): { w: number; h: number } {
  let maxRight = clientWidth;
  let maxBottom = clientHeight;
  for (const box of positions.values()) {
    maxRight = Math.max(maxRight, box.cx + box.width / 2);
    maxBottom = Math.max(maxBottom, box.cy + box.height / 2);
  }
  return { w: Math.round(maxRight), h: Math.round(maxBottom) };
}

export interface PairLike { a: string; b: string; count: number }

export interface CrossEdgeSelection<T extends PairLike> {
  /** Pairs to draw, highest count first. */
  drawn: T[];
  /** Pairs held back only because of the top-N cap — "show all" reveals exactly these. */
  hiddenByCap: T[];
  /** Pairs that cannot be drawn at all: an endpoint has no position. */
  unpositioned: T[];
  /** Pairs already drawn by the hierarchy tree, so the overlay must not double-draw them. */
  hierarchical: T[];
}

/**
 * Decide which pairs the overlay draws.
 *
 * Four outcomes, kept separate on purpose. Collapsing "capped" and
 * "unpositioned" into one bucket would make "show all" silently fail to reveal
 * an edge it promised, and would hide the fact that a pair is undrawable for a
 * structural reason rather than a display preference. Right now exactly one
 * pair is in `unpositioned` — gm-g2 <-> operator, where gm-g2 is a retired seat
 * PR 137 hides on purpose — which is why "31 connections" can only ever draw
 * 30, and why that is a statement we can make rather than a gap someone finds.
 *
 * `hierarchyKeys` are pairs the flex tree already draws as parent→child lines;
 * drawing them again on the overlay would double the apparent thickness.
 */
export function selectCrossEdges<T extends PairLike>(
  pairs: T[],
  positionedIds: Set<string>,
  hierarchyKeys: Set<string>,
  keyOf: (a: string, b: string) => string,
  topN: number | null,
): CrossEdgeSelection<T> {
  const hierarchical: T[] = [];
  const unpositioned: T[] = [];
  const candidates: T[] = [];

  for (const p of pairs) {
    if (hierarchyKeys.has(keyOf(p.a, p.b))) { hierarchical.push(p); continue; }
    if (!positionedIds.has(p.a) || !positionedIds.has(p.b)) { unpositioned.push(p); continue; }
    candidates.push(p);
  }

  // Count desc, then a stable id tiebreak so equal-count edges do not reorder
  // between renders and make the picture twitch.
  candidates.sort((x, y) => y.count - x.count || keyOf(x.a, x.b).localeCompare(keyOf(y.a, y.b)));

  const cap = topN == null ? candidates.length : Math.max(0, topN);
  return {
    drawn: candidates.slice(0, cap),
    hiddenByCap: candidates.slice(cap),
    unpositioned,
    hierarchical,
  };
}

/**
 * The denominator for edge thickness.
 *
 * It must be the busiest edge ACTUALLY DRAWN, not the busiest in the data —
 * the same rule TopologyDiagram already applies to hierarchy edges, and for the
 * same reason review found there: scaling against a number nobody can see makes
 * every visible line systematically too thin, which is internally consistent
 * and quietly wrong. Cross-edges now share the denominator with hierarchy edges
 * so a thick cross-edge and a thick hierarchy edge mean the same traffic.
 */
export function busiestDrawn(drawn: PairLike[], hierarchyMax = 0): number {
  let max = hierarchyMax;
  for (const p of drawn) if (p.count > max) max = p.count;
  return max > 0 ? max : 1;
}

/**
 * Dead (historically real, silent in this window) vs quiet (alive, just below
 * the window edge). Two visual states, per spec — one grey line for both would
 * say "nothing here" about a connection that is merely idle.
 *
 * `lastAt` is all-time, which is the only thing that can tell them apart: a
 * windowed last_at is null for exactly the rows in question.
 */
export type EdgeLiveness = 'live' | 'quiet' | 'dead';

/**
 * Which way does this edge mostly flow?
 *
 * `null` is a real answer, not a failure to decide. `ea<->gm` is 53/53 today and
 * drawing an arrow on it would invent a direction the data does not have — a
 * coin-flip rendered as a fact. A one-message lead is not a direction either,
 * so the majority has to clear a margin before it earns an arrowhead.
 *
 * The threshold lives here rather than in the API deliberately: how lopsided a
 * conversation must be before it reads as one-way is a display judgement, and
 * the endpoint should keep returning the two raw counts so this can change
 * without a backend deploy.
 */
export function edgeDirection(
  aToB: number, bToA: number, minShare = 0.6, minDelta = 2,
): 'ab' | 'ba' | null {
  const total = aToB + bToA;
  if (total === 0) return null;
  if (Math.abs(aToB - bToA) < minDelta) return null;
  const share = Math.max(aToB, bToA) / total;
  if (share < minShare) return null;
  return aToB > bToA ? 'ab' : 'ba';
}

/**
 * `nowMs` is the moment being VIEWED, not the wall clock. When the time bar is
 * scrubbed back, that is `asof`.
 *
 * Getting this wrong produced a claim the data cannot support. Scrubbed to
 * ~Sep 25, the header correctly read 2 messages / 1 connection while twelve
 * lines drew and nine tooltips said "quiet — last traffic just outside the
 * window" about pairs whose last traffic was days AFTER the moment on screen.
 * The all-time last_at was being compared against real now, so a conversation
 * that had not happened yet was described as having just tailed off.
 *
 * A pair whose only traffic is in the viewed moment's FUTURE is not quiet and
 * not dead — it does not exist yet. `absent` says so, and the caller draws
 * nothing rather than inventing a state for it.
 */
export type EdgeLivenessFull = EdgeLiveness | 'absent';

export function edgeLiveness(
  count: number,
  lastAtMs: number | null,
  nowMs: number,
  quietWindowMs: number,
): EdgeLivenessFull {
  if (count > 0) return 'live';
  if (lastAtMs == null) return 'dead';
  // Strictly after the viewed moment: this connection has no history at asof.
  if (lastAtMs > nowMs) return 'absent';
  return nowMs - lastAtMs <= quietWindowMs ? 'quiet' : 'dead';
}

/**
 * Drop pairs that did not exist yet at the viewed moment — BEFORE any top-N cap runs, not
 * after (operator live QA, 2026-09-30). Scrubbed to Sep 25, a top-12 cap applied to the full,
 * un-asof-filtered pair list drew only 2 edges, and even uncapped ("show all") drew only 6,
 * with at least 15 real existed-by-asof pairs dropped. The cap was capping the wrong set: a
 * pair with heavy traffic TODAY but none yet at Sep 25 could easily be in the count-sorted top
 * 12, get discarded as `absent` downstream, and take a cap slot that belonged to a pair that
 * genuinely existed at that moment with it. Filtering first means the cap only ever competes
 * among pairs that could actually be drawn — selectCrossEdges never even sees the absent ones.
 */
export function filterExistedByAsof<T extends PairLike & { last_at: string | null }>(
  rows: T[],
  viewedNowMs: number,
  quietWindowMs: number,
): T[] {
  return rows.filter((p) => {
    const lastAt = p.last_at ? Date.parse(p.last_at) : null;
    const liveness = edgeLiveness(p.count, Number.isNaN(lastAt as number) ? null : lastAt, viewedNowMs, quietWindowMs);
    return liveness !== 'absent';
  });
}

/** Minimal shape the GROW fold needs off a replayed event. Deliberately not ReplayEvent:
 *  this file must not import the replay engine, or the pure geometry layer starts
 *  depending on the playback layer for what is two set insertions. */
export interface GrowEvent {
  from?: string;
  to?: string;
  /** 'spawn' reveals `id` alone — a seat can be born with no edge. */
  kind?: string;
  id?: string;
}

export interface GrowBorn {
  nodes: ReadonlySet<string>;
  edges: ReadonlySet<string>;
}

/**
 * GROW bookkeeping: everything revealed by the first `idx` events. A node is born by any
 * event that touches it; an edge is born by a message between its two ends. Two sets rather
 * than one derived from the other, because an edge needs both ends but a spawn births a
 * node with no edge, so neither implies the other.
 *
 * Takes the replay's own `idx` (the count of events already fired) rather than accumulating
 * frame by frame. The incremental version was faster per frame but had to live in a
 * useEffect that called setState synchronously, which is the cascading-render pattern
 * react-hooks/set-state-in-effect exists to stop — and stopping cascading renders during a
 * 60fps replay is precisely the thing we care about here. A recompute off a single monotonic
 * number is pure, memoisable and cannot desynchronise from the cursor.
 *
 * ponytail: O(idx) per recompute, and the memo recomputes on every frame that fires an
 * event. Real windows are ~1k events so this is nothing; the API's ceiling is 20000, where
 * it would be worth folding incrementally inside the replay hook's own rAF callback (a
 * callback, not an effect, so the lint rule does not apply).
 */
export function bornUpTo(
  events: readonly GrowEvent[],
  idx: number,
  pairKeyFn: (a: string, b: string) => string,
): GrowBorn {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  const end = Math.min(idx, events.length);
  for (let i = 0; i < end; i++) {
    const e = events[i];
    if (e.kind === 'spawn') { if (e.id) nodes.add(e.id); continue; }
    if (!e.from || !e.to) continue;   // a half-event reveals nothing; it cannot name an edge
    nodes.add(e.from);
    nodes.add(e.to);
    edges.add(pairKeyFn(e.from, e.to));
  }
  return { nodes, edges };
}

/**
 * Node scaling by traffic (operator ask, ported from /field: "busy agents bigger or
 * brighter"). Every pair's count is credited to BOTH ends — an agent's own busy-ness is its
 * total traffic, not just one direction of it.
 */
export function trafficByAgent<T extends PairLike>(pairs: readonly T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of pairs) {
    counts.set(p.a, (counts.get(p.a) ?? 0) + p.count);
    counts.set(p.b, (counts.get(p.b) ?? 0) + p.count);
  }
  return counts;
}

/** 0 (baseline) .. 3 (busiest). Four DISCRETE tiers, not a continuous multiplier: the name and
 *  tier badge must stay exactly the same font size at every tier (the operator's own "keep
 *  name and tier badge legible" constraint) — a continuous scale would either do nothing
 *  visible at small ratios or blur/distort text at large ones. Only padding/min-width/glow
 *  respond to the tier; text never does.
 *
 *  RELATIVE to the busiest node actually in view, not an absolute message-count threshold —
 *  same reasoning as busiestDrawn() above: scaling against a number nobody can see (or that
 *  does not exist on a quiet fleet) makes every node either maxed-out or flat, which is
 *  internally consistent and quietly wrong either way. */
export type NodeScaleTier = 0 | 1 | 2 | 3;

export function nodeScaleTier(count: number, maxCount: number): NodeScaleTier {
  if (maxCount <= 0 || count <= 0) return 0;
  const frac = count / maxCount;
  if (frac >= 0.75) return 3;
  if (frac >= 0.4) return 2;
  if (frac >= 0.15) return 1;
  return 0;
}

/** How the standing arrow-sprite layer's density and speed track a pair's recent rate
 *  (operator, 2026-09-30: "density or speed by the recent message rate"). Both, each bounded:
 *  a quiet pair still gets one slow sprite (reads as "alive, barely") rather than nothing, and
 *  a very busy one caps at 3 sprites / a 2.5s lap rather than becoming strobing noise. sqrt, not
 *  linear, so the jump from 1 to 10 messages moves the needle about as much as 10 to 100 does —
 *  message counts are the same kind of long-tailed distribution busiestDrawn()/nodeScaleTier()
 *  above already treat as relative, not absolute. */
export function spriteAnimation(count: number): { spriteCount: 1 | 2 | 3; lapSeconds: number } {
  const spriteCount = count >= 50 ? 3 : count >= 10 ? 2 : 1;
  const lapSeconds = Math.max(2.5, Math.min(8, 8 - Math.sqrt(Math.max(0, count)) * 0.5));
  return { spriteCount, lapSeconds };
}
