/**
 * Replay pulse lifecycle (PLAY/GROW/LIVE port, operator 2026-09-30).
 *   node --experimental-strip-types dashboard/src/lib/replayPulses.test.mjs
 */
import assert from 'node:assert';
import { pulseId, pulseProgress, isPulseAlive, pruneDeadPulses, PULSE_LIFETIME_MS } from './replayPulses.ts';

// ── pulseId: deterministic, distinguishes concurrent pulses on the same pair ──────────────
{
  const e1 = { from: 'build', to: 'review', t: 1000, id: 'msg_1' };
  const e2 = { from: 'build', to: 'review', t: 1000, id: 'msg_2' };
  assert.notEqual(pulseId(e1), pulseId(e2), 'two events on the SAME pair at the SAME instant still get distinct ids (real ids differ)');
  assert.equal(pulseId(e1), pulseId({ ...e1 }), 'the same event always produces the same id — deterministic, not random');
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
