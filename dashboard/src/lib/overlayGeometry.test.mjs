/**
 * overlayGeometry — the pure half of the cross-edge overlay.
 *   node --experimental-strip-types dashboard/src/lib/overlayGeometry.test.mjs
 */
import assert from 'node:assert';
import {
  toLocalBox, selectCrossEdges, busiestDrawn, edgeLiveness, samePositions, edgeDirection,
  bornUpTo, overlayContentSize, filterExistedByAsof,
} from './overlayGeometry.ts';

// ── samePositions: the guard that stops an infinite render loop ─────────────
// THE BUG THIS EXISTS FOR. The overlay measures in a useLayoutEffect with no
// dependency array — it must, because a node's box can move without any prop
// changing. Measuring builds a fresh Map, and committing a fresh Map
// unconditionally re-renders forever: React bails with "too many re-renders",
// unmounts the tree, and the WHOLE PAGE goes blank. Shipped exactly that;
// review caught it with a before/after control (root.childElementCount 1 on
// the previous commit, 0 on mine, same browser, same minute).
//
// The invariant is: measuring an unchanged layout must be a no-op.
{
  const box = (id, cx, cy) => ({ id, cx, cy, width: 100, height: 40 });
  const a = new Map([['gm', box('gm', 10, 20)], ['build', box('build', 30, 60)]]);
  const b = new Map([['gm', box('gm', 10, 20)], ['build', box('build', 30, 60)]]);

  assert.strictEqual(samePositions(a, b), true,
    'two freshly-built maps of the SAME layout must compare equal — this is the whole fix');
  assert.strictEqual(a === b, false, 'and they are deliberately not the same object');
  assert.strictEqual(samePositions(a, a), true, 'identity short-circuit');

  // Real movement must still commit, or edges freeze at stale coordinates —
  // which is the failure the loop was accidentally protecting against.
  assert.strictEqual(samePositions(a, new Map([['gm', box('gm', 11, 20)], ['build', box('build', 30, 60)]])), false,
    'a moved node must NOT be treated as unchanged');
  assert.strictEqual(samePositions(a, new Map([['gm', box('gm', 10, 20)]])), false, 'a removed node counts');
  assert.strictEqual(
    samePositions(a, new Map([['gm', box('gm', 10, 20)], ['other', box('other', 30, 60)]])), false,
    'same size, different ids — must not be fooled by count alone');
  assert.strictEqual(samePositions(new Map(), new Map()), true, 'empty equals empty, so first paint settles');

  // Sub-pixel jitter from fractional layout must not re-render forever at a
  // lower frequency — a slow loop is still a loop.
  assert.strictEqual(samePositions(a, new Map([['gm', box('gm', 10.3, 20.2)], ['build', box('build', 30, 60)]])), true,
    'sub-pixel jitter is not movement');
  assert.strictEqual(samePositions(a, new Map([['gm', box('gm', 10.9, 20)], ['build', box('build', 30, 60)]])), false,
    'but a whole pixel is');
  console.log('PASS: samePositions — unchanged layout is a no-op, real movement is not');
}

const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// ── toLocalBox ──────────────────────────────────────────────────────────────
{
  const container = { left: 100, top: 50, width: 800, height: 600 };
  const node = { left: 340, top: 150, width: 120, height: 40 };
  const box = toLocalBox('build', node, container);
  assert.deepStrictEqual(box, { id: 'build', cx: 300, cy: 120, width: 120, height: 40 });

  // THE SCROLL CASE — design §2.5 correction 1. The container is overflow-x-auto;
  // if the offset is ignored every cross-edge silently drifts, and a line
  // connected to the wrong node still looks connected.
  const scrolled = toLocalBox('build', node, container, 250, 0);
  assert.strictEqual(scrolled.cx, 550, 'horizontal scroll must shift the local x');
  assert.strictEqual(scrolled.cy, 120, 'and must not touch y');
  assert.notStrictEqual(scrolled.cx, box.cx, 'ignoring scrollLeft is the bug, not a no-op');

  // A node scrolled fully out to the left gets a negative local x rather than being
  // clamped — clamping would pile every off-screen node onto the same coordinate and
  // draw a fan of edges to a point that is not there.
  const off = toLocalBox('x', { left: 0, top: 150, width: 100, height: 40 }, container);
  assert.ok(off.cx < 0, 'off-container nodes keep honest negative coordinates');
  console.log('PASS: toLocalBox — container origin, scroll offset, off-screen honesty');
}

