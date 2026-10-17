import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Radio, Play, Pause } from 'lucide-react';
import { WINDOW_OPTIONS, REPLAY_WINDOW_OPTIONS, minutesAgo as minutesAgoFrom, asofFromSlider, windowLabel, scrubSpanHours } from '../lib/timeBar';

export interface TimeBarProps {
  windowHours: number;
  onWindowChange: (hours: number) => void;
  /** ISO moment being viewed, or null for live. */
  asof: string | null;
  onAsofChange: (iso: string | null) => void;
  /** Oldest real message in the store (from /pair-counts). The track clamps to it, so the bar
   *  cannot imply history that does not exist nor hide history that does. */
  oldestAt?: string | null;
  /** PLAY/GROW/LIVE replay controls, second row (operator's port from /field, 2026-09-30).
   *  Optional and entirely separate from the live moment above: the replay cursor never
   *  drives `asof` (build's integration call — replaying at animation speed would hammer the
   *  counts API and make every number flicker; replay is a visual overlay on the live graph,
   *  not a second way to set which moment the counts describe). Undefined renders nothing —
   *  the row does not exist until whoever mounts <TimeBar> has a live useReplay() to hand it. */
  replay?: ReplayControlsProps;
}

/**
 * Props for the replay control cluster (PLAY/GROW/LIVE port from /field, operator 2026-09-30).
 * Deliberately primitives, not the raw useReplay() hook result: this component takes
 * ALREADY-DERIVED values (fraction, a formatted readout label) rather than importing
 * builder-2's engine itself, so it stays a pure "props in, markup out" component — testable
 * with plain objects, and with no build-order dependency on lib/replayEngine.ts existing yet.
 * Whoever wires up useReplay() computes `fraction` via the engine's own fraction(state) (never
 * re-derive it here — a second formula for the same fact is exactly the class of bug the
 * "one truth source" lesson from FIX 2 exists to prevent) and formats `readoutLabel` to match.
 */
export interface ReplayControlsProps {
  playing: boolean;
  live: boolean;
  growing: boolean;
  /** state.events.length > 0 — Play is meaningless (and disabled) with nothing loaded. */
  hasEvents: boolean;
  /** Human string when the history API is down. Non-null disables Play WITH this as the
   *  title/reason — a disabled button with no explanation is what operators hate most. */
  error: string | null;
  /** 0..1, from the engine's own fraction(state) — never recomputed here. */
  fraction: number;
  /** "live" or the cursor's formatted clock time; caller decides the format so it can match
   *  the live-moment readout above without this component knowing about toLocaleString. */
  readoutLabel: string;
  windowHours: number;
  /** Replay speed multiplier — engine-owned (replayEngine's ReplayState.speed), just handed
   *  through like fraction above: never re-derive it here. */
  speed: 1 | 4 | 16;
  onPlayPause: () => void;
  onGrow: () => void;
  onLive: () => void;
  onWindowChange: (hours: number) => void;
  /** Fraction 0..1 — the caller's hook.seek expects this shape, not a raw slider int. */
  onSeek: (fraction: number) => void;
  onSpeedChange: (speed: 1 | 4 | 16) => void;
}

const SPEEDS: Array<1 | 4 | 16> = [1, 4, 16];

/**
 * The PLAY / GROW / LIVE control cluster, ported from /field's scr-* buttons (source of truth:
 * /Users/flybyflow/second-brain-3d/public/index.html lines ~995-1109 — read-only reference,
 * never edited). Same left-to-right order, same tooltip text where /field's is quoted verbatim
 * (GROW's tooltip is the operator's own words for it).
 */
