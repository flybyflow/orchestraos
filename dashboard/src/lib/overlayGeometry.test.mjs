/**
 * overlayGeometry — the pure half of the cross-edge overlay.
 *   node --experimental-strip-types dashboard/src/lib/overlayGeometry.test.mjs
 */
import assert from 'node:assert';
import {
  toLocalBox, selectCrossEdges, busiestDrawn, edgeLiveness, samePositions,
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
  console.log('PASS: edgeLiveness — dead and quiet are distinct, boundary pinned on both sides');
}

console.log('\nAll overlayGeometry tests passed.');
