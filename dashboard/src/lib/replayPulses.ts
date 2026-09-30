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
import { pointAtFraction, type EdgeRoute, type Point } from './edgeRouting.ts';

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

/**
 * Deterministic per-event id, collision-proof even when `event.id` is absent.
 *
 * WAS wrong: the original form (`${from}>${to}@${t}:${id ?? ''}`) assumed two rows on the same
 * pair always differ by id even at equal t. GET /api/messages/history does not return an id at
 * all ({t, from, to, type, subject} only, confirmed live) — the id half degenerates to a
 * trailing empty string, and telegram<->gm (the busiest pair) produced two events in the same
 * millisecond with the SAME resulting key. React's response to a duplicate key is to drop or
 * duplicate a child silently, no error — the pulse just does not appear, which on a replay
 * reads as "that message had no traffic" (build, live QA, 2026-09-30 — traced, not guessed;
 * the exact failure shape as PR 137's FIX 3).
 *
 * `index` is the position the event arrived at WITHIN ITS OWN FIRED BATCH (the caller's
 * `.map((e, i) => pulseId(e, i))`) — a plain array index, always present and always distinct
 * for two entries in the same batch, so uniqueness no longer depends on the API ever returning
 * an id. Do not rely on the id alone even once the API adds one (asked of builder-2
 * separately): an id present today and silently dropped by some future refactor must not
 * reopen this bug with no error on the frames where two events happen not to share a
 * millisecond — the index makes that scenario structurally impossible, not just unlikely.
 */
export function pulseId(event: { from?: string; to?: string; id?: string; t: number }, index: number): string {
  return `${event.from ?? '?'}>${event.to ?? '?'}@${event.t}:${event.id ?? ''}#${index}`;
}

/** 0 at creation, 1 at end-of-life, clamped — never negative (a `now` before `startedAt`,
 *  e.g. a fake clock in a test, must not produce a pulse riding backward off the chord). */
export function pulseProgress(pulse: Pick<ReplayPulse, 'startedAt'>, now: number): number {
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

/**
 * Where a pulse sits along its pair's route, at `now` — WITHOUT ever computing its own route.
 * `route` is the SAME EdgeRoute object the static edge line for this pair already built this
 * frame; this function only samples it, at `t` for a pulse riding forward or `1 - t` for one
 * riding the reverse direction relative to however the edge was drawn.
 *
 * THE BUG THIS REPLACES (build, live QA 2026-09-30): the overlay used to call
 * `routeEdge(from, to, obstacles)` a SECOND time per pulse, using the pulse's own (a, b) —
 * which for a reverse-direction message is the drawn edge's (b, a). routeEdge is NOT symmetric
 * under swapping its two arguments (the perpendicular control-point offset flips sign), so that
 * second call produced a curve bulging the OPPOSITE side from the line actually drawn — a
 * reverse pulse riding its own, different curve, 10-62px off the one on screen (239 of 301
 * reverse pulses measured live; 0 of 297 forward pulses, because forward pulses happened to
 * match the canonical (a, b) order the edge itself used). There is exactly ONE route per pair,
 * computed once; a pulse only ever picks WHERE on it to sit.
 */
export function pulsePositionOnRoute(
  pulse: Pick<ReplayPulse, 'a' | 'startedAt'>,
  canonicalA: string,
  route: EdgeRoute,
  now: number,
): Point {
  const t = pulseProgress(pulse, now);
  const reversed = pulse.a !== canonicalA;
  return pointAtFraction(route, reversed ? 1 - t : t);
}
