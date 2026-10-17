// Thin React wrapper around replayEngine.ts's pure state machine. This file owns the only
// impure parts of PLAY/GROW/LIVE: requestAnimationFrame, the wall clock, and the fetch. Every
// decision about WHAT happens (firing order, restart rule, the trail formula) lives in the
// engine; this hook only decides WHEN to call it.
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  initReplay, startPlay, advance, seek as seekEngine, pause as pauseEngine,
  setLive as setLiveEngine, setSpeed as setSpeedEngine, setGrowth as setGrowthEngine,
  fraction, type ReplayEvent, type ReplayState,
} from './replayEngine';

interface HistoryApiEvent {
  t: string; from: string; to: string; type: string;
  subject?: string; kind?: 'spawn'; id?: string; name?: string;
}

async function fetchHistory(hours: number): Promise<HistoryApiEvent[]> {
  const res = await fetch(`/api/messages/history?hours=${hours}`);
  if (!res.ok) throw new Error(`/api/messages/history?hours=${hours}: ${res.status}`);
  const data: { events: HistoryApiEvent[] } = await res.json();
  return data.events;
}

// Parse ISO -> ms exactly ONCE, here, at load — not per frame (the one thing in /field's
// original this port deliberately does not copy; see replayEngine.ts's own top comment).
function toReplayEvents(raw: HistoryApiEvent[]): ReplayEvent[] {
  return raw.map((e) => ({
    t: Date.parse(e.t), from: e.from, to: e.to, type: e.type,
    subject: e.subject, kind: e.kind, id: e.id, name: e.name,
  }));
}

// Stable empty arrays. `fired` and `trail` are effect DEPENDENCIES downstream (the GROW fold
// in Agents.tsx folds `fired` into the born sets), and a fresh [] on every quiet frame makes
// that effect re-run ~60 times a second to do nothing. Most frames of a 45s replay are quiet.
const NO_EVENTS: ReplayEvent[] = [];
const NO_TRAIL: Array<{ event: ReplayEvent; weight: number }> = [];

export interface UseReplayResult {
  state: ReplayState;
  /** The window currently loaded. The replay window-select needs to render its own current
   *  value, and the alternative — a second copy in the caller — is two sources of truth for
   *  one fact, which is how a select ends up showing 6h while the data is 24h. */
  windowHours: number;
  /** Events that fired on the LAST advance() only — not accumulated. Feed each into a pulse. */
  fired: ReplayEvent[];
  trail: Array<{ event: ReplayEvent; weight: number }>;
  play: () => void;
  pause: () => void;
  seek: (f: number) => void;
  setLive: () => void;
  /** Toggles growth mode only — does NOT itself reload/hide/restart playback. /field's single
   *  GROW button does all four as one action; this hook keeps them composable instead (the UI
   *  calls setGrowth(true) + seek(0) + play(), in that order, to reproduce the same behaviour)
   *  because build's brief specified this exact, smaller method surface. Flagged in the report
   *  — say if you want a combined enterGrow()/exitGrow() instead, it is a small addition. */
  setGrowth: (growth: boolean) => void;
  setSpeed: (speed: 1 | 4 | 16) => void;
  /** Reloads history for a new window. If the replay was PLAYING, it restarts from the
   *  beginning of the new window and keeps playing; if it was not, it lands live. gm's
   *  ruling on test's finding (2026-09-30): changing the window mid-replay is someone asking
   *  to see a different slice of history, not asking to jump to now, and silently snapping
   *  to live is the more surprising of the two. Clicking LIVE is unchanged — that is a
   *  distinct and obvious action. Either way the old cursor/idx are discarded, since they
   *  are meaningless against a different event list. */
  setWindow: (hours: number) => void;
  loading: boolean;
  /** Human string on fetch failure, or null. Operator's spec: Play must never trigger while
   *  this is set — enforced both here (play() no-ops) and by exposing it for the UI to disable
   *  the button and show the reason. */
  error: string | null;
}

// `state` and `fired` change together on every rAF tick (advance() always produces both in one
// call), so they live in ONE useState instead of two. Two independent setState calls in the
// same rAF callback already coalesce into a single render under React 19's automatic batching,
// but a single state slot makes that a structural fact (one object, one update) rather than an
// optimization the scheduler happens to apply — and it is literally what "one state update per
// animation frame" (operator's replay-lag ask, 2026-09-30) means at the code level.
interface ReplayFrame {
  state: ReplayState;
  fired: ReplayEvent[];
}

