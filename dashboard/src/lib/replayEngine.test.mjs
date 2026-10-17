import assert from 'node:assert';
import { test } from 'node:test';
import {
  REPLAY_MS, SNAP_N, initReplay, span, fraction, startPlay, advance, seek, pause, setLive, setSpeed, setGrowth,
} from './replayEngine.ts';

function ev(t, from = 'a', to = 'b', type = 'task', id) {
  return { t, from, to, type, id };
}

test('advance fires events in t order and never re-fires one', () => {
  // Hand-constructed state (not via startPlay) positioned BEFORE the window, so this pins
  // advance()'s own firing/ordering contract in isolation from startPlay's restart boundary
  // (that boundary is pinned separately, see the restart test below).
  const events = [ev(1000), ev(2000), ev(3000), ev(4000)];
  let state = { events, playing: true, idx: 0, live: false, cursor: 0, t0: 1000, t1: 4000, speed: 1, growth: false };
  const spanMs = 3000; // t1 - t0
  const toDt = (cursorDelta) => (cursorDelta * REPLAY_MS) / spanMs; // inverse of advance's own formula

  const r1 = advance(state, toDt(1500)); // cursor 0 -> 1500: fires t=1000 only
  state = r1.state;
  const r2 = advance(state, toDt(1500)); // cursor 1500 -> 3000: fires t=2000 and t=3000
  state = r2.state;
  const r3 = advance(state, toDt(3000)); // cursor 3000 -> 6000: fires t=4000
  state = r3.state;

  const allFired = [...r1.fired, ...r2.fired, ...r3.fired];
  assert.deepStrictEqual(allFired.map((e) => e.t), [1000, 2000, 3000, 4000]);
  assert.strictEqual(state.idx, 4);
});

test('speed 4 fires strictly more events than speed 1 for the same dt, same fixture', () => {
  const events = [ev(1000), ev(2000), ev(3000), ev(4000)];
  const base = { events, playing: true, idx: 0, live: false, cursor: 0, t0: 1000, t1: 4000, speed: 1, growth: false };
  const dt = 7500; // -> cursor delta 500 at speed 1, 2000 at speed 4 (span=3000)

  const slow = advance(base, dt);
  const fast = advance({ ...base, speed: 4 }, dt);
  assert.ok(fast.fired.length > slow.fired.length,
    `speed 4 fired ${fast.fired.length}, speed 1 fired ${slow.fired.length} -- expected strictly more`);
});

test('startPlay restart (f>=0.999 -> 0): cursor resets to t0, idx resets to the start (not wherever it was), and the FIRST event actually fires', () => {
  // Real bug, found live on the rendered page (operator QA): a from-scratch replay's very
  // first event never fired. Root cause: startPlay's idx used to share seek's `t > cursor`
  // boundary, and cursor === t0 === events[0].t exactly on a from-scratch restart, so "t >
  // cursor" excluded index 0 permanently (idx only moves forward). Fixed with a separate
  // `firstIndexAtOrAfter` (t >= cursor) for startPlay specifically -- see the two helper
  // functions' comments at the top of this file for why they must stay different. This test
  // pins both things that matter: idx actually resets on restart (build's brief: "asserting
  // cursor alone passes even if idx is wrong"), AND the earliest event is reachable.
  // Distinct ids, per build's ask: a count- or timestamp-only assertion passes even if the
  // WRONG event at the right instant fires (exactly how QA caught this live -- firstFiredId
  // was one row off from the API's actual first event, not merely "an event was missing").
  const events = [ev(1000, 'a', 'b', 'task', 'tg-589340096'), ev(2000, 'a', 'b', 'task', 'tg-589340097'), ev(3000, 'a', 'b', 'task', 'tg-589340098')];
  const midPlayback = { events, playing: true, idx: 2, live: false, cursor: 2900, t0: 1000, t1: 3000, speed: 1, growth: false };

  const restarted = startPlay(midPlayback, 0.9995);
  assert.strictEqual(restarted.cursor, restarted.t0, 'cursor must reset to t0');
  assert.strictEqual(restarted.idx, 0, 'idx must reset to the START of the window (index 0, the earliest event), not stay at 2');

  const { fired } = advance(restarted, 1); // any dt>0; cursor already sits ON t0=events[0].t
  assert.strictEqual(fired[0]?.id, 'tg-589340096', 'the first fired event must be the actual earliest event by id, not just any event at t0');
});

