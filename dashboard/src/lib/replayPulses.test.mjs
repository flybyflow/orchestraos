/**
 * Replay pulse lifecycle (PLAY/GROW/LIVE port, operator 2026-09-30).
 *   node --experimental-strip-types dashboard/src/lib/replayPulses.test.mjs
 */
import assert from 'node:assert';
import { pulseId, pulseProgress, isPulseAlive, pruneDeadPulses, pulsePositionOnRoute, PULSE_LIFETIME_MS } from './replayPulses.ts';
import { routeEdge, pointAtFraction } from './edgeRouting.ts';

// ── pulseId: deterministic, collision-proof even when `id` is ABSENT ─────────────────────
// THE REAL BUG (build, live QA 2026-09-30, traced via curl not guessed): GET
// /api/messages/history returns {t, from, to, type, subject} — no `id` field at all. The
// original pulseId (`${from}>${to}@${t}:${id ?? ''}`) degenerates to a bare `from>to@t` with a
// trailing empty string, and telegram<->gm (the busiest real pair) produced two events in the
// same millisecond that collided on that exact key. React drops/duplicates a child on a
// duplicate key with NO error — the pulse silently does not appear, reading as "no traffic"
// (the same failure shape as PR 137's FIX 3).
{
  // The exact real shape: no `id` field at all, not even `id: undefined` — matches what
  // JSON.parse of the real endpoint's response actually produces.
  const e1 = { from: 'telegram', to: 'gm', t: 1790707087581, type: 'reply' };
  const e2 = { from: 'telegram', to: 'gm', t: 1790707087581, type: 'task' };

  // THIS is the bug, demonstrated directly rather than asserted away: calling pulseId with
  // ids that happen to coincide (both absent) must NOT collide once given distinct batch
  // indices — the index is what makes this safe, not hoping the API adds an id back.
  assert.notEqual(pulseId(e1, 0), pulseId(e2, 1),
    'two same-pair, same-millisecond, NO-id events get distinct keys via their batch index');

  // Determinism: the SAME event at the SAME index always produces the SAME key (not random,
  // not time-of-render-dependent) — needed so React does not remount a still-alive pulse.
  assert.equal(pulseId(e1, 0), pulseId({ ...e1 }, 0), 'same event, same index -> same id, every time');

  // An id, when present, still flows through (defense in depth — see the function's own
  // comment on why the index is the load-bearing part, not this).
  const withId1 = { ...e1, id: 'msg_1' };
  const withId2 = { ...e2, id: 'msg_2' };
  assert.notEqual(pulseId(withId1, 0), pulseId(withId2, 0), 'distinct real ids also produce distinct keys, even at the same index');
}

// ── pulseProgress: 0 at start, 1 at end, clamped both directions ──────────────────────────
{
  const pulse = { id: 'p1', a: 'build', b: 'review', type: 'reply', startedAt: 1000 };
  assert.equal(pulseProgress(pulse, 1000), 0, 'progress is 0 the instant a pulse starts');
  assert.equal(pulseProgress(pulse, 1000 + PULSE_LIFETIME_MS), 1, 'progress is exactly 1 at the lifetime boundary');
  assert.equal(pulseProgress(pulse, 1000 + PULSE_LIFETIME_MS / 2), 0.5, 'progress is linear in elapsed time');
  assert.equal(pulseProgress(pulse, 1000 + PULSE_LIFETIME_MS * 10), 1, 'clamped at 1 — a pulse checked long after its lifetime never reports > 1');
  assert.equal(pulseProgress(pulse, 500), 0, 'clamped at 0 — a `now` before startedAt (a fake clock in a test) never goes negative');
}

// ── isPulseAlive / pruneDeadPulses ──────────────────────────────────────────────────────
{
  const p1 = { id: 'p1', a: 'a', b: 'b', type: null, startedAt: 0 };
  const p2 = { id: 'p2', a: 'a', b: 'b', type: null, startedAt: 1000 };
  assert.equal(isPulseAlive(p1, 500), true, 'still within its lifetime');
  assert.equal(isPulseAlive(p1, PULSE_LIFETIME_MS), false, 'the frame that reaches the lifetime boundary is already dead, not an extra render past the far box');
  assert.equal(isPulseAlive(p1, PULSE_LIFETIME_MS - 1), true, 'one ms before the boundary is still alive');

  const now = PULSE_LIFETIME_MS + 500; // p1 (started at 0) is dead; p2 (started at 1000) is alive
  const pruned = pruneDeadPulses([p1, p2], now);
  assert.deepEqual(pruned.map((p) => p.id), ['p2'], 'only the still-alive pulse survives pruning');
  assert.deepEqual(pruneDeadPulses([], now), [], 'pruning an empty list throws nothing and returns empty');
}