export function ReplayControls({
  playing, live, growing, hasEvents, error, fraction, readoutLabel, windowHours, speed,
  onPlayPause, onGrow, onLive, onWindowChange, onSeek, onSpeedChange, windowPicker,
}: ReplayControlsProps & { windowPicker?: React.ReactNode }) {
  const playDisabled = !hasEvents || Boolean(error);
  const playTitle = error
    ? `replay unavailable: ${error}`
    : !hasEvents
      ? 'replay unavailable: no history loaded'
      : playing ? 'pause replay' : 'play';

  return (
    <div className={clsx('flex flex-wrap items-center gap-2 py-1.5 text-xs', !windowPicker && 'border-t border-neutral-900')}>
      {windowPicker}
      <button
        type="button"
        onClick={onPlayPause}
        disabled={playDisabled}
        title={playTitle}
        aria-label={playTitle}
        className={clsx(
          'flex items-center justify-center w-7 h-7 rounded border shrink-0 transition-colors',
          playDisabled
            ? 'border-neutral-800 text-neutral-700 cursor-not-allowed'
            : playing
              ? 'border-amber-600 bg-amber-950/40 text-amber-300'
              : 'border-neutral-700 text-neutral-300 hover:border-amber-600 hover:text-amber-300',
        )}
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>

      <button
        type="button"
        onClick={onGrow}
        disabled={!hasEvents}
        title="grow the brain: start empty, reveal each node + connection as it first appears"
        aria-label="grow the brain: start empty, reveal each node + connection as it first appears"
        aria-pressed={growing}
        className={clsx(
          'px-2 py-1 rounded border shrink-0 tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
          growing
            ? 'border-amber-500 bg-amber-500 text-neutral-950'
            : 'border-neutral-700 text-neutral-300 hover:border-amber-600 hover:text-amber-300',
        )}
      >
        GROW
      </button>

      <div
        role="group"
        aria-label="replay speed"
        className="flex rounded border border-neutral-700 overflow-hidden shrink-0"
      >
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeedChange(s)}
            disabled={!hasEvents}
            aria-pressed={speed === s}
            title={`${s}x replay speed`}
            className={clsx(
              'px-1.5 py-1 tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
              speed === s
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800',
            )}
          >
            {s}x
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onLive}
        title="jump to live"
        aria-label="jump to live"
        aria-pressed={live}
        className={clsx(
          'px-2 py-1 rounded border shrink-0 tracking-wider transition-colors',
          live
            ? 'border-green-600 text-green-400'
            : 'border-neutral-700 text-neutral-400 hover:border-green-700 hover:text-green-400',
        )}
      >
        LIVE
      </button>

      <input
        type="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(fraction * 1000)}
        onChange={(e) => onSeek(Number(e.target.value) / 1000)}
        disabled={!hasEvents}
        className="flex-1 min-w-[140px] accent-amber-500 disabled:opacity-40"
        aria-label={`Replay position: ${readoutLabel}`}
      />

      <span className={clsx('shrink-0 tabular-nums min-w-[8.5rem] text-center', live ? 'text-green-400' : 'text-amber-300')}>
        {readoutLabel}
      </span>

      {!windowPicker && (
        <select
          value={windowHours}
          onChange={(e) => onWindowChange(Number(e.target.value))}
          title="replay window"
          aria-label="replay window"
          className="bg-neutral-900 border border-neutral-700 text-neutral-300 rounded px-1.5 py-1 shrink-0"
        >
          {REPLAY_WINDOW_OPTIONS.map((h) => (
            <option key={h} value={h}>{windowLabel(h)}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/**
 * Bottom time bar (spec §7): window picker, scrubber, and a Live button.
 *
 * The scrubber is a native <input type="range">. That is not laziness for its own sake — it
 * arrives with keyboard support, a visible focus ring and screen-reader semantics that a
 * custom-drawn handle would have to reimplement and would get wrong.
 *
 * PLAY/GROW/LIVE (2026-09-30, operator, ported from /field): a continuous replay animation IS
 * now built — the `replay` prop below, rendered as a second row. This supersedes the OLD note
 * that used to live here ("faking it by re-firing travelling dots for old messages would break
 * spec §2, if a dot moves a message is actually moving"). That reasoning is not wrong, it was
 * read narrowly: a REPLAYED dot for a real historical message is still a real message moving,
 * just at compressed time, exactly what /field's GROW/PLAY already do — not a fake. Recorded
 * here rather than silently deleted, on the operator's direct instruction to build this.
 *
 * Also NOT built: "time setting is shared with 3D". There is no 3D view in this codebase.
 * The setting lives in the shared store so a future 3D consumer reads the same value, but
 * nothing verifies that today.
 */
export function TimeBar({
  windowHours, onWindowChange, asof, onAsofChange, oldestAt, replay,
}: TimeBarProps) {
  const live = asof === null;
  // `now` is state on a slow tick rather than a Date.now() read during render. Two reasons,
  // and the lint rule is only the second: a render-time clock read means a scrubbed label
  // silently drifts (it only updates when something else re-renders), and eslint's
  // react-hooks/purity correctly flags it. 30s is finer than the slider's 5-minute step.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Track length comes from real data, not arithmetic — declared after `now` because it reads
  // it. See scrubSpanHours(): clamps to the oldest real message, floored at the selected
  // window, capped at the 90d server limit.
  const spanMinutes = scrubSpanHours(oldestAt, windowHours, now) * 60;

  // Inverted so the right-hand end is "now" — the direction people expect from a timeline,
  // and where the Live button sits.
  const minsAgo = minutesAgoFrom(asof, now, spanMinutes);

  const label = live
    ? 'live'
    : new Date(asof).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-1.5">
      {/* Scrubbed-state banner (plan's (a), part 3 of the operator's ask): say the moment, say
          that live is paused, and offer one click back. Rendered only when scrubbed — a banner
          that is always present is furniture, and the operator's complaint was not knowing
          whether the view was live. The Live button is duplicated here on purpose: the one in
          the row below is a control among controls, this one is the way out of a state the
          operator may not have realised they were in. */}
      {!live && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-900/60 bg-amber-950/30 px-2.5 py-1.5">
          <span className="text-amber-300">Showing {label}</span>
          <span className="text-neutral-500">· live updates paused</span>
          <button
            type="button"
            onClick={() => onAsofChange(null)}
            className="ml-auto px-2 py-0.5 rounded border border-green-800 bg-green-950/40 text-green-300 hover:bg-green-900/40"
          >
            Back to live
          </button>
        </div>
      )}
    {!replay && (
    <div className="flex flex-wrap items-center gap-3 py-2 text-xs">
      <div className="flex rounded-lg border border-neutral-700 overflow-hidden shrink-0">
        {WINDOW_OPTIONS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onWindowChange(h)}
            aria-pressed={windowHours === h}
            className={clsx(
              'px-2.5 py-1 transition-colors',
              windowHours === h
                ? 'bg-neutral-700 text-neutral-100'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800',
            )}
          >
            {windowLabel(h)}
          </button>
        ))}
      </div>

      {/* `relative` is load-bearing, not decoration. Tailwind's `sr-only` is
          `position:absolute; margin:-1px`, so with no positioned ancestor it resolves against
          the INITIAL containing block and is laid out at document level, below the app's own
          scroll container. The document then scrolled 1708px past the end of the page on the
          topology view (html.scrollHeight 2708 vs body.scrollHeight 1000) into blank space,
          because this bar renders only there. Cards and table measured 0 overscroll. */}
      <label className="relative flex items-center gap-2 flex-1 min-w-[180px]">
        <span className="sr-only">Moment shown</span>
        <input
          type="range"
          min={0}
          max={spanMinutes}
          step={5}
          value={spanMinutes - minsAgo}
          onChange={(e) => onAsofChange(asofFromSlider(Number(e.target.value), Date.now(), spanMinutes))}
          className="w-full accent-sky-500"
          aria-label={`Moment shown: ${label}`}
        />
      </label>

      <span className={clsx('shrink-0 tabular-nums', live ? 'text-green-400' : 'text-amber-300')}>
        {label}
      </span>

      <button
        type="button"
        onClick={() => onAsofChange(null)}
        disabled={live}
        className={clsx(
          'flex items-center gap-1 px-2 py-1 rounded-lg border shrink-0 transition-colors',
          live
            ? 'border-neutral-800 text-neutral-600 cursor-default'
            : 'border-green-800 bg-green-950/40 text-green-300 hover:bg-green-900/40',
        )}
      >
        <Radio size={12} />
        Live
      </button>
    </div>
    )}
    {replay && (
      // One row, one window: the as-of scrubber + Live that used to sit above this row
      // duplicated the replay scrubber and window picker, so with replay mounted the window
      // pills drive BOTH (counts window and replay window) and the second slider is gone.
      <ReplayControls
        {...replay}
        windowPicker={(
          <div className="flex rounded-lg border border-neutral-700 overflow-hidden shrink-0">
            {WINDOW_OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => { onWindowChange(h); replay.onWindowChange(h); }}
                aria-pressed={windowHours === h}
                className={clsx(
                  'px-2.5 py-1 transition-colors',
                  windowHours === h ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800',
                )}
              >
                {windowLabel(h)}
              </button>
            ))}
          </div>
        )}
      />
    )}
    </div>
  );
}
