/**
 * Cross-edge routing geometry (design doc §2.3, corrected by §2.5).
 *   node --experimental-strip-types dashboard/src/lib/edgeRouting.test.mjs
 *
 * Route results are re-verified by RE-SAMPLING/RE-TESTING THE RETURNED PATH STRING, not by
 * trusting the algorithm that produced it — parse the `d` back into points, then call the
 * same exported clearance primitives on those points, exactly as an independent caller would.
 */
import assert from 'node:assert';
import {
  pointInBox,
  segmentIntersectsBox,
  quadPoint,
  curveClears,
  clipToBoxEdge,
  routeEdge,
} from './edgeRouting.ts';

/** Parse an SVG "M x,y Q cx,cy ex,ey" or "M x,y L x,y L x,y" path back into points, in order.
 *  Deliberately independent of anything internal to edgeRouting.ts — it only reads the string
 *  routeEdge actually returned. */
function parsePathPoints(d) {
  const nums = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  const pts = [];
  for (let i = 0; i < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

// ── pointInBox ──────────────────────────────────────────────────────────────────────────
{
  const box = { id: 'b', cx: 100, cy: 100, width: 40, height: 20 };
  assert.equal(pointInBox({ x: 100, y: 100 }, box), true, 'center is inside');
  assert.equal(pointInBox({ x: 120, y: 100 }, box), true, 'exactly on the right edge counts as inside');
  assert.equal(pointInBox({ x: 121, y: 100 }, box), false, 'just past the right edge is outside');
  assert.equal(pointInBox({ x: 121, y: 100 }, box, 2), true, 'pad=2 pulls a near-miss back in — "grazing the border counts as a hit"');
  assert.equal(pointInBox({ x: 100, y: 89 }, box), false, 'just past the top edge is outside');
}

// ── segmentIntersectsBox ────────────────────────────────────────────────────────────────
{
  const box = { id: 'b', cx: 100, cy: 0, width: 40, height: 20 };
  assert.equal(segmentIntersectsBox({ x: 0, y: 0 }, { x: 200, y: 0 }, box), true, 'a chord straight through the box hits it');
  assert.equal(segmentIntersectsBox({ x: 0, y: 100 }, { x: 200, y: 100 }, box), false, 'a chord well above the box misses it');
  assert.equal(segmentIntersectsBox({ x: 100, y: 0 }, { x: 200, y: 0 }, box), true, 'an endpoint starting INSIDE the box counts as a hit');
  assert.equal(segmentIntersectsBox({ x: 0, y: 0 }, { x: 200, y: 0 }, box, 0), true, 'unpadded still catches a dead-center hit');
  // A segment that passes exactly along one edge, not through the interior.
  assert.equal(segmentIntersectsBox({ x: 0, y: -10 }, { x: 200, y: -10 }, box), true, 'grazing exactly along the top edge counts (inclusive boundary)');
}

// ── quadPoint ───────────────────────────────────────────────────────────────────────────
{
  const p0 = { x: 0, y: 0 };
  const ctrl = { x: 50, y: 100 };
  const p1 = { x: 100, y: 0 };
  assert.deepEqual(quadPoint(p0, ctrl, p1, 0), p0, 't=0 is exactly p0');
  assert.deepEqual(quadPoint(p0, ctrl, p1, 1), p1, 't=1 is exactly p1');
  const mid = quadPoint(p0, ctrl, p1, 0.5);
  // B(0.5) = 0.25*p0 + 0.5*ctrl + 0.25*p1
  assert.equal(mid.x, 50);
  assert.equal(mid.y, 50);
}

// ── curveClears ─────────────────────────────────────────────────────────────────────────
{
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 200, y: 0 };
  const boxOnChord = { id: 'b', cx: 100, cy: 0, width: 40, height: 20 };
  assert.equal(curveClears(p0, { x: 100, y: 0 }, p1, [boxOnChord]), false, 'a straight (offset-0) curve through the box does not clear it');
  assert.equal(curveClears(p0, { x: 100, y: 40 }, p1, [boxOnChord]), true, 'enough offset clears a single small box');
  // THE §2.5 ITEM 2 CASE, precisely: a box the STRAIGHT CHORD entirely misses (so a
  // chord-only check — the pre-2.5, uncorrected design — would wrongly call this curve
  // clear), positioned exactly where the curve's SHOULDER (not its peak) swings through.
  const shoulderBox = { id: 's', cx: 40, cy: 15, width: 30, height: 10 }; // y spans [10, 20]
  assert.equal(segmentIntersectsBox(p0, p1, shoulderBox), false,
    'sanity: the raw straight chord (y=0) misses this box entirely (its y-range is [10,20])');
  // At t=0.2 (x=40 on this chord), B(t) with ctrl=(100,40): deviation = 2*0.2*0.8*40 = 12.8,
  // which falls inside the box's y-range [10,20] even though the chord itself never does.
  // This is exactly what "test the chord, nudge the control point, ship it" (the ORIGINAL,
  // uncorrected design) would miss — and exactly what sampling the actual curve catches.
  assert.equal(curveClears(p0, { x: 100, y: 40 }, p1, [shoulderBox], 32), false,
    'a curve whose CHORD clears can still clip on its own shoulder — sampling the curve, not the chord, is what catches this');
}

// ── clipToBoxEdge: all four sides plus a diagonal ──────────────────────────────────────
{
  const box = { id: 'b', cx: 0, cy: 0, width: 40, height: 20 };
  const center = { x: 0, y: 0 };

  const right = clipToBoxEdge(center, box, { x: 1000, y: 0 });
  assert.deepEqual(right, { x: 20, y: 0 }, 'aimed right -> exits the right edge, ON the boundary');

  const left = clipToBoxEdge(center, box, { x: -1000, y: 0 });
  assert.deepEqual(left, { x: -20, y: 0 }, 'aimed left -> exits the left edge');

  const down = clipToBoxEdge(center, box, { x: 0, y: 1000 });
  assert.deepEqual(down, { x: 0, y: 10 }, 'aimed down -> exits the bottom edge (smaller half-extent wins)');

  const up = clipToBoxEdge(center, box, { x: 0, y: -1000 });
  assert.deepEqual(up, { x: 0, y: -10 }, 'aimed up -> exits the top edge');

  // Diagonal: box is wider than tall (halfW=20, halfH=10), so a 45-degree ray exits through
  // the top/bottom edge first, not a corner — verify it lands ON the boundary, not past it.
  const diag = clipToBoxEdge(center, box, { x: 1000, y: 1000 });
  assert.equal(Math.abs(diag.y), 10, 'diagonal exit still respects the shorter half-extent (bottom edge)');
  assert.equal(pointInBox(diag, box), true, 'the exit point is ON the boundary, which pointInBox treats as inside (inclusive)');
  assert.equal(pointInBox(diag, box, -0.01), false, 'shrinking the box by an epsilon proves the point sits exactly AT the edge, not inside it');

  // Degenerate: aiming at the box's own center must not throw or return NaN.
  const degenerate = clipToBoxEdge(center, box, center);
  assert.ok(Number.isFinite(degenerate.x) && Number.isFinite(degenerate.y), 'aiming at yourself does not produce NaN/throw');
}

// ── routeEdge: endpoints are never treated as obstacles ────────────────────────────────
{
  const from = { id: 'a', cx: 0, cy: 0, width: 20, height: 20 };
  const to = { id: 'b', cx: 200, cy: 0, width: 20, height: 20 };
  // Pass ONLY the two endpoints as "obstacles" — if they were not excluded, the chord (which
  // starts/ends inside them) would be unroutable no matter what the algorithm tried.
  const route = routeEdge(from, to, [from, to]);
  assert.equal(route.kind, 'curve', 'nothing left to avoid once the endpoints are excluded -> a plain curve');
  const pts = parsePathPoints(route.d);
  assert.deepEqual(pts[1], { x: 100, y: 0 }, 'no real obstacles -> the straight (offset-0) attempt wins, control point on the chord midpoint');
}

// ── routeEdge: a chord straight through one box -> curve, re-verified from the OUTPUT ──
{
  const from = { id: 'a', cx: 0, cy: 0, width: 20, height: 20 };
  const to = { id: 'b', cx: 200, cy: 0, width: 20, height: 20 };
  const blocker = { id: 'mid', cx: 100, cy: 0, width: 40, height: 20 };
  const route = routeEdge(from, to, [from, to, blocker]);
  assert.equal(route.kind, 'curve');
  const [p0, ctrl, p1] = parsePathPoints(route.d);
  // Re-derive clearance from the RETURNED path only — parse it back and re-sample, rather
  // than trusting that routeEdge's internal check was the one that actually shipped.
  assert.equal(curveClears(p0, ctrl, p1, [blocker], 32), true,
    'the RETURNED path, re-sampled independently, clears the box it was routed around');
  assert.equal(pointInBox(p0, from), true, 'the curve starts ON its own box boundary (inclusive), not floating free of it');
  assert.equal(pointInBox(p0, from, -1), false, 'shrinking the box by an epsilon pushes it out — proving p0 sits exactly at the edge, not comfortably inside');
}

// ── routeEdge: a corridor too tight for any curve -> POLYLINE, re-verified as clearing ──
{
  const from = { id: 'a', cx: 0, cy: 0, width: 20, height: 20 };
  const to = { id: 'b', cx: 400, cy: 0, width: 20, height: 20 };
  // A block close to ONE endpoint. A quadratic Bezier's perpendicular deviation from its
  // chord is 2*t*(1-t)*offset — that factor is small near t=0/1 REGARDLESS of how large the
  // offset is, so a box near an endpoint can be a hard geometric impossibility for any single-
  // control-point curve within a capped offset. This is exactly design 2.5 item 2's point.
  const nearEndBlock = { id: 'block', cx: 40, cy: 0, width: 30, height: 40 };
  const route = routeEdge(from, to, [from, to, nearEndBlock]);
  assert.equal(route.kind, 'polyline', 'a block pinned near one endpoint defeats every curve attempt within the offset cap');
  const pts = parsePathPoints(route.d);
  for (let i = 0; i < pts.length - 1; i++) {
    assert.equal(segmentIntersectsBox(pts[i], pts[i + 1], nearEndBlock), false,
      `the RETURNED polyline segment ${i} clears the box, re-verified independently`);
  }
}

// ── routeEdge: capped attempts exhausted -> returns the SHORT fallback, not a wide one ───
// Post-QA policy (operator, 2026-09-30 real-page finding): when nothing short clears, return
// the shortest thing tried (the plain chord) rather than escalating the search wider. This
// replaced the old "return the widest polyline attempt" fallback, which is what produced a
// real 1645px detour on the actual page.
{
  const from = { id: 'a', cx: 0, cy: 0, width: 20, height: 20 };
  const to = { id: 'b', cx: 200, cy: 0, width: 20, height: 20 };
  const obstacles = [from, to];
  // A solid wall spanning the FULL x-range between the endpoints at effectively all y —
  // no 3-point polyline detour can route around this without crossing x in [10,190]
  // somewhere, and the wall occupies that entire strip at every height. Every attempt in
  // both the curve loop and the polyline loop must fail.
  for (let x = 20; x <= 180; x += 20) {
    obstacles.push({ id: `wall-${x}`, cx: x, cy: 0, width: 20, height: 2000 });
  }
  const route = routeEdge(from, to, obstacles);
  assert.ok(route !== undefined && route !== null, 'never undefined, even when every attempt is exhausted');
  assert.equal(route.kind, 'curve', 'the exhausted fallback is the short plain chord, not a wide polyline');
  assert.deepEqual(parsePathPoints(route.d), [{ x: 10, y: 0 }, { x: 100, y: 0 }, { x: 190, y: 0 }],
    'specifically the straight (offset-0) chord — the shortest thing this module ever tries');
  // Confirm this genuinely IS the exhausted case, not an accidental pass: the returned
  // (short) chord still crosses the wall, and no attempt in between found daylight either.
  const pts = parsePathPoints(route.d);
  const anySegmentHitsAWall = obstacles
    .filter((o) => o.id.startsWith('wall-'))
    .some((wall) => pts.slice(0, -1).some((p, i) => segmentIntersectsBox(p, pts[i + 1], wall)));
  assert.equal(anySegmentHitsAWall, true, 'sanity: this fixture really is unroutable, so the fallback path is the one under test, not a lucky success');
}

// ── routeEdge: a route must stay inside a bounded viewport ──────────────────────────────
// build's constraint: "it must hold at 1000x700 as well as 1440x900, so nothing may assume a
// width." This module never reads a viewport size — it is pure relative geometry — so the
// real guarantee to test is that "prefer short" keeps every waypoint within a modest margin
// of the direct chord, in a layout no wider than the SMALLER of the two real viewports QA
// checked. A route that stays within maxOffset of the chord cannot sprawl outside a
// reasonably-sized container regardless of which viewport it is drawn in.
{
  const VIEWPORT = { width: 1000, height: 700 };
  const from = { id: 'a', cx: 60, cy: 350, width: 110, height: 87 };
  const to = { id: 'b', cx: 940, cy: 350, width: 110, height: 87 };
  // A cluster of obstacles near the middle — dense enough to force real offset attempts,
  // not so pathological that it is the all-attempts-exhausted case (that is the block above).
  const obstacles = [from, to];
  for (let x = 400; x <= 600; x += 60) {
    obstacles.push({ id: `mid-${x}`, cx: x, cy: 350, width: 50, height: 40 });
  }
  const route = routeEdge(from, to, obstacles);
  const pts = parsePathPoints(route.d);
  for (const p of pts) {
    assert.ok(p.x >= 0 && p.x <= VIEWPORT.width, `x=${p.x} stays within the ${VIEWPORT.width}px viewport`);
    assert.ok(p.y >= 0 && p.y <= VIEWPORT.height, `y=${p.y} stays within the ${VIEWPORT.height}px viewport`);
  }
}

// ── routeEdge: an obstacle field dense enough that NO curve clears (the real QA failure) ──
// TRANSCRIBED from the real running page, not invented: browse skill against build-v2 at
// 1440x900, Topology view, every visible AgentNode's getBoundingClientRect, converted to the
// overlay's local coordinate space (SVG origin was (305, 330.5) at capture time). This is
// exactly the obstacle field routeEdge is actually called against in production today.
//
// gm and brain sit on the SAME real x-column (535) with reflect and plan directly between
// them on that column too — a genuinely straight, un-nudgeable line of real boxes, not a
// constructed worst case. A single-control-point curve cannot solve this: reflect sits near
// the middle (cy=392, roughly 36% of the way down) and plan sits further along (cy=712,
// roughly 71% down) — clearing one is a different offset than clearing the other, and a
// single hump cannot be two different heights at once.
{
  const from = { id: 'gm', cx: 535.0, cy: 68.0, width: 110, height: 87 };
  const to = { id: 'brain', cx: 535.0, cy: 992.0, width: 110, height: 87 }; // real ~924px span
  const obstacles = [
    from, to,
    { id: 'reflect', cx: 535.0, cy: 392.0, width: 110, height: 87 }, // real: directly on the gm-brain column
    { id: 'plan', cx: 535.0, cy: 712.0, width: 110, height: 87 },    // real: same column, further down
    { id: 'builder-1', cx: 227.0, cy: 392.0, width: 110, height: 87 },
    { id: 'ship', cx: 657.0, cy: 392.0, width: 110, height: 87 },
    { id: 'bshr', cx: 474.0, cy: 846.0, width: 110, height: 87 },
    { id: 'think', cx: 596.0, cy: 846.0, width: 110, height: 87 },
  ];
  const route = routeEdge(from, to, obstacles);
  assert.ok(route.kind === 'curve' || route.kind === 'polyline');
  // The point of this test is not "it clears" (it is modelled on a real case that does NOT),
  // it is "the module does not sprawl trying" — every point stays within maxOffset (default
  // 80) of the direct chord, proving the short-budget policy actually bounds the search
  // rather than merely being untested.
  const pts = parsePathPoints(route.d);
  const chordLen = Math.hypot(to.cx - from.cx, to.cy - from.cy);
  for (const p of pts) {
    // Distance from the point to the INFINITE line through start/end, not to the segment —
    // a cheap, sufficient proxy for "how far off the direct chord did this wander".
    const ux = (to.cx - from.cx) / chordLen, uy = (to.cy - from.cy) / chordLen;
    const relX = p.x - from.cx, relY = p.y - from.cy;
    const perpDist = Math.abs(relX * -uy + relY * ux);
    assert.ok(perpDist <= 80 + 1, `waypoint (${p.x},${p.y}) stayed within maxOffset of the chord (perpDist=${perpDist.toFixed(1)})`);
  }
}

// ── determinism: same input twice -> identical path string ─────────────────────────────
{
  const from = { id: 'a', cx: 5, cy: 5, width: 24, height: 24 };
  const to = { id: 'b', cx: 205, cy: 55, width: 24, height: 24 };
  const obstacle = { id: 'o', cx: 105, cy: 30, width: 50, height: 30 };
  const r1 = routeEdge(from, to, [from, to, obstacle]);
  const r2 = routeEdge(from, to, [from, to, obstacle]);
  assert.deepEqual(r1, r2, 'identical input must produce an identical result — no randomness, no hidden state');
}

console.log('edgeRouting: all assertions passed');
