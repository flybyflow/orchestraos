// PLAY / GROW / LIVE replay state machine for the 2D Agents View (ported from
// /Users/flybyflow/second-brain-3d/public/index.html's scr* functions — read-only reference,
// not shared code). PURE: no rAF, no Date.now(), no DOM. Every function takes time as an
// argument and returns new state, so this is testable with numbers only and a fake clock.
//
// Preconditions this module trusts the caller for (not re-checked here): `events` is sorted
// ascending by `t`, and `t` is already epoch milliseconds — /field's own code re-parses
// `+new Date(e.t)` inside its rAF loop for every event every frame; the whole point of
// splitting this module out is to parse ISO -> ms exactly ONCE, at load, in the hook.

export const REPLAY_MS = 45_000; // whole window plays in ~45s at speed 1; real gaps compressed proportionally
export const SNAP_N = 22;        // how many recent events form the scrub trail

export interface ReplayEvent {
  t: number; from: string; to: string; type: string;
  subject?: string; kind?: 'spawn'; id?: string; name?: string;
}

export interface ReplayState {
  events: ReplayEvent[];
  playing: boolean;
  idx: number;
  live: boolean;
  cursor: number;
  t0: number;
  t1: number;
  speed: 1 | 4 | 16;
  growth: boolean;
}

function clamp01(f: number): number {
  return Math.min(1, Math.max(0, f));
}

// Index of the first event with t >= cursor (events.length if none) — startPlay's resume
// point. An event sitting EXACTLY on the cursor has not fired yet and must still be reachable
// going forward; the strict `>` this used to share with seek() permanently excluded whatever
// event happens to equal t0 on a from-scratch restart (cursor === t0 by construction), since
// idx only ever moves forward and nothing before it is ever re-examined. Real bug, found live:
// a from-scratch replay's first event never fired (QA, operator-reported, firstFiredId one off
// from the API's actual first row).
function firstIndexAtOrAfter(events: ReplayEvent[], cursor: number): number {
  for (let i = 0; i < events.length; i++) {
    if (events[i].t >= cursor) return i;
  }
  return events.length;
}

// Index of the first event STRICTLY AFTER `cursor` (events.length if none) — seek()'s trail
// boundary. Deliberately the OPPOSITE inclusivity from firstIndexAtOrAfter above: seek treats
// an event exactly AT the cursor as already-happened (belongs IN the trail, via hi = idx - 1),
// where startPlay treats the same case as not-yet-fired. Same underlying question ("where is
// the cursor relative to the events"), two different correct answers depending on whether the
// caller is about to move FORWARD from here (startPlay/advance) or looking BACKWARD from here
// (seek) — collapsing them into one shared helper is exactly what caused the bug above.
function firstIndexAfter(events: ReplayEvent[], cursor: number): number {
  for (let i = 0; i < events.length; i++) {
    if (events[i].t > cursor) return i;
  }
  return events.length;
}

/** t0/t1 from the event list; live at the end, nothing pending to fire (idx=events.length) —
 *  the same state setLive() would produce. An empty list is t0=t1=0, live, not playing: there
 *  is nothing to play, so playing is force-false rather than left to the caller to notice. */
export function initReplay(events: ReplayEvent[]): ReplayState {
  if (events.length === 0) {
    return { events, playing: false, idx: 0, live: true, cursor: 0, t0: 0, t1: 0, speed: 1, growth: false };
  }
  const t0 = events[0].t;
  const t1 = events[events.length - 1].t;
  return { events, playing: false, idx: events.length, live: true, cursor: t1, t0, t1, speed: 1, growth: false };
}

// The `|| 1` matters: a single-event (or zero-span) window would otherwise divide by zero in
// fraction()/startPlay()/advance() and NaN the cursor.
export function span(s: ReplayState): number {
  return s.t1 - s.t0 || 1;
}

export function fraction(s: ReplayState): number {
  return clamp01((s.cursor - s.t0) / span(s));
}

/** /field's restart rule: parked at (or past) the very end counts as "done", so pressing play
 *  again starts over from 0 rather than doing nothing. */
export function startPlay(s: ReplayState, fromFraction: number): ReplayState {
  const f = fromFraction >= 0.999 ? 0 : fromFraction;
  const cursor = s.t0 + span(s) * f;
  const idx = firstIndexAtOrAfter(s.events, cursor);
  return { ...s, cursor, idx, playing: true, live: false };
}

/** Advances the cursor by `dtMs` of WALL time, scaled into the replay's compressed timeline
 *  (REPLAY_MS for the whole window) and by the speed multiplier. Fires every event the cursor
 *  just passed, in order, exactly once — idx only ever moves forward, so a event already fired
 *  cannot fire again on a later call. `ended` is a report, not an action: the caller (the hook)
 *  decides whether to call setLive() when it sees ended=true. */
export function advance(s: ReplayState, dtMs: number): { state: ReplayState; fired: ReplayEvent[]; ended: boolean } {
  // dt=0 is a real call shape (a caller's first rAF frame after computing its own `last`
  // timestamp, or an explicit no-op tick) and must not allocate a new state object — a
  // reference-equality re-render guard depends on this returning the SAME object, not a
  // structurally-identical copy.
  if (dtMs === 0) return { state: s, fired: [], ended: s.idx >= s.events.length };
  const cursor = s.cursor + (dtMs / REPLAY_MS) * span(s) * s.speed;
  const fired: ReplayEvent[] = [];
  let idx = s.idx;
  while (idx < s.events.length && s.events[idx].t <= cursor) {
    fired.push(s.events[idx]);
    idx++;
  }
  return { state: { ...s, cursor, idx }, fired, ended: idx >= s.events.length };
}

/** Traffic is bursty (hour-long gaps are normal), so the trail is ranked by COUNT of recent
 *  events, not by a clock window — a clock window would be empty most of the time. Do not
 *  "improve" this into a time-based window; that was tried in /field and reverted for exactly
 *  this reason (see /field's own comment above applySnapshotAt). */
export function seek(s: ReplayState, f: number): { state: ReplayState; trail: Array<{ event: ReplayEvent; weight: number }> } {
  const clamped = clamp01(f);
  const cursor = s.t0 + span(s) * clamped;
  const idx = firstIndexAfter(s.events, cursor);
  const hi = idx - 1; // last index at/before cursor
  const trail: Array<{ event: ReplayEvent; weight: number }> = [];
  for (let k = 0; k < SNAP_N && hi - k >= 0; k++) {
    trail.push({ event: s.events[hi - k], weight: 1 - (k / SNAP_N) * 0.82 });
  }
  return { state: { ...s, cursor, idx, playing: false, live: false }, trail };
}

export function pause(s: ReplayState): ReplayState {
  return { ...s, playing: false };
}

/** Jumping to live also ends growth (/field: "jumping to live ends growth -> everything
 *  present") and parks the cursor at t1 with idx at the end, matching what initReplay() already
 *  produces for a fresh load — live is always "caught up", never mid-replay. */
export function setLive(s: ReplayState): ReplayState {
  return { ...s, live: true, playing: false, growth: false, cursor: s.t1, idx: s.events.length };
}

export function setSpeed(s: ReplayState, speed: 1 | 4 | 16): ReplayState {
  return { ...s, speed };
}

export function setGrowth(s: ReplayState, growth: boolean): ReplayState {
  return { ...s, growth };
}
