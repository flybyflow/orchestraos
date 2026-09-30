/**
 * Pure lifecycle helpers for travelling replay pulses (PLAY/GROW/LIVE port from /field,
 * operator 2026-09-30). Kept out of the .tsx for the usual two reasons in this repo: a
 * .test.mjs cannot import a .tsx, and eslint's react-refresh/only-export-components forbids
 * exporting non-components from one.
 *
 * A pulse is a coloured shape riding an edge for a fixed lifetime after its message event
 * fires during replay — reference: /field's activePulses array (index.html ~line 756), each
 * entry {head,glow,embers,label,a,b,t,dur,...} advanced every animation frame and removed once
 * `t` passes `dur`. This is the same shape, minus the 3D mesh/sprite bookkeeping.
 */

/** Ported directly: /field's pulseLink() sets dur = 2400 + random ms. Fixed here (no
 *  randomness — determinism matters more than a little visual variety for something this
 *  short-lived), and shorter: 2D pulses travel a much shorter visual distance on average than
 *  the 3D force-graph's, so the same real-world duration would look sluggish. */
export const PULSE_LIFETIME_MS = 1200;

export interface ReplayPulse {
  /** Unique PER PULSE, not per pair — several pulses can be in flight on the same edge at
   *  once (build's own instruction: keying by pairKey would collapse them into one). */
  id: string;
  a: string;
  b: string;
  type: string | null;
  /** epoch ms when this pulse was created. */
  startedAt: number;
}

/** Deterministic per-event id: `${from}>${to}@${t}` is unique as long as one edge does not
 *  fire two events at the exact same millisecond timestamp — true for real message data,
 *  where two rows always differ by id even at equal t, so the id is threaded in too. */
export function pulseId(event: { from?: string; to?: string; id?: string; t: number }): string {
  return `${event.from ?? '?'}>${event.to ?? '?'}@${event.t}:${event.id ?? ''}`;
}

/** 0 at creation, 1 at end-of-life, clamped — never negative (a `now` before `startedAt`,
 *  e.g. a fake clock in a test, must not produce a pulse riding backward off the chord). */
export function pulseProgress(pulse: ReplayPulse, now: number): number {
  const elapsed = now - pulse.startedAt;
  return Math.max(0, Math.min(1, elapsed / PULSE_LIFETIME_MS));
}

/** A pulse is alive strictly before its lifetime ends — the frame that reaches t=1 is its
 *  last rendered frame, not an extra render past the far box. */
export function isPulseAlive(pulse: ReplayPulse, now: number): boolean {
  return now - pulse.startedAt < PULSE_LIFETIME_MS;
}

/** Keep only the still-alive pulses — the one-line filter every removal tick applies, pulled
 *  out so it has the same "re-derive independently" testability as the rest of this module. */
export function pruneDeadPulses(pulses: ReplayPulse[], now: number): ReplayPulse[] {
  return pulses.filter((p) => isPulseAlive(p, now));
}