// ── selectCrossEdges ────────────────────────────────────────────────────────
{
  const pairs = [
    { a: 'gm', b: 'build', count: 168 },   // hierarchy — tree already draws it
    { a: 'gm', b: 'telegram', count: 155 },
    { a: 'build', b: 'review', count: 76 },
    { a: 'gm-g2', b: 'operator', count: 6 }, // gm-g2 is hidden -> undrawable
    { a: 'ea', b: 'ship', count: 3 },
  ];
  const positioned = new Set(['gm', 'build', 'review', 'ea', 'ship', 'telegram', 'operator']);
  const hierarchy = new Set([key('gm', 'build')]);

  const all = selectCrossEdges(pairs, positioned, hierarchy, key, null);
  assert.deepStrictEqual(all.hierarchical.map((p) => p.b), ['build'],
    'a pair the tree already draws must not be drawn twice');
  assert.deepStrictEqual(all.unpositioned.map((p) => p.a), ['gm-g2'],
    'an endpoint with no position is undrawable — this is the 31-vs-30 case');
  assert.deepStrictEqual(all.drawn.map((p) => p.count), [155, 76, 3], 'count desc');
  assert.deepStrictEqual(all.hiddenByCap, [], 'no cap means nothing held back');

  // The cap splits drawn/hiddenByCap and NOTHING else — "show all" must reveal
  // exactly hiddenByCap, never accidentally reveal an unpositioned pair it
  // cannot actually draw.
  const capped = selectCrossEdges(pairs, positioned, hierarchy, key, 2);
  assert.deepStrictEqual(capped.drawn.map((p) => p.count), [155, 76]);
  assert.deepStrictEqual(capped.hiddenByCap.map((p) => p.count), [3]);
  assert.deepStrictEqual(capped.unpositioned.map((p) => p.a), ['gm-g2'],
    'the cap must not swallow an undrawable pair into hiddenByCap');
  assert.strictEqual(
    capped.drawn.length + capped.hiddenByCap.length + capped.unpositioned.length + capped.hierarchical.length,
    pairs.length, 'every pair lands in exactly one bucket');

  // Equal counts must not reorder between renders.
  const tied = [{ a: 'z', b: 'y', count: 5 }, { a: 'a', b: 'b', count: 5 }];
  const pos2 = new Set(['a', 'b', 'y', 'z']);
  const first = selectCrossEdges(tied, pos2, new Set(), key, null).drawn.map((p) => p.a);
  const second = selectCrossEdges([...tied].reverse(), pos2, new Set(), key, null).drawn.map((p) => p.a);
  assert.deepStrictEqual(first, second, 'equal-count ordering is stable regardless of input order');

  assert.deepStrictEqual(selectCrossEdges([], new Set(), new Set(), key, 12).drawn, []);
  assert.deepStrictEqual(selectCrossEdges(pairs, positioned, hierarchy, key, 0).drawn, [],
    'a cap of 0 draws nothing and holds everything back');
  console.log('PASS: selectCrossEdges — four disjoint buckets, stable order, cap is display-only');
}

// ── busiestDrawn ────────────────────────────────────────────────────────────
{
  // review's finding, generalised: scaling against a pair nobody can see draws every
  // visible line too thin. The denominator is the busiest edge ON SCREEN.
  assert.strictEqual(busiestDrawn([{ a: 'x', b: 'y', count: 40 }], 131), 131,
    'a busier hierarchy edge is still the denominator');
  assert.strictEqual(busiestDrawn([{ a: 'x', b: 'y', count: 155 }], 131), 155,
    'a busier cross-edge takes over the denominator');
  assert.strictEqual(busiestDrawn([], 0), 1, 'never zero — no divide-by-zero on first paint');
  console.log('PASS: busiestDrawn — shared denominator, never zero');
}

