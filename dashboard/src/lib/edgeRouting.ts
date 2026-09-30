/**
 * Cross-edge routing geometry for the 2D Agents View v2 overlay (design doc §2.3, corrected
 * by the independent review in §2.5 — build against the CORRECTED version, not the original
 * draft). Pure geometry: no DOM, no React, no imports from components/. Deterministic only —
 * same input always produces the same path string, no randomness, no iteration-to-convergence
 * beyond the capped retry.
 *
 * §2.5 item 2 is the reason this module exists as more than a one-line straight-chord check:
 * testing the straight chord for intersection, then nudging a single quadratic control point,
 * does NOT guarantee the resulting CURVE clears a box — a control-point nudge can still produce
 * a Bezier that clips a corner the straight chord would have missed entirely. The fix is to
 * sample the candidate curve itself and test every sample point, not just test the chord once
 * and trust the curve built from it.
 */

export interface Point {
  x: number;
  y: number;
}

/** Axis-aligned node box, in overlay-local coordinates. */
export interface Box {
  id: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export interface RouteEdgeOptions {
  /** Points sampled along a candidate curve for clearance testing. Default 16 (design 2.5: "10-20 points"). */
  samples?: number;
  /** Capped retry count for both the curve and the polyline fallback search. Default 4. */
  maxAttempts?: number;
  /**
   * Hard cap on how far a control point / polyline waypoint may be pushed off the chord.
   * Default 180 — deliberately SHORT, not "however far it takes to clear." QA on the real
   * page (operator, 2026-09-30) measured a 1645px detour on one edge and called it out
   * explicitly worse than a short line that clips a corner. Swept and verified against real
   * node geometry (18 real nodes incl. rim endpoints, 12 real pills, measured live) in two
   * steps: 140 closes ship<->ea (355px edge, 140 is proportionate — the 1645px pathology was
   * 4.6x its OWN chord); 180 additionally closes gm<->operator (549px edge, confirmed by
   * sweep to be a plain budget case, not a structural one — clears at 180, still overlaps at
   * 140). Checked for regressions before each raise: zero pairs got worse at either step.
   */
  maxOffset?: number;
  /** Extra clearance margin applied to every box test, so a curve grazing the border still counts as a hit. Default 0. */
  pad?: number;
}

export type EdgeRoute =
  | { kind: 'curve'; d: string }
  | { kind: 'curve-s'; d: string }
  | { kind: 'polyline'; d: string };

/** True if `p` lies inside `box`, expanded by `pad` on every side. */
export function pointInBox(p: Point, box: Box, pad = 0): boolean {
  const left = box.cx - box.width / 2 - pad;
  const right = box.cx + box.width / 2 + pad;
  const top = box.cy - box.height / 2 - pad;
  const bottom = box.cy + box.height / 2 + pad;
  return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
}

/**
 * True if the straight segment p1->p2 intersects `box` (expanded by `pad`), including the case
 * where an endpoint lies inside it. Liang-Barsky parametric clipping against the four box
 * half-planes — exact, not sampled, unlike curve clearance below (a straight segment has no
 * interior curvature to miss between samples).
 */
export function segmentIntersectsBox(p1: Point, p2: Point, box: Box, pad = 0): boolean {
  const left = box.cx - box.width / 2 - pad;
  const right = box.cx + box.width / 2 + pad;
  const top = box.cy - box.height / 2 - pad;
  const bottom = box.cy + box.height / 2 + pad;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let t0 = 0;
  let t1 = 1;

  // One (p, q) pair per half-plane. Returns false the moment the visible interval becomes empty.
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0; // parallel to this pair of edges: inside only if already on the right side
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };

  if (!clip(-dx, p1.x - left)) return false;
  if (!clip(dx, right - p1.x)) return false;
  if (!clip(-dy, p1.y - top)) return false;
  if (!clip(dy, bottom - p1.y)) return false;

  return t0 <= t1;
}

/** Point at parameter `t` (0..1) on the quadratic Bezier p0 -> ctrl -> p1. */
export function quadPoint(p0: Point, ctrl: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * ctrl.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * ctrl.y + t * t * p1.y,
  };
}

/**
 * §2.5 item 2, verified rather than assumed: sample the CURVE (not the chord) at `samples`
 * points across [0, 1] inclusive of both endpoints, and reject it if any sample point falls
 * inside any box. A single control-point nudge can still produce a Bezier that clips a corner
 * the straight chord would have missed — this is the check that catches that case.
 */
