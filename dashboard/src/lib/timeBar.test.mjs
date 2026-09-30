/**
 * 2D Agents View step 9 — time-bar maths.
 *   node --experimental-strip-types dashboard/src/lib/timeBar.test.mjs
 *
 * The assertions that matter are the clamps and the live sentinel. An unclamped value puts
 * the slider outside its own range (reads as a broken control), and a "0 minutes ago" asof
 * instead of null would freeze polling on a moment that is instantly stale.
 */
import assert from 'node:assert';
import { minutesAgo, asofFromSlider, WINDOW_OPTIONS } from './timeBar.ts';

const NOW = Date.parse('2026-09-30T12:00:00Z');
const SPAN = 72 * 60;

// Live is the now-end of the track.
assert.equal(minutesAgo(null, NOW, SPAN), 0);
assert.equal(minutesAgo('nonsense', NOW, SPAN), 0);

assert.equal(minutesAgo('2026-09-30T11:30:00Z', NOW, SPAN), 30);
assert.equal(minutesAgo('2026-09-29T12:00:00Z', NOW, SPAN), 24 * 60);

// Clamped at the far end: a browser left open for a week must not overrun the track.
assert.equal(minutesAgo('2026-09-01T12:00:00Z', NOW, SPAN), SPAN);
// Clamped at the near end: a future asof (clock skew between machines is normal here)
// must not go negative.
assert.equal(minutesAgo('2026-09-30T13:00:00Z', NOW, SPAN), 0);

// Slider -> asof. Right-hand end is LIVE (null), not a frozen "now".
assert.equal(asofFromSlider(SPAN, NOW, SPAN), null);
assert.equal(asofFromSlider(SPAN + 5, NOW, SPAN), null, 'overshoot still means live');
assert.equal(asofFromSlider(SPAN - 60, NOW, SPAN), new Date(NOW - 60 * 60_000).toISOString());
assert.equal(asofFromSlider(0, NOW, SPAN), new Date(NOW - SPAN * 60_000).toISOString());

// Round trip: a position turns into an asof that maps back to the same position.
for (const v of [0, 100, SPAN - 5, SPAN]) {
  const iso = asofFromSlider(v, NOW, SPAN);
  assert.equal(SPAN - minutesAgo(iso, NOW, SPAN), v === SPAN ? SPAN : v, `round trip failed at ${v}`);
}

// v2 (a): extended for the operator's 7d/30d/90d ask. This assertion is the contract — it
// caught the change when I extended the options, which is what it is for.
assert.deepEqual([...WINDOW_OPTIONS], [1, 6, 24, 72, 168, 720, 2160]);

console.log('timeBar: all assertions passed');

// ── v2 (a): window options, labels, and the scrubber clamp ───────────────────────────────
import { windowLabel, scrubSpanHours, REPLAY_WINDOW_OPTIONS, ALL_HOURS } from './timeBar.ts';

// (the option set itself is asserted once, above — 2160h is the server cap, so 90d is the
// largest by design rather than an unbounded "all")

// Labels: hours below 48, days above. "2160h" is unreadable.
assert.equal(windowLabel(1), '1h');
assert.equal(windowLabel(24), '24h');
assert.equal(windowLabel(47), '47h');
assert.equal(windowLabel(72), '3d');
assert.equal(windowLabel(168), '7d');
assert.equal(windowLabel(720), '30d');
assert.equal(windowLabel(2160), '90d');

// ── PLAY/GROW/LIVE port (operator, 2026-09-30): a SEPARATE replay window list ──────────────
// Deliberately NOT the same array as WINDOW_OPTIONS — see the comment on REPLAY_WINDOW_OPTIONS
// for why: the live picker's own server caps at 2160h regardless of what the control claims,
// so "all" only belongs on the list whose backing endpoint (the new /messages/history) the
// operator's spec actually wants it on.
assert.deepEqual([...REPLAY_WINDOW_OPTIONS], [1, 6, 24, 72, 168, 720, 2160, 8760]);
assert.equal(ALL_HOURS, 8760);
assert.equal(windowLabel(ALL_HOURS), 'all');
// The live picker's own list must NOT have picked up "all" as a side effect of adding it
// elsewhere — this is the regression the two-array split exists to prevent.
assert.ok(!WINDOW_OPTIONS.includes(ALL_HOURS), 'ALL_HOURS must never leak into the live counts picker');

// THE CLAMP — the operator's complaint. Measured on the real install: oldest message 254h old
// while the largest option was 72h, so the bar hid 182h. The span must reach real history.
const NOW2 = Date.parse('2026-09-30T08:00:00Z');
const oldest254 = new Date(NOW2 - 254 * 3600_000).toISOString();
assert.equal(scrubSpanHours(oldest254, 24, NOW2), 254,
  'span must reach the oldest real message even when a small window is selected');
assert.equal(scrubSpanHours(oldest254, 720, NOW2), 720,
  'but never less than the selected window — a 30d window needs 30d of track');

// Capped at the largest option, because the server refuses to answer beyond it.
const oldestAncient = new Date(NOW2 - 5000 * 3600_000).toISOString();
assert.equal(scrubSpanHours(oldestAncient, 24, NOW2), 2160, 'capped at the 90d server cap');

// Unknown history is NOT treated as "no history": fall back to the window, do not claim 0.
assert.equal(scrubSpanHours(null, 72, NOW2), 72, 'null oldest -> the selected window');
assert.equal(scrubSpanHours(undefined, 168, NOW2), 168, 'absent field (older API) -> window');
assert.equal(scrubSpanHours('not-a-date', 24, NOW2), 24, 'unparseable -> window, never 0');

// A store whose only message is seconds old still gives a usable track.
assert.equal(scrubSpanHours(new Date(NOW2 - 30_000).toISOString(), 6, NOW2), 6);

console.log('timeBar v2: window options, labels and clamp all pass');