// ── edgeLiveness ────────────────────────────────────────────────────────────
{
  const now = Date.parse('2026-09-30T12:00:00Z');
  const hour = 3600_000;
  assert.strictEqual(edgeLiveness(5, now - hour, now, 24 * hour), 'live');
  // Just outside the window = QUIET, not dead. One grey line for both would say
  // "nothing here" about a connection that is merely idle.
  assert.strictEqual(edgeLiveness(0, now - 25 * hour, now, 48 * hour), 'quiet');
  assert.strictEqual(edgeLiveness(0, now - 200 * hour, now, 48 * hour), 'dead');
  assert.strictEqual(edgeLiveness(0, null, now, 48 * hour), 'dead',
    'no all-time last_at at all is dead, not quiet');
  // The boundary itself, both sides — an off-by-one here silently reclassifies
  // every edge sitting exactly on the threshold.
  assert.strictEqual(edgeLiveness(0, now - 48 * hour, now, 48 * hour), 'quiet', 'exactly at the edge is quiet');
  assert.strictEqual(edgeLiveness(0, now - 48 * hour - 1, now, 48 * hour), 'dead', 'one ms past is dead');

  // THE SCRUB CASE. `now` is the VIEWED moment. A pair whose last traffic is after it
  // has not happened yet — it is not quiet, and saying "last traffic just outside the
  // window" about a conversation that had not started is a claim the data cannot
  // support. Found by the operator scrubbing to ~Sep 25 and seeing nine such tooltips.
  const asof = Date.parse('2026-09-25T00:00:00Z');
  assert.strictEqual(edgeLiveness(0, now, asof, 48 * hour), 'absent',
    'traffic in the viewed moment FUTURE means the edge does not exist yet');
  assert.strictEqual(edgeLiveness(0, asof - hour, asof, 48 * hour), 'quiet',
    'traffic just before the viewed moment is genuinely quiet');
  assert.strictEqual(edgeLiveness(0, asof + 1, asof, 48 * hour), 'absent',
    'one ms after the viewed moment is already absent, not quiet');
  console.log('PASS: edgeLiveness — dead and quiet are distinct, boundary pinned on both sides');
}

// ── edgeDirection: null is an answer, not a failure to decide ──────────────
{
  // Real, measured pairs from the live store — not invented ratios.
  assert.strictEqual(edgeDirection(61, 98), 'ba', 'gm<->telegram leans telegram->gm');
  assert.strictEqual(edgeDirection(54, 94), 'ba', 'build<->gm leans gm->build');
  assert.strictEqual(edgeDirection(60, 30), 'ab', 'gm<->plan is 2:1 the other way');

  // THE ONE THAT MATTERS: ea<->gm is exactly 53/53 today. Drawing an arrow on it
  // would invent a direction the data does not have.
  assert.strictEqual(edgeDirection(53, 53), null, 'an even pair gets NO arrow, not a coin flip');

  // A one-message lead is noise, not a direction.
  assert.strictEqual(edgeDirection(10, 9), null, 'a 1-message lead is not a direction');
  assert.strictEqual(edgeDirection(1, 0), null, 'nor is a single message with nothing back');

  // Close-but-not-equal must also stay null: 63/45 is a lead, but only 58% of the
  // traffic — below the share threshold, so it reads as two-way.
  assert.strictEqual(edgeDirection(63, 45), null, '58% is a lean, not a direction');
  assert.strictEqual(edgeDirection(90, 10), 'ab', '90% clearly is');

  assert.strictEqual(edgeDirection(0, 0), null, 'a dead pair has no direction and must not divide by zero');
  console.log('PASS: edgeDirection — null on even/noisy pairs, arrows only when earned');
}

