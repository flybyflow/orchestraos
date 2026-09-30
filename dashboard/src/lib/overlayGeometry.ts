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
): Box {
  const left = rect.left - container.left + scrollLeft;
  const top = rect.top - container.top + scrollTop;
  return {
    id,
    cx: left + rect.width / 2,
    cy: top + rect.height / 2,
    width: rect.width,
    height: rect.height,
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

export function edgeLiveness(
  count: number,
  lastAtMs: number | null,
  nowMs: number,
  quietWindowMs: number,
): EdgeLiveness {
  if (count > 0) return 'live';
  if (lastAtMs == null) return 'dead';
  return nowMs - lastAtMs <= quietWindowMs ? 'quiet' : 'dead';
}