export function useReplay(initialWindowHours = 24): UseReplayResult {
  const [windowHours, setWindowHoursState] = useState(initialWindowHours);
  const [frame, setFrame] = useState<ReplayFrame>(() => ({ state: initReplay([]), fired: NO_EVENTS }));
  const [trail, setTrail] = useState(NO_TRAIL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const state = frame.state;
  const fired = frame.fired;

  // The rAF loop runs outside React's render cycle and needs the LATEST state synchronously on
  // every frame, not whatever was captured in a stale closure from when play() was called.
  const stateRef = useRef(state);
  stateRef.current = state;
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  // Was the replay playing when the window last changed? gm's ruling (2026-09-30, on test's
  // finding): someone who changes the window mid-replay is trying to see a different slice
  // of history, not asking to jump to now, so the new window restarts and keeps playing.
  // A ref, not state: it is read inside an async fetch continuation that must see the value
  // as of the user's click, not as of whatever render happens to be current when it lands.
  const resumeAfterLoadRef = useRef(false);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const loop = useCallback((now: number) => {
    // Bail if the state says we are not playing. stopLoop() cancels the frame but does NOT
    // touch `playing`, and loadHistory() replaces the whole state with a not-playing one --
    // so a stop that races a play can leave playing:true with no frame scheduled, or a
    // scheduled frame advancing a state nobody asked to advance. Observed on the page:
    // a fresh load, an immediate window change and an immediate Play left the button reading
    // "pause replay" with the slider frozen at 34 and nothing moving. Checking the state
    // rather than a second boolean means there is one answer to "are we playing", not two
    // that can disagree.
    if (!stateRef.current.playing) { rafRef.current = null; return; }
    const dt = now - lastRef.current;
    lastRef.current = now;
    const { state: next, fired: justFired, ended } = advance(stateRef.current, dt);
    if (ended) {
      // advance() already correctly returns whatever fired on THIS frame even when it is also
      // the frame that ends the replay -- publish it before going live, not instead of it.
      // QA (operator-reported, live): 24h lost 3 of 1165 events, "all" lost 47, always at the
      // tail -- the final frame's batch was computed and then discarded here unconditionally.
      // Batch size varies with tail density, so the loss count was never a fixed number; that
      // is also why the regression test below pins a real fixture rather than a literal count.
      const live = setLiveEngine(next);
      stateRef.current = live;
      setFrame({ state: live, fired: justFired.length ? justFired : NO_EVENTS });
      stopLoop();
      return;
    }
    stateRef.current = next;
    setFrame({ state: next, fired: justFired.length ? justFired : NO_EVENTS });
    rafRef.current = requestAnimationFrame(loop);
  }, [stopLoop]);

  const loadHistory = useCallback(async (hours: number) => {
    setLoading(true);
    setError(null);
    try {
      const events = toReplayEvents(await fetchHistory(hours));
      const loaded = initReplay(events);
      // Resume ONLY on the success path, and only with something to play. Resuming after a
      // failed fetch would auto-play into an error state and walk straight past the guard in
      // play() that exists to stop precisely that.
      const next = resumeAfterLoadRef.current && events.length > 0
        ? startPlay(loaded, 0)   // the new window from its own beginning, not the old cursor
        : loaded;
      stateRef.current = next;
      setFrame({ state: next, fired: NO_EVENTS });
      if (next.playing) {
        lastRef.current = performance.now();
        stopLoop();                                  // never two loops
        rafRef.current = requestAnimationFrame(loop);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to load replay history');
      resumeAfterLoadRef.current = false;
      const empty = initReplay([]);
      stateRef.current = empty;
      setFrame({ state: empty, fired: NO_EVENTS });
    } finally {
      setTrail(NO_TRAIL);
      setLoading(false);
    }
  }, [loop, stopLoop]);

  useEffect(() => {
    stopLoop();
    // Pause the STATE as well as the loop. Cancelling the frame without clearing `playing`
    // is the other half of the same inconsistency the loop guard covers: if this effect runs
    // after a play() has already scheduled a frame, the button reads "pause replay" forever
    // with nothing advancing. The new window's events land as a not-playing state anyway, so
    // this only closes the gap between the two.
    setFrame((f) => (f.state.playing ? { ...f, state: pauseEngine(f.state) } : f));
    loadHistory(windowHours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowHours]);

  useEffect(() => () => stopLoop(), [stopLoop]);


  const play = useCallback(() => {
    if (error || stateRef.current.events.length === 0) return; // API down, or nothing to play
    const next = startPlay(stateRef.current, fraction(stateRef.current));
    stateRef.current = next;
    setFrame({ state: next, fired: NO_EVENTS });
    lastRef.current = performance.now();
    stopLoop();
    rafRef.current = requestAnimationFrame(loop);
  }, [error, loop, stopLoop]);

  const pause = useCallback(() => {
    // An explicit stop must not be undone by a window load still in flight.
    resumeAfterLoadRef.current = false;
    stopLoop();
    const next = pauseEngine(stateRef.current);
    stateRef.current = next;
    setFrame((f) => ({ ...f, state: next }));
  }, [stopLoop]);

  const seek = useCallback((f: number) => {
    stopLoop();
    const { state: next, trail: nextTrail } = seekEngine(stateRef.current, f);
    stateRef.current = next;
    setFrame({ state: next, fired: NO_EVENTS });
    setTrail(nextTrail);
  }, [stopLoop]);

  const setLive = useCallback(() => {
    resumeAfterLoadRef.current = false;   // same reason as pause()
    stopLoop();
    const next = setLiveEngine(stateRef.current);
    stateRef.current = next;
    setFrame({ state: next, fired: NO_EVENTS });
    setTrail(NO_TRAIL);
  }, [stopLoop]);

  const setGrowth = useCallback((growth: boolean) => {
    const next = setGrowthEngine(stateRef.current, growth);
    stateRef.current = next;
    setFrame((f) => ({ ...f, state: next }));
  }, []);

  const setSpeed = useCallback((speed: 1 | 4 | 16) => {
    const next = setSpeedEngine(stateRef.current, speed);
    stateRef.current = next;
    setFrame((f) => ({ ...f, state: next }));
  }, []);

  const setWindow = useCallback((hours: number) => {
    // Recorded here, at the user's click, rather than inside the effect: by the time the
    // effect runs the state has already been paused for the load, so `playing` would always
    // read false and the replay would never resume.
    resumeAfterLoadRef.current = stateRef.current.playing;
    stopLoop();
    setWindowHoursState(hours);
  }, [stopLoop]);

  return { state, windowHours, fired, trail, play, pause, seek, setLive, setGrowth, setSpeed, setWindow, loading, error };
}