// ── bornUpTo: the GROW fold ────────────────────────────────────────────────
{
  const pk = (a, b) => [a, b].sort().join('|');

  // A message births both ends AND the edge. Three facts from one event.
  const evs = [{ from: 'gm', to: 'build', type: 'task' }];
  const r1 = bornUpTo(evs, 1, pk);
  assert.deepStrictEqual([...r1.nodes].sort(), ['build', 'gm']);
  assert.deepStrictEqual([...r1.edges], ['build|gm']);
  console.log('PASS: bornUpTo — one message births both ends and the edge');

  // THE ONE THAT MATTERS: idx is a PREFIX length, not "all events". An event the cursor has
  // not reached yet must not reveal anything, or GROW shows the whole chart on frame one.
  const three = [{ from: 'a', to: 'b' }, { from: 'c', to: 'd' }, { from: 'e', to: 'f' }];
  assert.deepStrictEqual([...bornUpTo(three, 0, pk).nodes], [], 'idx 0 reveals nothing');
  assert.deepStrictEqual([...bornUpTo(three, 2, pk).nodes].sort(), ['a', 'b', 'c', 'd'],
    'idx 2 reveals the first two events and NOT the third');
  assert.strictEqual(bornUpTo(three, 2, pk).edges.has('e|f'), false, 'and not the third edge');
  console.log('PASS: bornUpTo — idx is a prefix, the unreached tail stays hidden');

  // idx past the end is the natural state at end-of-replay; it must clamp, not read undefined.
  assert.deepStrictEqual([...bornUpTo(three, 999, pk).nodes].sort(), ['a', 'b', 'c', 'd', 'e', 'f']);

  // A spawn births a node with no edge — the asymmetry the two sets exist for.
  const r4 = bornUpTo([{ kind: 'spawn', id: 'ea' }], 1, pk);
  assert.deepStrictEqual([...r4.nodes], ['ea']);
  assert.strictEqual(r4.edges.size, 0, 'a spawn must not invent an edge');
  console.log('PASS: bornUpTo — a spawn births a node and no edge');

  // A half-event names no edge and must not birth an undefined node.
  const r6 = bornUpTo([{ from: 'gm' }], 1, pk);
  assert.strictEqual(r6.nodes.size, 0, 'a message with no recipient reveals nothing');
  assert.strictEqual(r6.edges.size, 0);

  // A spawn with no id must not add the empty string as a node.
  assert.strictEqual(bornUpTo([{ kind: 'spawn' }], 1, pk).nodes.size, 0);
  console.log('PASS: bornUpTo — half events and id-less spawns reveal nothing');
}

// ── overlayContentSize: the svg must cover every node, not just the viewport ────────────────
// THE BUG (operator live QA, 2026-09-30): sizing the svg from container.clientWidth alone left
// it narrower than the tree whenever the tree overflows horizontally — at a 1000px window,
// clientWidth 630 but real tree content 854, so build/builder-1/builder-2 sat past the svg's
// own right edge, unreachable by anything the svg draws (an <svg>'s default overflow is
// hidden). Fixture below reproduces the exact reported numbers.
{
  const box = (id, cx, cy, w = 110, h = 87) => ({ id, cx, cy, width: w, height: h });
  // Three nodes whose right edge runs past clientWidth=630 -- the operator's 1000px-window
  // reading (content needs to reach x=854, i.e. a box centered such that cx + w/2 = 854).
  const positions = new Map([
    ['gm', box('gm', 400, 40)],
    ['build', box('build', 221, 170)],
    ['builder-1', box('builder-1', 500, 300)],
    ['builder-2', box('builder-2', 799, 300)], // cx 799 + w/2 55 = 854, the reported content width
  ]);

  const sized = overlayContentSize(positions, 630, 400);
  // THE OLD BUG was exactly `sized.w === 630` (clientWidth alone, no widening) -- this
  // assertion is what catches a regression back to that.
  assert.strictEqual(sized.w, 854, 'svg widens to the tree content extent (854), not left at clientWidth (630)');

  // A tree that fits comfortably inside the viewport must NOT be shrunk -- the svg is never
  // smaller than the client box, only ever widened to cover overflow.
  const fitsFine = new Map([['gm', box('gm', 100, 40)], ['build', box('build', 200, 170)]]);
  assert.deepStrictEqual(overlayContentSize(fitsFine, 630, 400), { w: 630, h: 400 },
    'content well inside the viewport leaves the svg at the client size, not shrunk to content');

  // Empty positions (first paint, nothing registered yet) must not throw and must fall back to
  // the client box exactly -- the svg still needs SOME size before any node has measured in.
  assert.deepStrictEqual(overlayContentSize(new Map(), 630, 400), { w: 630, h: 400 });

  // NOT container.scrollWidth: scrollWidth already includes the svg's own current width (it is
  // itself an absolutely-positioned child of the scrolling container), so feeding it back in
  // would only ever grow -- the exact regression toLocalBox's own comment describes. This
  // function takes positions and a plain clientWidth number; it has no way to read scrollWidth
  // at all, which is the guarantee, not just an assertion about this call's arguments.
  console.log('PASS: overlayContentSize — widens to real tree content, never shrinks below the viewport, no scrollWidth feedback loop possible');
}