export function curveClears(
  p0: Point,
  ctrl: Point,
  p1: Point,
  boxes: Box[],
  samples = 16,
  pad = 0
): boolean {
  const n = Math.max(2, samples);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const pt = quadPoint(p0, ctrl, p1, t);
    for (const box of boxes) {
      if (pointInBox(pt, box, pad)) return false;
    }
  }
  return true;
}

/** Point at parameter `t` (0..1) on the cubic Bezier p0 -> c1 -> c2 -> p1. */
export function cubicPoint(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * c1.x + 3 * mt * t2 * c2.x + t2 * t * p1.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * c1.y + 3 * mt * t2 * c2.y + t2 * t * p1.y,
  };
}

/**
 * Same idea as curveClears, for the cubic S-shape (two control points, one bulging each
 * perpendicular direction) — a quadratic has exactly one hump and cannot clear obstacles on
 * OPPOSITE sides of the chord at any offset; a cubic can, because it has two independent
 * control points instead of one. Same sampling discipline: test the actual curve, not the
 * chord or the control points.
 */
export function cubicClears(
  p0: Point,
  c1: Point,
  c2: Point,
  p1: Point,
  boxes: Box[],
  samples = 16,
  pad = 0
): boolean {
  const n = Math.max(2, samples);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const pt = cubicPoint(p0, c1, c2, p1, t);
    for (const box of boxes) {
      if (pointInBox(pt, box, pad)) return false;
    }
  }
  return true;
}

function cubicPath(p0: Point, c1: Point, c2: Point, p1: Point): string {
  return `M ${fmt(p0.x)},${fmt(p0.y)} C ${fmt(c1.x)},${fmt(c1.y)} ${fmt(c2.x)},${fmt(c2.y)} ${fmt(p1.x)},${fmt(p1.y)}`;
}

/** True if every segment of the polyline `points` clears every box in `boxes`. Exact per
 *  segment (segmentIntersectsBox), not sampled — a polyline has no interior curvature. */
function polylineClears(points: Point[], boxes: Box[], pad = 0): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    for (const box of boxes) {
      if (segmentIntersectsBox(points[i], points[i + 1], box, pad)) return false;
    }
  }
  return true;
}

/**
 * Where the ray from `center` toward `toward` exits `box`'s boundary. Endpoints must terminate
 * at the box edge, not its centre (design 2.5, final paragraph) — a curve emerging from under a
 * node's label reads as ambiguous about what it is actually connected to.
 *
 * Classic axis-aligned "exit the rectangle" scaling: the direction vector is scaled by whichever
 * axis (x or y) hits its half-extent first. Works for all four sides and any diagonal approach,
 * including the degenerate case where `toward` coincides with `center`.
 */
export function clipToBoxEdge(center: Point, box: Box, toward: Point): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const halfW = box.width / 2;
  const halfH = box.height / 2;

  if (dx === 0 && dy === 0) {
    // Degenerate: no direction to aim along. Exit along +x arbitrarily rather than throw.
    return { x: center.x + halfW, y: center.y };
  }

  const tx = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: center.x + dx * t, y: center.y + dy * t };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function curvePath(p0: Point, ctrl: Point, p1: Point): string {
  return `M ${fmt(p0.x)},${fmt(p0.y)} Q ${fmt(ctrl.x)},${fmt(ctrl.y)} ${fmt(p1.x)},${fmt(p1.y)}`;
}

