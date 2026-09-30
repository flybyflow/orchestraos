import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Radio } from 'lucide-react';
import { WINDOW_OPTIONS, minutesAgo as minutesAgoFrom, asofFromSlider, windowLabel, scrubSpanHours } from '../lib/timeBar';

export interface TimeBarProps {
  windowHours: number;
  onWindowChange: (hours: number) => void;
  /** ISO moment being viewed, or null for live. */
  asof: string | null;
  onAsofChange: (iso: string | null) => void;
  /** Oldest real message in the store (from /pair-counts). The track clamps to it, so the bar
   *  cannot imply history that does not exist nor hide history that does. */
  oldestAt?: string | null;
}

/**
 * Bottom time bar (spec §7): window picker, scrubber, and a Live button.
 *
 * The scrubber is a native <input type="range">. That is not laziness for its own sake — it
 * arrives with keyboard support, a visible focus ring and screen-reader semantics that a
 * custom-drawn handle would have to reimplement and would get wrong.
 *
 * NOT built, and deliberately so: §7's "scrubbing replays traffic on the lines". This sets
 * the MOMENT and every count, thickness and header re-reads at that moment — which is the
 * part that makes the control truthful. A continuous replay animation is a separate feature,
 * and faking it by re-firing travelling dots for old messages would break the one rule §2
 * states outright: if a dot moves, a message is actually moving.
 *
 * Also NOT built: "time setting is shared with 3D". There is no 3D view in this codebase.
 * The setting lives in the shared store so a future 3D consumer reads the same value, but
 * nothing verifies that today.
 */
export function TimeBar({
  windowHours, onWindowChange, asof, onAsofChange, oldestAt,
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

      <label className="flex items-center gap-2 flex-1 min-w-[180px]">
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
    </div>
  );
}