test('seek trail: exactly min(SNAP_N, available) entries, strictly descending weights, newest 1.0, oldest at the real formula value', () => {
  // 30 events at t = 0, 100, 200, ... 2900 so there are more than SNAP_N available before the cursor.
  const events = Array.from({ length: 30 }, (_, i) => ev(i * 100));
  const state = initReplay(events);
  const { trail } = seek(state, 1); // cursor at t1 (2900) -- every event is at/before it

  assert.strictEqual(trail.length, SNAP_N);
  assert.strictEqual(trail[0].weight, 1, 'newest entry must be weight 1.0');
  // Compute the real number from the formula, not a hand-typed literal (build's own instruction).
  const expectedOldest = 1 - ((SNAP_N - 1) / SNAP_N) * 0.82;
  assert.strictEqual(trail[trail.length - 1].weight, expectedOldest);
  for (let i = 1; i < trail.length; i++) {
    assert.ok(trail[i].weight < trail[i - 1].weight, `weights must strictly descend at index ${i}`);
  }
  // Newest-first: trail[0] is the event closest to the cursor.
  assert.strictEqual(trail[0].event.t, 2900);
});

test('seek at a cursor before the first event returns an empty trail, not a crash', () => {
  const events = [ev(5000), ev(6000)];
  // Hand-constructed: t0 deliberately earlier than the first real event, so seeking to f=0
  // lands the cursor before anything has happened yet.
  const state = { events, playing: false, idx: 0, live: true, cursor: 0, t0: 1000, t1: 6000, speed: 1, growth: false };
  const { trail } = seek(state, 0);
  assert.deepStrictEqual(trail, []);
});

test('advance with dt=0 fires nothing and returns the SAME state object (reference equality, for re-render guards)', () => {
  const state = startPlay(initReplay([ev(1000), ev(2000)]), 0);
  const r = advance(state, 0);
  assert.strictEqual(r.state, state, 'dt=0 must not allocate a new state object');
  assert.deepStrictEqual(r.fired, []);
});

test('span()===1 guard: a single-event window does not divide by zero or NaN the cursor', () => {
  const state = initReplay([ev(5000)]);
  assert.strictEqual(span(state), 1);
  assert.ok(!Number.isNaN(fraction(state)));
  const played = startPlay(state, 0);
  assert.ok(Number.isFinite(played.cursor));
  const { state: advanced } = advance(played, 1000);
  assert.ok(Number.isFinite(advanced.cursor) && !Number.isNaN(advanced.cursor));
});

test('ended is true exactly when idx reaches the end, not one frame early or late', () => {
  const events = [ev(1000), ev(2000)];
  let state = { events, playing: true, idx: 0, live: false, cursor: 0, t0: 1000, t1: 2000, speed: 1, growth: false };
  const spanMs = 1000;
  const toDt = (cursorDelta) => (cursorDelta * REPLAY_MS) / spanMs;

  const r1 = advance(state, toDt(1500)); // cursor -> 1500: fires t=1000 only, one event still pending
  assert.strictEqual(r1.ended, false, 'must not be ended with one event still pending');
  state = r1.state;

  const r2 = advance(state, toDt(3000)); // cursor -> 4500: fires t=2000, nothing left
  assert.strictEqual(r2.ended, true, 'must be ended once the last event has fired');
  // The contract useReplay.ts's loop() depends on: the SAME call that reports ended:true must
  // still return whatever fired on that frame -- advance() does not silently drop the final
  // batch. (A caller discarding fired on the ended branch is a real bug this pins the engine's
  // half of: QA found the tail of a replay losing events -- 24h lost 3 of 1165, "all" lost 47
  // -- and this is the guarantee the fix in useReplay.ts relies on.)
  assert.deepStrictEqual(r2.fired.map((e) => e.t), [2000], 'the ending call must still report its own fired events, not an empty list');
});

test('pause/setLive/setSpeed/setGrowth are pure, minimal state transitions', () => {
  const state = startPlay(initReplay([ev(1000), ev(2000)]), 0);
  assert.strictEqual(pause(state).playing, false);
  const live = setLive({ ...state, growth: true });
  assert.deepStrictEqual(
    { live: live.live, playing: live.playing, growth: live.growth, cursor: live.cursor, idx: live.idx },
    { live: true, playing: false, growth: false, cursor: state.t1, idx: state.events.length },
  );
  assert.strictEqual(setSpeed(state, 4).speed, 4);
  assert.strictEqual(setGrowth(state, true).growth, true);
});