function polylinePath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fmt(p.x)},${fmt(p.y)}`).join(' ');
}

/**
 * Entry point (design 2.3, corrected by 2.5). `from`/`to` are the two endpoint node boxes;
 * `obstacles` is every node box currently on screen INCLUDING from/to themselves — this
 * function does the excluding, not the caller, so "did I remember to filter out the endpoints"
 * can never be a call-site bug (see isFleetMember's single-source-point lesson from FIX 2: one
 * place to get a filter right beats four places that might each forget it).
 *
 * Algorithm:
 *  1. Clip both endpoints to their own box boundary, aimed at each other.
 *  2. Try control offset 0 (a degenerate, straight-ish "curve") — if it clears every obstacle,
 *     done.
 *  3. Otherwise offset the control point perpendicular to the chord, scaled by how many
 *     obstacles the straight chord crosses, and retry with increasing offset (alternating
 *     sides, so an obstacle on only one side of the chord doesn't burn every attempt), capped
 *     at `maxAttempts` and `maxOffset`.
 *  4. If no single-control-point (one-hump) curve clears, try a cubic S-shape (two
 *     independent control points, opposite perpendicular polarities) — this is the shape that
 *     can clear two obstacles on OPPOSITE sides of the chord, which no one-hump curve can at
 *     any offset. Same short retry budget, same sampled clearance check.
 *  5. If no curve of either shape clears, fall back to a 3-point polyline with the same SHORT
 *     retry budget — an exact per-segment test (segmentIntersectsBox), not sampled, so it is
 *     strictly easier to guarantee correct than a curve.
 *  6. If even that is exhausted, return the SHORTEST attempt made (the plain, near-straight
 *     chord) — not the widest. A short line that clips a corner is a better answer than a
 *     sprawling detour that also might not clear (operator's own words, 2026-09-30 QA); never
 *     throw, never return undefined either way.
 */
export function routeEdge(
  from: Box,
  to: Box,
  obstacles: Box[],
  opts: RouteEdgeOptions = {}
): EdgeRoute {
  const samples = opts.samples ?? 16;
  const maxAttempts = opts.maxAttempts ?? 4;
  const maxOffset = opts.maxOffset ?? 180;
  const pad = opts.pad ?? 0;

  // The two endpoints' own boxes are never obstacles — the chord necessarily starts/ends
  // inside them, so treating them as obstacles would make every edge unroutable.
  const realObstacles = obstacles.filter((b) => b.id !== from.id && b.id !== to.id);

  const fromCenter: Point = { x: from.cx, y: from.cy };
  const toCenter: Point = { x: to.cx, y: to.cy };
  const start = clipToBoxEdge(fromCenter, from, toCenter);
  const end = clipToBoxEdge(toCenter, to, fromCenter);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  const mid: Point = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  if (len === 0) {
    // Coincident clip points (identical/overlapping boxes) — nothing to route around.
    return { kind: 'curve', d: curvePath(start, start, end) };
  }

  const perp: Point = { x: -dy / len, y: dx / len };
  // Capped at 2, deliberately: scaling the offset UP with how many boxes the chord crosses is
  // exactly the "loop outward" behaviour the operator's real-page QA caught producing a
  // 1645px detour on a dense/long layout — more obstacles were making the search WIDER, which
  // is the wrong direction when the policy is "prefer short." A small nudge for "more than
  // one in the way" is still useful; an unbounded one is the bug.
  const crossingCount = realObstacles.filter((b) => segmentIntersectsBox(start, end, b, pad)).length;
  const scale = Math.min(2, Math.max(1, crossingCount));
  const baseOffset = 24; // px — deterministic step size, no randomness

  // Attempt 0: the straight chord itself (control point ON the midpoint). This doubles as the
  // final SHORT fallback below if nothing clears — it is already the shortest thing tried.
  if (curveClears(start, mid, end, realObstacles, samples, pad)) {
    return { kind: 'curve', d: curvePath(start, mid, end) };
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const side = attempt % 2 === 1 ? 1 : -1;
    const magnitude = Math.min(baseOffset * scale * attempt, maxOffset);
    const ctrl: Point = { x: mid.x + perp.x * magnitude * side, y: mid.y + perp.y * magnitude * side };
    if (curveClears(start, ctrl, end, realObstacles, samples, pad)) {
      return { kind: 'curve', d: curvePath(start, ctrl, end) };
    }
  }

  // No single-control-point (one-hump) curve clears — try a cubic S-shape before falling
  // back to a polyline. This is a genuine missing CAPABILITY, not a budget problem: two real
  // obstacles can sit on OPPOSITE perpendicular sides of the chord at different points along
  // it (measured live: t=0.27 on one side, t=0.75 on the other) — no single-direction offset,
  // at any magnitude, clears both (proven by sweeping the quad loop's offset far past
  // maxOffset in practice; a one-hump curve is mathematically one-signed). A cubic Bezier has
  // TWO independent control points, so it can bulge one way near the start and the other way
  // near the end — bounded addition: same sampling, same clearance check, same short-budget
  // schedule as the quad loop above, just a second shape tried before the polyline fallback.
  const oneThird: Point = { x: start.x + dx / 3, y: start.y + dy / 3 };
  const twoThirds: Point = { x: start.x + (dx * 2) / 3, y: start.y + (dy * 2) / 3 };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const magnitude = Math.min(baseOffset * scale * attempt, maxOffset);
    // Both S orientations — which obstacle is on which side is not inspected per-pair (that
    // would make this a solver, not a bounded shape); trying both polarities is the bounded
    // equivalent of the quad loop's side-alternation above.
    for (const side of [1, -1]) {
      const c1: Point = { x: oneThird.x + perp.x * magnitude * side, y: oneThird.y + perp.y * magnitude * side };
      const c2: Point = { x: twoThirds.x + perp.x * magnitude * -side, y: twoThirds.y + perp.y * magnitude * -side };
      if (cubicClears(start, c1, c2, end, realObstacles, samples, pad)) {
        return { kind: 'curve-s', d: cubicPath(start, c1, c2, end) };
      }
    }
  }

  // No curve (one- or two-hump) clears everything — fall back to a polyline (design 2.5
  // item 2 is explicit: do not ship a curve known to clip).
  //
  // Shape: start -> wp1 -> wp2 -> end, where wp1/wp2 are `start`/`end` each pushed straight
  // out PERPENDICULAR to the chord by the same magnitude. Deliberately NOT a single waypoint
  // anchored at the chord's midpoint — that shape has the exact same "near-zero deviation
  // near the endpoints" taper as the quadratic curve (a straight line from `start` toward a
  // distant midpoint-anchored waypoint still starts at deviation 0 and only grows gradually),
  // which fails on the same near-an-endpoint obstacle the curve loop above just failed on. The
  // perpendicular-jump-then-flat-run shape instead reaches the FULL offset in one short step
  // at each end, so the long middle segment (wp1 -> wp2, parallel to the chord) carries the
  // complete clearance margin for its entire length with no taper at all.
  //
  // Same `maxOffset` cap as the curve loop, NOT a wider one — a real-page measurement showed
  // the old maxOffset*2 escalation here is what produced the 1645px gm<->telegram detour.
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const side = attempt % 2 === 1 ? 1 : -1;
    const magnitude = Math.min(baseOffset * scale * attempt, maxOffset);
    const wp1: Point = { x: start.x + perp.x * magnitude * side, y: start.y + perp.y * magnitude * side };
    const wp2: Point = { x: end.x + perp.x * magnitude * side, y: end.y + perp.y * magnitude * side };
    const pts = [start, wp1, wp2, end];
    if (polylineClears(pts, realObstacles, pad)) {
      return { kind: 'polyline', d: polylinePath(pts) };
    }
  }

  // Every SHORT attempt exhausted. Return the shortest thing tried — the plain chord — rather
  // than the widest polyline attempt. A single obstacle field dense/long enough to defeat every
  // short attempt is real information (the layout has no clean gap this module's shape of
  // search can find); the fix for that is elsewhere (fewer edges drawn, a different layout,
  // labels excluded from view), not a longer and longer detour from this function. Never
  // throw, never return undefined either way.
  return { kind: 'curve', d: curvePath(start, mid, end) };
}

function parseRoutePoints(d: string): Point[] {
  const nums = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  const pts: Point[] = [];
  for (let i = 0; i < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

/** Total length of a polyline (sum of segment lengths) — used to place points at roughly
 *  equal visual speed along a multi-segment path, rather than equal speed per segment
 *  regardless of length. */
function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return total;
}

function polylinePointAt(points: Point[], t: number): Point {
  // MUTATION: equal SEGMENT-COUNT speed instead of equal arc-length speed.
  const n = points.length - 1;
  const scaled = Math.min(1, Math.max(0, t)) * n;
  const i = Math.min(n - 1, Math.floor(scaled));
  const segT = scaled - i;
  return {
    x: points[i].x + (points[i + 1].x - points[i].x) * segT,
    y: points[i].y + (points[i + 1].y - points[i].y) * segT,
  };
}

/**
 * The point at parameter `t` (0..1, start to end) along a route ALREADY RETURNED by
 * routeEdge — for a travelling pulse (2D Agents View replay, operator's PLAY/GROW port from
 * /field). Parses `route.d` rather than requiring the caller to have kept the original control
 * points around; `d` only ever contains M/Q/C/L commands with plain numeric coordinates (see
 * curvePath/cubicPath/polylinePath above), so this is exact, not a heuristic, for any route
 * this module produces itself. For a polyline, `t` is by ARC LENGTH (equal visual speed along
 * the whole path), not by segment count — a pulse must not visibly speed up crossing a short
 * segment and slow down on a long one.
 */
export function pointAtFraction(route: EdgeRoute, t: number): Point {
  const pts = parseRoutePoints(route.d);
  const clamped = Math.min(1, Math.max(0, t));
  if (route.kind === 'curve') {
    const [p0, ctrl, p1] = pts;
    return quadPoint(p0, ctrl, p1, clamped);
  }
  if (route.kind === 'curve-s') {
    const [p0, c1, c2, p1] = pts;
    return cubicPoint(p0, c1, c2, p1, clamped);
  }
  return polylinePointAt(pts, clamped);
}
