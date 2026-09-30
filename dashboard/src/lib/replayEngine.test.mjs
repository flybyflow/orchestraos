import assert from 'node:assert';
import { test } from 'node:test';
import {
  REPLAY_MS, SNAP_N, initReplay, span, fraction, startPlay, advance, seek, pause, setLive, setSpeed, setGrowth,
} from './replayEngine.ts';

function ev(t, from = 'a', to = 'b', type = 'task') {
  return { t, from, to, type };
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

test('startPlay restart (f>=0.999 -> 0): cursor resets to t0, and idx resets to the start of the window rather than staying wherever it was', () => {
  // REAL FINDING, not asserted blindly: per the given formula (idx = first event with t >
  // cursor, applied identically in startPlay/seek), a from-scratch restart's cursor lands
  // EXACTLY on the first event's own timestamp (cursor === t0 === events[0].t by construction),
  // and "t > cursor" therefore excludes that first event from ever firing again -- it is
  // permanently treated as already-passed the instant the cursor sits on top of it. Verified
  // against /field's literal source (same `findIndex(e => t > cursor)` rule, read directly,
  // not assumed) -- this is inherited behaviour, not a bug introduced here. So the event that
  // actually fires first after a restart is events[1], not events[0]. This test still pins the
  // thing build's brief cared about: that idx is actually RESET on restart rather than left
  // wherever late/mid-playback parked it (the brief's own parenthetical: "asserting cursor
  // alone passes even if idx is wrong").
  const events = [ev(1000), ev(2000), ev(3000)];
  const midPlayback = { events, playing: true, idx: 2, live: false, cursor: 2900, t0: 1000, t1: 3000, speed: 1, growth: false };

  const restarted = startPlay(midPlayback, 0.9995);
  assert.strictEqual(restarted.cursor, restarted.t0, 'cursor must reset to t0');
  assert.strictEqual(restarted.idx, 1, 'idx must reset to the start of the window (index 1 = first event after t0), not stay at 2');

  const dt = (1000 * REPLAY_MS) / 2000; // enough to move cursor from t0=1000 to >=2000 (span=2000)
  const { fired } = advance(restarted, dt);
  assert.strictEqual(fired[0]?.t, 2000, 'the first event to actually fire after a restart is the one after t0, not events[0] itself');
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
