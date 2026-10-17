/**
 * Pure helpers for the 2D view's time bar (spec §7). Separate .ts module for the usual two
 * reasons in this repo: a .test.mjs cannot import a .tsx, and eslint's
 * react-refresh/only-export-components forbids exporting non-components from one.
 */

/** Windows the LIVE COUNTS picker offers. 72h is included because the 3D surface gm saw uses
 *  72h, and two views offering different windows would be a fresh version of the same
 *  two-sources-disagreeing problem this feature exists to remove. Deliberately has NO "all":
 *  its backing server (api/src/routes/messages.ts pair-counts) caps at 2160h regardless of
 *  what the control claims, so an "all" here would silently mean 90d — the same class of lie
 *  as a window that hid history. See REPLAY_WINDOW_OPTIONS below for why replay gets a
 *  genuine "all" and this list does not. */
export const WINDOW_OPTIONS = [1, 6, 24, 72, 168, 720, 2160] as const;

/**
 * Windows the REPLAY window-select offers (PLAY/GROW/LIVE port, operator 2026-09-30) — a
 * SEPARATE list from WINDOW_OPTIONS on purpose, not a rename. build's spec asks for an "all"
 * option matching /field's own picker (/field's server caps at 8760h/365d, not 90d), backed
 * by the NEW GET /api/messages/history endpoint (builder-2). Sharing one array between the two
 * pickers would have put "all" on the LIVE counts picker too, whose own server still caps at
 * 2160h — reintroducing the exact lie the WINDOW_OPTIONS comment above exists to prevent, just
 * via a different code path. If /api/messages/history turns out to also clamp below 8760h,
 * this "all" would lie the same way; flagged to builder-2/build rather than assumed.
 */
export const ALL_HOURS = 8760;
export const REPLAY_WINDOW_OPTIONS = [1, 6, 24, 72, 168, 720, 2160, ALL_HOURS] as const;

/**
 * Human label for a window. "2160h" is not a readable number — the operator thinks in days
 * past about three of them, so anything from 48h up reads as days. Shared by both pickers:
 * ALL_HOURS only ever appears in REPLAY_WINDOW_OPTIONS, so the "all" branch is unreachable
 * from the live picker's own list.
 */
export function windowLabel(hours: number): string {
  if (hours === ALL_HOURS) return 'all';
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

/**
 * How far back the scrubber may reach: the age of the oldest real message, capped at the
 * largest window, and never less than the window currently selected.
 *
 * This is the operator's actual complaint. The span used to be a fixed 72h while the oldest
 * message on this install was 254h old, so the bar concealed 182h of real traffic and its
 * left end implied history stopped there. Clamping to real data means the control cannot
 * imply history that does not exist, and cannot hide history that does.
 *
 * `oldestAt` null (empty store, or the field absent from an older API) falls back to the
 * selected window — the honest answer when we do not know how far back anything goes.
 */
export function scrubSpanHours(
  oldestAt: string | null | undefined, windowHours: number, now = Date.now(),
): number {
  const maxOption = WINDOW_OPTIONS[WINDOW_OPTIONS.length - 1];
  if (!oldestAt) return Math.min(windowHours, maxOption);
  const t = new Date(oldestAt).getTime();
  if (!Number.isFinite(t)) return Math.min(windowHours, maxOption);
  const ageHours = Math.ceil((now - t) / 3_600_000);
  return Math.min(maxOption, Math.max(windowHours, ageHours));
}

/**
 * How many minutes back `asof` is from `now`, clamped to [0, spanMinutes].
 *
 * Clamped rather than allowed to go negative or overrun: an asof from a machine whose clock
 * is ahead would otherwise push the slider past its own maximum, and a browser left open
 * overnight would drift an old asof past the span. Both render as an out-of-range slider,
 * which reads as a broken control rather than as the edge case it is. Live (`null`) is 0 —
 * the "now" end of the track.
 */
export function minutesAgo(asof: string | null, now: number, spanMinutes: number): number {
  if (!asof) return 0;
  const then = new Date(asof).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.min(spanMinutes, Math.round((now - then) / 60_000)));
}

/** Slider position -> the asof it means. The track runs oldest-left to now-right, so the
 *  value is inverted. Landing on the right-hand end means LIVE, not "zero minutes ago" —
 *  a frozen asof equal to now would stop polling and silently go stale. */
export function asofFromSlider(sliderValue: number, now: number, spanMinutes: number): string | null {
  const back = spanMinutes - sliderValue;
  if (back <= 0) return null;
  return new Date(now - back * 60_000).toISOString();
}