// ── filterExistedByAsof + selectCrossEdges: filter BEFORE the cap, not after ────────────────
// THE BUG (operator live QA, 2026-09-30): scrubbed to Sep 25, a top-12 cap applied to the
// full, un-asof-filtered pair list drew only 2 edges; even "show all" (uncapped) drew only 6,
// with at least 15 real existed-by-asof pairs dropped. Root cause: the cap sorts by count
// desc with a stable alphabetical tiebreak among ties, and every pair that has not happened
// yet at the viewed moment has count 0 in that window -- tied with every pair that genuinely
// went quiet or dead by then. Capping BEFORE dropping the not-yet-existed ones lets them eat
// cap slots a real pair should have gotten; only the filter order decides which zero-count
// pairs the cap sees at all.
{
  const viewedNowMs = 2000;
  const windowMs = 1000;
  const row = (a, b, count, lastAt) => ({ a, b, count, last_at: lastAt });

  // 1 pair with real traffic by the viewed moment -- always survives on count alone.
  const live = [row('hub', 'live0', 5, '1970-01-01T00:00:01.500Z')];
  // 3 pairs that genuinely existed by the viewed moment (count 0 in-window, but last activity
  // at or before it) -- named 'real_*' so it sorts AFTER 'absent_*' below, the exact ordering
  // that lets the cap-first bug bite.
  const real = [0, 1, 2].map((i) => row('hub', `real_${i}`, 0, new Date(500).toISOString()));
  // 5 pairs whose ONLY activity is strictly after the viewed moment -- they have not happened
  // yet at asof. Named 'absent_*' so they sort FIRST among the count-0 ties.
  const absent = [0, 1, 2, 3, 4].map((i) => row('hub', `absent_${i}`, 0, new Date(3000).toISOString()));

  const rows = [...live, ...real, ...absent];
  const positioned = new Set(['hub', 'live0', 'real_0', 'real_1', 'real_2', 'absent_0', 'absent_1', 'absent_2', 'absent_3', 'absent_4']);
  const topN = 4;

  // THE OLD (buggy) ORDER: cap first, drop absent ones after. Reproduced directly, not
  // assumed -- this is exactly what TopologyDiagram.tsx used to do before this fix.
  const oldCapped = selectCrossEdges(rows, positioned, new Set(), key, topN).drawn;
  const oldSurvivors = oldCapped.filter((p) => {
    const lastAt = p.last_at ? Date.parse(p.last_at) : null;
    return edgeLiveness(p.count, lastAt, viewedNowMs, windowMs) !== 'absent';
  });
  assert.deepStrictEqual(oldSurvivors.map((p) => p.b).sort(), ['live0'],
    'cap-then-filter: the cap fills with absent pairs before the real ones ever get a chance, leaving just the one live pair');

  // THE FIX: filter first, then cap. All 3 real pairs (plus live0) are among the candidates
  // the cap chooses from, so all 4 of the real ones survive within topN=4.
  const preFiltered = filterExistedByAsof(rows, viewedNowMs, windowMs);
  const newDrawn = selectCrossEdges(preFiltered, positioned, new Set(), key, topN).drawn;
  assert.deepStrictEqual(newDrawn.map((p) => p.b).sort(), ['live0', 'real_0', 'real_1', 'real_2'],
    'filter-then-cap: the cap only ever competes among pairs that actually existed by the viewed moment');

  console.log('PASS: filterExistedByAsof — asof-filtering before the cap keeps real pairs the old cap-then-filter order dropped');
}

console.log('\nAll overlayGeometry tests passed.');
