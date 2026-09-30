/**
 * Replay pulse lifecycle (PLAY/GROW/LIVE port, operator 2026-09-30).
 *   node --experimental-strip-types dashboard/src/lib/replayPulses.test.mjs
 */
import assert from 'node:assert';
import { pulseId, pulseProgress, isPulseAlive, pruneDeadPulses, PULSE_LIFETIME_MS } from './replayPulses.ts';

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

console.log('replayPulses: all assertions passed');
