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
  cubicPoint,
  cubicClears,
  clipToBoxEdge,
  routeEdge,
  pointAtFraction,
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

// ── cubicPoint / cubicClears: the S-shape, for obstacles on OPPOSITE sides ────────────────
{
  const p0 = { x: 0, y: 0 };
  const c1 = { x: 33, y: 40 };
  const c2 = { x: 66, y: -40 };
  const p1 = { x: 100, y: 0 };
  assert.deepEqual(cubicPoint(p0, c1, c2, p1, 0), p0, 't=0 is exactly p0');
  assert.deepEqual(cubicPoint(p0, c1, c2, p1, 1), p1, 't=1 is exactly p1');

  // THE POINT OF THE SHAPE: two boxes on OPPOSITE perpendicular sides of the chord, at
  // different points along it. No single quadratic control point can clear both at any
  // offset (proven live, msg_19e9a69e_79863885 / the real gm<->build-column case) — a cubic
  // with two independent control points, bulging one way then the other, can.
  const boxNearStartAbove = { id: 'a', cx: 25, cy: 25, width: 20, height: 20 }; // above the chord, near the start
  const boxNearEndBelow = { id: 'b', cx: 75, cy: -25, width: 20, height: 20 }; // below the chord, near the end
  assert.equal(
    curveClears(p0, { x: 50, y: 0 }, p1, [boxNearStartAbove, boxNearEndBelow], 32),
    true, // sanity: the offset-0 straight chord happens to miss both (they are off-axis)
    'sanity: the straight chord alone already misses both boxes (they are off the direct line)'
  );
  // A single-hump quadratic bulging either way clips one of the two — offset=60 confirmed by
  // direct experiment to fail in BOTH directions for this fixture (some offsets in between
  // "overshoot" past one box without clearing the other, which is exactly the point: there is
  // no ctrl.y this shape can pick that clears both at once).
  assert.equal(curveClears(p0, { x: 50, y: 60 }, p1, [boxNearStartAbove, boxNearEndBelow], 32), false,
    'quadratic bulging up still clips one of the two opposite-side boxes');
  assert.equal(curveClears(p0, { x: 50, y: -60 }, p1, [boxNearStartAbove, boxNearEndBelow], 32), false,
    'quadratic bulging down still clips the other of the two opposite-side boxes');
  // The cubic S clears both at once: bulge toward the start-side box's opposite direction
  // near the start, and the end-side box's opposite direction near the end.
  assert.equal(cubicClears(p0, { x: 33, y: -30 }, { x: 66, y: 30 }, p1, [boxNearStartAbove, boxNearEndBelow], 32),
    true, 'the cubic S-shape clears both opposite-side obstacles where no quadratic offset could');
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

// ── routeEdge: the S-shape closes a REAL opposite-sides QA failure ─────────────────────────
// TRANSCRIBED from build's corrected real geometry (their /tmp/real-geometry-v2.json,
// 2026-09-30 — 18 nodes incl. rim endpoints, 12 real pills, overlay-local coords). This is the
// exact test<->build pair the operator's QA sweep reported failing (len 287, crossing
// builder-1 + ship + a count pill) — build/builder-1/ship/pill:9:5 sit on OPPOSITE
// perpendicular sides of the chord at different points along it (t=0.27 / t=0.75 in the
// original, since-corrected geometry; the structural shape is the same in the real one).
{
  const from = { id: 'test', cx: 420, cy: 538, width: 110, height: 87 };
  const to = { id: 'build', cx: 112, cy: 258, width: 110, height: 87 };
  // The full real obstacle field, not just the 3 named crossings — `scale` (how many boxes
  // the straight chord crosses) is computed from the WHOLE field routeEdge actually gets
  // called with in production, and it changes which offsets get tried. A reduced fixture with
  // only the 3 reported crossings resolves via a plain quadratic instead — it is a different,
  // easier case, not the one QA actually hit.
  const obstacles = [
    from, to,
    { id: 'gm', cx: 535, cy: 68, width: 110, height: 87 },
    { id: 'builder-1', cx: 51, cy: 392, width: 110, height: 87 },
    { id: 'builder-2', cx: 173, cy: 392, width: 110, height: 87 },
    { id: 'review', cx: 420, cy: 258, width: 110, height: 87 },
    { id: 'reflect', cx: 359, cy: 392, width: 110, height: 87 },
    { id: 'ship', cx: 481, cy: 392, width: 110, height: 87 },
    { id: 'ea', cx: 667, cy: 258, width: 110, height: 87 },
    { id: 'plan', cx: 914, cy: 258, width: 110, height: 87 },
    { id: 'bshr', cx: 853, cy: 392, width: 110, height: 87 },
    { id: 'think', cx: 975, cy: 392, width: 110, height: 87 },
    { id: 'brain', cx: 914, cy: 538, width: 110, height: 87 },
    { id: 'telegram', cx: 313, cy: 674, width: 88, height: 48 },
    { id: 'operator', cx: 413, cy: 674, width: 88, height: 48 },
    { id: 'lineage-daemon', cx: 523, cy: 674, width: 107, height: 48 },
    { id: 'approval-loop', cx: 636, cy: 674, width: 95, height: 48 },
    { id: 'message-router', cx: 748, cy: 674, width: 106, height: 48 },
    { id: 'pill:99:0', cx: 112, cy: 187, width: 25, height: 19 },
    { id: 'pill:34:1', cx: 51, cy: 325, width: 25, height: 19 },
    { id: 'pill:25:2', cx: 173, cy: 325, width: 24, height: 19 },
    { id: 'pill:59:3', cx: 420, cy: 187, width: 25, height: 19 },
    { id: 'pill:2:4', cx: 359, cy: 325, width: 18, height: 19 },
    { id: 'pill:9:5', cx: 481, cy: 325, width: 18, height: 19 },
    { id: 'pill:14:6', cx: 420, cy: 471, width: 23, height: 19 },
    { id: 'pill:106:7', cx: 667, cy: 187, width: 30, height: 19 },
    { id: 'pill:132:8', cx: 914, cy: 187, width: 29, height: 19 },
    { id: 'pill:27:9', cx: 853, cy: 325, width: 24, height: 19 },
    { id: 'pill:—:10', cx: 975, cy: 325, width: 21, height: 19 },
    { id: 'pill:—:11', cx: 914, cy: 471, width: 21, height: 19 },
  ];
  const route = routeEdge(from, to, obstacles);
  assert.equal(route.kind, 'curve-s', 'the real opposite-sides failure resolves via the cubic S-shape, not a wider quadratic or a polyline');
  const [p0, c1, c2, p1] = parsePathPoints(route.d);
  // Re-verify from the RETURNED path only, via the exported cubicClears — never trust that
  // the algorithm's own internal check was the one that shipped.
  const others = obstacles.filter((o) => o.id !== 'test' && o.id !== 'build');
  assert.equal(cubicClears(p0, c1, c2, p1, others, 32), true,
    'the returned cubic path, re-sampled independently, actually clears builder-1, ship, and the pill');
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
  // The point of this test is not "it clears" (it is modelled on a real case that does NOT —
  // reflect and plan sit dead-center on the chord at different points, not on opposite
  // perpendicular sides, so even the cubic S-shape cannot help here either), it is "the module
  // does not sprawl trying" — every point stays within maxOffset (default 180) of the direct
  // chord, proving the short-budget policy actually bounds the search rather than merely
  // being untested.
  const pts = parsePathPoints(route.d);
  const chordLen = Math.hypot(to.cx - from.cx, to.cy - from.cy);
  for (const p of pts) {
    // Distance from the point to the INFINITE line through start/end, not to the segment —
    // a cheap, sufficient proxy for "how far off the direct chord did this wander".
    const ux = (to.cx - from.cx) / chordLen, uy = (to.cy - from.cy) / chordLen;
    const relX = p.x - from.cx, relY = p.y - from.cy;
    const perpDist = Math.abs(relX * -uy + relY * ux);
    assert.ok(perpDist <= 180 + 1, `waypoint (${p.x},${p.y}) stayed within maxOffset of the chord (perpDist=${perpDist.toFixed(1)})`);
  }
}

// ── routeEdge: gm<->operator, settled as a budget case (build guessed; this confirms it) ──
// The third real QA failure (len ~549, crossing ship + test + a count pill). build guessed
// this was a plain budget case rather than an opposite-sides S, since operator sits on the
// rim (cy 674) while the crossings are mid-tree — confirmed here: at the OLD default (140) it
// still clips; at 180 it clears via a plain quadratic, no S-shape needed. Settles the guess
// with the actual coordinates rather than leaving it unverified.
{
  const from = { id: 'gm', cx: 535, cy: 68, width: 110, height: 87 };
  const to = { id: 'operator', cx: 413, cy: 674, width: 88, height: 48 };
  const obstacles = [
    from, to,
    { id: 'ship', cx: 481, cy: 392, width: 110, height: 87 },
    { id: 'test', cx: 420, cy: 538, width: 110, height: 87 },
    { id: 'pill:9:5', cx: 481, cy: 325, width: 18, height: 19 },
  ];
  const stillClips = routeEdge(from, to, obstacles, { maxOffset: 140 });
  {
    const [p0, c, p1] = parsePathPoints(stillClips.d);
    const others = obstacles.filter((o) => o.id !== 'gm' && o.id !== 'operator');
    assert.equal(curveClears(p0, c, p1, others, 32), false, 'at the old maxOffset=140 this real pair still clips — confirms it needed more than a tiny bump');
  }
  const clears = routeEdge(from, to, obstacles); // default (180) now
  assert.equal(clears.kind, 'curve', 'settled: a plain quadratic at 180 -- a budget case, not a structural S-shape one');
  const [p0, c, p1] = parsePathPoints(clears.d);
  const others = obstacles.filter((o) => o.id !== 'gm' && o.id !== 'operator');
  assert.equal(curveClears(p0, c, p1, others, 32), true, 're-verified from the returned path: it actually clears at the new default');
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

// ── pointAtFraction: where a travelling pulse sits along an ALREADY-ROUTED edge ───────────
// For the operator's PLAY/GROW replay port (2D Agents View v2) — a pulse rides the exact
// route routeEdge already computed, not a re-derived straight line, so a pulse never visibly
// cuts a corner routeEdge just spent its whole budget avoiding.
{
  // Plain quadratic: parses "M x,y Q cx,cy ex,ey" and matches quadPoint exactly.
  const from = { id: 'a', cx: 0, cy: 0, width: 20, height: 20 };
  const to = { id: 'b', cx: 200, cy: 0, width: 20, height: 20 };
  const route = routeEdge(from, to, [from, to]); // no obstacles -> the straight offset-0 curve
  assert.deepEqual(pointAtFraction(route, 0), { x: 10, y: 0 }, 't=0 is the route start');
  assert.deepEqual(pointAtFraction(route, 1), { x: 190, y: 0 }, 't=1 is the route end');
  const [p0, ctrl, p1] = parsePathPoints(route.d);
  assert.deepEqual(pointAtFraction(route, 0.5), quadPoint(p0, ctrl, p1, 0.5),
    'midpoint matches quadPoint exactly, re-derived from the parsed route, not assumed');
}
{
  // Cubic S: parses "M x,y C c1x,c1y c2x,c2y ex,ey" and matches cubicPoint exactly. Reuses the
  // real opposite-sides fixture proven elsewhere in this file to actually produce a curve-s.
  const from = { id: 'test', cx: 420, cy: 538, width: 110, height: 87 };
  const to = { id: 'build', cx: 112, cy: 258, width: 110, height: 87 };
  const obstacles = [
    from, to,
    { id: 'gm', cx: 535, cy: 68, width: 110, height: 87 },
    { id: 'builder-1', cx: 51, cy: 392, width: 110, height: 87 },
    { id: 'builder-2', cx: 173, cy: 392, width: 110, height: 87 },
    { id: 'review', cx: 420, cy: 258, width: 110, height: 87 },
    { id: 'reflect', cx: 359, cy: 392, width: 110, height: 87 },
    { id: 'ship', cx: 481, cy: 392, width: 110, height: 87 },
    { id: 'ea', cx: 667, cy: 258, width: 110, height: 87 },
    { id: 'plan', cx: 914, cy: 258, width: 110, height: 87 },
    { id: 'bshr', cx: 853, cy: 392, width: 110, height: 87 },
    { id: 'think', cx: 975, cy: 392, width: 110, height: 87 },
    { id: 'brain', cx: 914, cy: 538, width: 110, height: 87 },
    { id: 'telegram', cx: 313, cy: 674, width: 88, height: 48 },
    { id: 'operator', cx: 413, cy: 674, width: 88, height: 48 },
    { id: 'lineage-daemon', cx: 523, cy: 674, width: 107, height: 48 },
    { id: 'approval-loop', cx: 636, cy: 674, width: 95, height: 48 },
    { id: 'message-router', cx: 748, cy: 674, width: 106, height: 48 },
    { id: 'pill:99:0', cx: 112, cy: 187, width: 25, height: 19 },
    { id: 'pill:34:1', cx: 51, cy: 325, width: 25, height: 19 },
    { id: 'pill:25:2', cx: 173, cy: 325, width: 24, height: 19 },
    { id: 'pill:59:3', cx: 420, cy: 187, width: 25, height: 19 },
    { id: 'pill:2:4', cx: 359, cy: 325, width: 18, height: 19 },
    { id: 'pill:9:5', cx: 481, cy: 325, width: 18, height: 19 },
    { id: 'pill:14:6', cx: 420, cy: 471, width: 23, height: 19 },
    { id: 'pill:106:7', cx: 667, cy: 187, width: 30, height: 19 },
    { id: 'pill:132:8', cx: 914, cy: 187, width: 29, height: 19 },
    { id: 'pill:27:9', cx: 853, cy: 325, width: 24, height: 19 },
    { id: 'pill:—:10', cx: 975, cy: 325, width: 21, height: 19 },
    { id: 'pill:—:11', cx: 914, cy: 471, width: 21, height: 19 },
  ];
  const route = routeEdge(from, to, obstacles);
  assert.equal(route.kind, 'curve-s', 'sanity: this fixture really does produce a cubic route');
  const [p0, c1, c2, p1] = parsePathPoints(route.d);
  assert.deepEqual(pointAtFraction(route, 0.5), cubicPoint(p0, c1, c2, p1, 0.5),
    'cubic midpoint matches cubicPoint exactly');
}
{
  // Polyline: equal ARC-LENGTH speed, not equal segment-count speed — a pulse must not
  // visibly speed up crossing a short segment and slow down on a long one.
  // Same near-endpoint block as the "corridor too tight for any curve" case above: a
  // quadratic's deviation tapers to ~0 near an endpoint regardless of offset, so this
  // genuinely needs the polyline shape (not a wide search finding a degenerate long curve).
  const from = { id: 'a', cx: 0, cy: 0, width: 20, height: 20 };
  const to = { id: 'b', cx: 400, cy: 0, width: 20, height: 20 };
  const nearEndBlock = { id: 'block', cx: 40, cy: 0, width: 30, height: 40 };
  const route = routeEdge(from, to, [from, to, nearEndBlock]);
  assert.equal(route.kind, 'polyline', 'sanity: this near-endpoint fixture genuinely needs the polyline shape');
  const pts = parsePathPoints(route.d);
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
  // Walk the arc-length accumulation independently (re-derived, not copied from the
  // implementation) to find the TRUE point at fraction `f` of the total ARC LENGTH.
  function expectedAt(f) {
    let target = f * total, acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const segLen = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
      if (acc + segLen >= target || i === pts.length - 2) {
        const segT = segLen === 0 ? 0 : (target - acc) / segLen;
        return { x: pts[i].x + (pts[i+1].x - pts[i].x) * segT, y: pts[i].y + (pts[i+1].y - pts[i].y) * segT };
      }
      acc += segLen;
    }
    return pts[pts.length - 1];
  }
  // This fixture's shape is start -> SHORT jump -> LONG middle run -> SHORT jump -> end. The
  // short jump segments are a small fraction of the total (checked: well under 10%), so t=0.1
  // of the TRUE arc length is already well into the long middle segment — a segment-COUNT
  // based interpolation (naively treating "3 segments" as "3 equal thirds") would instead
  // place t=0.1 still inside the first short segment. Checking several t values, not just
  // 0.5, catches this: a 3-segment shape can coincidentally agree at t=0.5 between the two
  // schemes while clearly disagreeing everywhere else.
  const jumpLen = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  assert.ok(jumpLen / total < 0.1, 'sanity: the short jump segment really is a small fraction of the total arc length');
  for (const f of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const got = pointAtFraction(route, f);
    const exp = expectedAt(f);
    assert.ok(Math.abs(got.x - exp.x) < 0.01 && Math.abs(got.y - exp.y) < 0.01,
      `t=${f} sits at the true arc-length point (${exp.x},${exp.y}), got (${got.x},${got.y})`);
  }
  assert.deepEqual(pointAtFraction(route, 0), pts[0], 't=0 is the polyline start');
  assert.deepEqual(pointAtFraction(route, 1), pts[pts.length - 1], 't=1 is the polyline end');
}

console.log('edgeRouting: all assertions passed');
