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

export interface UseReplayResult {
  state: ReplayState;
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
  /** Reloads history for a new window. Always lands live (matches /field: changing the window
   *  reloads and — unless already live — snaps back to live, since a stale cursor/idx from the
   *  OLD event list would be meaningless against the new one). */
  setWindow: (hours: number) => void;
  loading: boolean;
  /** Human string on fetch failure, or null. Operator's spec: Play must never trigger while
   *  this is set — enforced both here (play() no-ops) and by exposing it for the UI to disable
   *  the button and show the reason. */
  error: string | null;
}

export function useReplay(initialWindowHours = 24): UseReplayResult {
  const [windowHours, setWindowHoursState] = useState(initialWindowHours);
  const [state, setState] = useState<ReplayState>(() => initReplay([]));
  const [fired, setFired] = useState<ReplayEvent[]>([]);
  const [trail, setTrail] = useState<Array<{ event: ReplayEvent; weight: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The rAF loop runs outside React's render cycle and needs the LATEST state synchronously on
  // every frame, not whatever was captured in a stale closure from when play() was called.
  const stateRef = useRef(state);
  stateRef.current = state;
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const loadHistory = useCallback(async (hours: number) => {
    setLoading(true);
    setError(null);
    try {
      const events = toReplayEvents(await fetchHistory(hours));
      const next = initReplay(events);
      stateRef.current = next;
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to load replay history');
      const empty = initReplay([]);
      stateRef.current = empty;
      setState(empty);
    } finally {
      setFired([]);
      setTrail([]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    stopLoop();
    loadHistory(windowHours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowHours]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  const loop = useCallback((now: number) => {
    const dt = now - lastRef.current;
    lastRef.current = now;
    const { state: next, fired: justFired, ended } = advance(stateRef.current, dt);
    if (ended) {
      const live = setLiveEngine(next);
      stateRef.current = live;
      setState(live);
      setFired([]);
      stopLoop();
      return;
    }
    stateRef.current = next;
    setState(next);
    setFired(justFired);
    rafRef.current = requestAnimationFrame(loop);
  }, [stopLoop]);

  const play = useCallback(() => {
    if (error || stateRef.current.events.length === 0) return; // API down, or nothing to play
    const next = startPlay(stateRef.current, fraction(stateRef.current));
    stateRef.current = next;
    setState(next);
    setFired([]);
    lastRef.current = performance.now();
    stopLoop();
    rafRef.current = requestAnimationFrame(loop);
  }, [error, loop, stopLoop]);

  const pause = useCallback(() => {
    stopLoop();
    const next = pauseEngine(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, [stopLoop]);

  const seek = useCallback((f: number) => {
    stopLoop();
    const { state: next, trail: nextTrail } = seekEngine(stateRef.current, f);
    stateRef.current = next;
    setState(next);
    setTrail(nextTrail);
    setFired([]);
  }, [stopLoop]);

  const setLive = useCallback(() => {
    stopLoop();
    const next = setLiveEngine(stateRef.current);
    stateRef.current = next;
    setState(next);
    setFired([]);
    setTrail([]);
  }, [stopLoop]);

  const setGrowth = useCallback((growth: boolean) => {
    const next = setGrowthEngine(stateRef.current, growth);
    stateRef.current = next;
    setState(next);
  }, []);

  const setSpeed = useCallback((speed: 1 | 4 | 16) => {
    const next = setSpeedEngine(stateRef.current, speed);
    stateRef.current = next;
    setState(next);
  }, []);

  const setWindow = useCallback((hours: number) => {
    stopLoop();
    setWindowHoursState(hours);
  }, [stopLoop]);

  return { state, fired, trail, play, pause, seek, setLive, setGrowth, setSpeed, setWindow, loading, error };
}