// ── pulsePositionOnRoute: a REVERSE pulse rides the SAME curve as the drawn edge, not a
// second, independently-routed one (build, live QA 2026-09-30: 239 of 301 reverse pulses sat
// 10-62px off the line) ────────────────────────────────────────────────────────────────────
{
  // Same fixture shape as edgeRouting.test.mjs's "a chord straight through one box -> curve":
  // a blocker centered on the chord forces a REAL curve (ctrl off the midpoint), not a
  // degenerate straight one — a straight-chord fixture would pass with the bug still in,
  // exactly the trap the cubic-S work already caught itself in once.
  const boxA = { id: 'a', cx: 0, cy: 0, width: 20, height: 20 };
  const boxB = { id: 'b', cx: 200, cy: 0, width: 20, height: 20 };
  const blocker = { id: 'mid', cx: 100, cy: 0, width: 40, height: 20 };
  const obstacles = [boxA, boxB, blocker];

  // THE canonical route — computed exactly once, the way the edge itself draws it, for pair
  // (a='a', b='b'). Every pulse on this pair, forward or reverse, must sample THIS object.
  const canonicalRoute = routeEdge(boxA, boxB, obstacles);
  assert.equal(canonicalRoute.kind, 'curve', 'fixture sanity: this must be a genuinely curved route, not a straight chord');

  // Dense sampling of the ACTUAL canonical curve — the reference "is this point on the drawn
  // line" check, independent of how pulsePositionOnRoute computes anything internally.
  const curveSamples = Array.from({ length: 200 }, (_, i) => pointAtFraction(canonicalRoute, i / 199));
  const distToCurve = (pt) => Math.min(...curveSamples.map((s) => Math.hypot(s.x - pt.x, s.y - pt.y)));

  const now = 300; // PULSE_LIFETIME_MS=1200, so t = 300/1200 = 0.25
  const forwardPulse = { a: 'a', b: 'b', startedAt: 0 };
  const reversePulse = { a: 'b', b: 'a', startedAt: 0 };

  const forwardPos = pulsePositionOnRoute(forwardPulse, 'a', canonicalRoute, now);
  assert.deepEqual(forwardPos, pointAtFraction(canonicalRoute, 0.25),
    'a forward pulse (a matches the canonical a) rides the route at raw t');

  const reversePos = pulsePositionOnRoute(reversePulse, 'a', canonicalRoute, now);
  assert.deepEqual(reversePos, pointAtFraction(canonicalRoute, 0.75),
    'a reverse pulse (a is the canonical b) rides the SAME route at (1 - t), not a recomputed one');
  assert.ok(distToCurve(reversePos) < 2,
    'the reverse pulse position lies (within sampling granularity) ON the canonical curve that is actually drawn');

  // THE BUG, reproduced directly (this is what the old TopologyOverlay.tsx pulse loop did: a
  // second routeEdge call using the pulse's own, reversed (a, b), then sampled at raw t with
  // no direction handling at all). If pulsePositionOnRoute regresses back to this pattern,
  // this assertion is what catches it.
  const oldBuggyRoute = routeEdge(boxB, boxA, obstacles); // swapped args, exactly like the old per-pulse call
  const oldBuggyPos = pointAtFraction(oldBuggyRoute, 0.25); // old code used raw t, no reversal
  assert.ok(distToCurve(oldBuggyPos) > 5,
    `the OLD per-pulse-routeEdge approach lands ${distToCurve(oldBuggyPos).toFixed(1)}px off the drawn curve -- ` +
    'proving this fixture actually exercises the asymmetry, and that the fix (reuse + reversed-t) is what avoids it');
}

console.log('replayPulses: all assertions passed');
