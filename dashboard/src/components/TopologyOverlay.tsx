/**
 * Cross-edge SVG overlay for the topology (design §2).
 *
 * The flex tree keeps drawing hierarchy nodes and hierarchy edges exactly as
 * before; this adds a layer on top for the edges the tree CANNOT express —
 * any pair with traffic that is not a parent/child link, plus the external
 * endpoints (telegram, operator, …) that have traffic and no node at all.
 *
 * Everything decidable without a browser lives in lib/overlayGeometry.ts,
 * lib/edgeRouting.ts and lib/rimNodes.ts, all unit-tested. What is left here
 * is only what genuinely needs the DOM: refs, getBoundingClientRect,
 * ResizeObserver, rAF batching and the scroll listener.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { routeEdge, pointAtFraction, type Box } from '../lib/edgeRouting';
import { toLocalBox, samePositions, type RectLike } from '../lib/overlayGeometry';
import { pairKey } from '../lib/topologyLines';
import { pulseId, pulseProgress, pruneDeadPulses, type ReplayPulse } from '../lib/replayPulses';

export interface OverlayEdge {
  a: string;
  b: string;
  count: number;
  /** Dominant message type, for colour. */
  type?: string | null;
  /** Per-type breakdown from the API's by_type, for the tooltip. */
  byType?: Record<string, number>;
  /** 'live' | 'quiet' | 'dead' — quiet and dead must not look the same. */
  liveness?: 'live' | 'quiet' | 'dead';
  /** Majority direction, for the arrow. null when evenly split. */
  direction?: 'ab' | 'ba' | null;
  /** Escalations carried on this pair in the window. Non-zero recolours the edge. */
  escalate?: number;
  widthPx: number;
  dimmed?: boolean;
}

/**
 * Track every registered node's box in overlay-local coordinates.
 *
 * Invalidation is the part the design's independent review corrected, and all
 * four triggers below are load-bearing:
 *  - a ResizeObserver on EVERY node, not just the container: a node's own box
 *    changes when its task text or status updates, which moves no container
 *    and changes no node-id set.
 *  - rAF batching, so a burst of simultaneous node resizes recomputes once.
 *  - a scroll listener: the container is overflow-x-auto, and without this
 *    every edge silently drifts the moment anyone scrolls. A drifted endpoint
 *    is worse than a missing one — it still looks connected, just to the
 *    wrong node.
 *  - window resize, for the reflow the container observer can miss.
 */
export function useNodePositions(containerRef: React.RefObject<HTMLElement | null>) {
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [positions, setPositions] = useState<Map<string, Box>>(new Map());
  // The overlay's own size, measured from the container's CLIENT box.
  //
  // It used to come from scrollWidth, which INCLUDES the overlay itself — so the svg
  // could only ever grow. Opening the conversation panel dropped clientWidth to 674
  // while scrollWidth and the svg stayed 1070, producing a phantom horizontal
  // scrollbar; shrinking the window ratcheted the same way. A measurement that feeds
  // the thing it measures is not a measurement.
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const frame = useRef<number | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect: RectLike = container.getBoundingClientRect();
    const next = new Map<string, Box>();
    for (const [id, el] of nodeRefs.current) {
      // A ref can outlive its node for one frame (filter toggled, data changed).
      // Skipping is correct; throwing would lose the positions of every node
      // that IS still mounted.
      if (!el.isConnected) continue;
      next.set(id, toLocalBox(id, el.getBoundingClientRect(), cRect, container.scrollLeft, container.scrollTop));
    }
    // Commit ONLY when something moved. The layout effect below deliberately has
    // no dependency array, so this runs after every render; setting a freshly
    // built Map unconditionally re-renders forever, React bails with "too many
    // re-renders", and the page goes blank. That is not hypothetical — it is
    // what this component shipped as, and what review's control caught.
    setPositions((prev) => (samePositions(prev, next) ? prev : next));
    // clientWidth/Height: the content box the container actually offers, excluding
    // anything absolutely positioned inside it. Rounded and compared before committing,
    // for the same reason positions are — an unconditional set here would restart the
    // render loop through a second door.
    const w = Math.round(container.clientWidth);
    const h = Math.round(container.clientHeight);
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, [containerRef]);

  const schedule = useCallback(() => {
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      measure();
    });
  }, [measure]);

  /**
   * Registers a node. Passed straight to a `ref` prop.
   *
   * The per-id callback is CACHED. React compares ref callbacks by identity and
   * detaches/reattaches on every change — a fresh closure per render would
   * unregister and re-register every node on every render, scheduling another
   * measure each time. Same loop as above, reached by a different door.
   */
  const refCache = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const register = useCallback((id: string) => {
    let cb = refCache.current.get(id);
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        if (el) nodeRefs.current.set(id, el);
        else nodeRefs.current.delete(id);
        schedule();
      };
      refCache.current.set(id, cb);
    }
    return cb;
  }, [schedule]);

  // Layout effect, not effect: measuring after paint shows one frame of edges
  // drawn at stale coordinates on every change.
  useLayoutEffect(() => { measure(); });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(schedule);
    ro.observe(container);
    for (const el of nodeRefs.current.values()) if (el.isConnected) ro.observe(el);
    container.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      ro.disconnect();
      container.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [containerRef, schedule]);

  return { positions, register, size, remeasure: schedule };
}

/** Stroke colour per message type — mirrors fleetTraffic's DOT_COLOR vocabulary. */
const EDGE_STROKE: Record<string, string> = {
  task: '#facc15',
  task_request: '#fb923c',
  reply: '#38bdf8',
  task_complete: '#4ade80',
  progress: '#a78bfa',
  escalate: '#f87171',
  held_message: '#fbbf24',
  approval_resolved: '#2dd4bf',
};
const EDGE_STROKE_UNKNOWN = '#a3a3a3';

export function edgeStroke(type: string | null | undefined): string {
  if (!type) return EDGE_STROKE_UNKNOWN;
  return EDGE_STROKE[type.toLowerCase()] ?? EDGE_STROKE_UNKNOWN;
}

function tooltip(e: OverlayEdge, windowHours: number): string {
  const head = `${e.a} ⇄ ${e.b} · ${e.count} in ${windowHours}h`;
  if (e.liveness === 'dead') return `${e.a} ⇄ ${e.b} · no traffic in ${windowHours}h`;
  if (e.liveness === 'quiet') return `${e.a} ⇄ ${e.b} · quiet — last traffic just outside the window`;
  const dir = e.direction === 'ab' ? ` · mostly ${e.a} → ${e.b}`
    : e.direction === 'ba' ? ` · mostly ${e.b} → ${e.a}`
    : ' · both ways';
  const esc = (e.escalate ?? 0) > 0 ? `\n${e.escalate} escalation${e.escalate === 1 ? '' : 's'}` : '';
  const parts = Object.entries(e.byType ?? {})
    .sort((x, y) => y[1] - x[1])
    .map(([t, n]) => `${n} ${t.replace(/_/g, ' ')}`);
  return parts.length ? `${head}${dir}${esc}\n${parts.join(', ')}` : `${head}${dir}${esc}`;
}

/** A replayed message event, the shape useReplay's `fired`/`trail` carry. Only the fields a
 *  pulse actually needs — this file does not import builder-2's engine, it only consumes
 *  plain data shaped like this (same "props in, markup out" boundary as ReplayControls). */
export interface ReplayFiredEvent {
  from?: string;
  to?: string;
  type?: string | null;
  id?: string;
  t: number;
  kind?: 'message' | 'spawn';
}

export interface TopologyOverlayProps {
  width: number;
  height: number;
  edges: OverlayEdge[];
  positions: Map<string, Box>;
  windowHours: number;
  onSelectConnection?: (a: string, b: string) => void;
  /** PLAY/GROW replay pulses (operator's port from /field, 2026-09-30). Events that fired on
   *  the LAST hook tick — each becomes one travelling pulse riding the SAME routed path the
   *  static edge above uses, never a straight line the router just spent its budget avoiding. */
  fired?: ReplayFiredEvent[];
  /** Seek trail (dragging the replay slider): the most-recent messages before the cursor,
   *  newest weight ~1.0 down to ~0.18, lighting their edges instead of a travelling shape —
   *  ported from /field's applySnapshotAt. */
  trail?: { event: { from?: string; to?: string }; weight: number }[];
}

export function TopologyOverlay({
  width, height, edges, positions, windowHours, onSelectConnection, fired, trail,
}: TopologyOverlayProps) {
  // Active pulses: `fired` is a NEW batch each hook tick (not a running list), so each tick
  // adds fresh pulses without disturbing ones already in flight. A ref holds the true current
  // list; `pulses` state exists only to trigger a re-render, always set to a plain value (the
  // ref's contents), never a functional updater — a functional setState called directly in an
  // effect body is what React's purity linter flags here (Agents.tsx's near-identical
  // newlyArrived-dots effect avoids the same warning the same way: a direct value, not `prev
  // => ...`). The ref is the single source of truth so the add-effect and the prune-interval
  // below can never drift out of sync with each other.
  const pulsesRef = useRef<ReplayPulse[]>([]);
  const [pulses, setPulses] = useState<ReplayPulse[]>([]);
  // `now` is STATE updated on an interval, not a Date.now() read during render — same reason
  // TimeBar does this: a render-time clock read is impure (React flags it) and would only
  // update when something else happens to re-render anyway. One interval both advances
  // pulse positions (pulseProgress is a function of `now`) and prunes dead ones.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!fired || fired.length === 0) return;
    const startedAt = Date.now();
    const next: ReplayPulse[] = fired
      .filter((e) => e.kind !== 'spawn' && e.from && e.to)
      .map((e) => ({ id: pulseId(e), a: e.from as string, b: e.to as string, type: e.type ?? null, startedAt }));
    if (next.length === 0) return;
    pulsesRef.current = [...pulsesRef.current, ...next];
    setPulses(pulsesRef.current);
  }, [fired]);
  const pulseCount = pulses.length;
  useEffect(() => {
    if (pulseCount === 0) return;
    const id = setInterval(() => {
      const t = Date.now();
      pulsesRef.current = pruneDeadPulses(pulsesRef.current, t);
      setNow(t);
      setPulses(pulsesRef.current);
    }, 50);
    return () => clearInterval(id);
  }, [pulseCount]);

  if (width <= 0 || height <= 0) return null;
  const obstacles = [...positions.values()];

  // Trail weight per pair, for the seek-drag highlight — a Map so a repeated pair (should not
  // happen, but a malformed trail must not crash) keeps its LAST/strongest weight rather than
  // silently picking whichever entry happened to iterate last by accident.
  const trailWeight = new Map<string, number>();
  for (const t of trail ?? []) {
    if (!t.event.from || !t.event.to) continue;
    const key = pairKey(t.event.from, t.event.to);
    trailWeight.set(key, Math.max(trailWeight.get(key) ?? 0, t.weight));
  }

  return (
    // pointer-events:none on the <svg> so the layer never steals a click meant
    // for a node; re-enabled per hit-path below. aria-hidden because every edge
    // is also reachable through the conversation list — an SVG path is not a
    // keyboard target, and pretending otherwise would be worse than routing
    // screen readers to the list that already works.
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      aria-hidden
    >
      {/* One marker per stroke colour is not worth it — the arrowhead inherits the
          path's stroke via context-stroke, so a single def serves every edge and the
          head always matches the line it terminates. */}
      <defs>
        <marker id="xedge-arrow" viewBox="0 0 8 8" refX="7" refY="4"
                markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
        </marker>
      </defs>
      {edges.map((e) => {
        const from = positions.get(e.a);
        const to = positions.get(e.b);
        // Never draw half an edge. selectCrossEdges already filters these out;
        // this is the belt to that braces, because a path with a NaN endpoint
        // renders as a line to the origin rather than as nothing.
        if (!from || !to) return null;

        const route = routeEdge(from, to, obstacles);
        const stroke = edgeStroke(e.type);
        const dead = e.liveness === 'dead';
        const quiet = e.liveness === 'quiet';
        // Seek-drag trail (build's ask, ported from /field's applySnapshotAt): lit by
        // opacity/thickness scaled by recency weight, no travelling shape — dragging always
        // shows the recent activity trail even mid-gap in bursty traffic.
        const trailW = trailWeight.get(pairKey(e.a, e.b)) ?? 0;

        return (
          <g key={`${e.a}|${e.b}`} className={clsx(e.dimmed && 'opacity-20')}>
            <path
              d={route.d}
              fill="none"
              // Escalation outranks the per-type colour: type is what the traffic
              // WAS, an escalation is something waiting on a person. A dead edge stays
              // grey regardless — an escalation from outside the window is history.
              stroke={dead ? '#3f3f46' : (e.escalate ?? 0) > 0 ? '#ef4444' : stroke}
              strokeWidth={
                trailW > 0
                  ? Math.max(e.widthPx, 1) + trailW * 3
                  : dead || quiet ? 1 : (e.escalate ?? 0) > 0 ? Math.max(2, e.widthPx) : e.widthPx
              }
              // dead = sparse dots (a connection that WAS real), quiet = dashes
              // (alive, just below the window). One grey line for both would say
              // "nothing here" about a link that is merely idle.
              strokeDasharray={dead ? '1 6' : quiet ? '5 4' : undefined}
              strokeOpacity={trailW > 0 ? Math.min(1, 0.5 + trailW * 0.5) : dead ? 0.55 : quiet ? 0.75 : 0.85}
              strokeLinecap="round"
              // The arrowhead goes on the END for a->b and the START for b->a, rather
              // than reversing the path: reversing would also flip where the curve
              // bulges, so the same pair would sit in a different place depending on
              // which way it happens to lean. A null direction gets NO head at all —
              // an evenly-split pair (ea<->gm is 53/53 today) has no direction to show,
              // and an arrow there would be a coin flip rendered as a fact.
              markerEnd={!dead && e.direction === 'ab' ? 'url(#xedge-arrow)' : undefined}
              markerStart={!dead && e.direction === 'ba' ? 'url(#xedge-arrow)' : undefined}
            />
            {onSelectConnection && (
              // A 1-2px line is not a clickable target. A wide transparent path
              // on top gives it a real hit area without inflating its weight.
              <path
                d={route.d}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                className="pointer-events-auto cursor-pointer"
                onClick={() => onSelectConnection(e.a, e.b)}
              >
                <title>{tooltip(e, windowHours)}</title>
              </path>
            )}
          </g>
        );
      })}
      {/* Replay pulses (PLAY/GROW port). Own <g>, own pointer-events:none — never steals a
          click, never gets clicked itself (build's spec: "pointer-events none on the whole
          pulse layer"). Rendered on TOP of the static edges/labels so a pulse is never
          visually occluded by the line it rides. */}
      <g className="pointer-events-none">
        {pulses.map((p) => {
          const from = positions.get(p.a);
          const to = positions.get(p.b);
          // The pair may have scrolled out of `positions` (node unmounted/filtered) between
          // the event firing and this render — drop it rather than draw from stale boxes.
          if (!from || !to) return null;
          const route = routeEdge(from, to, obstacles);
          const t = pulseProgress(p, now);
          const pos = pointAtFraction(route, t);
          const color = edgeStroke(p.type);
          // Fade in over the first 10% and out over the last 20% of the lifetime, rather than
          // popping in/out at full opacity — the same reason CSS transitions exist.
          const opacity = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
          return (
            <g key={p.id} opacity={opacity}>
              <circle cx={pos.x} cy={pos.y} r={5} fill={color} />
              <circle cx={pos.x} cy={pos.y} r={9} fill={color} opacity={0.35} />
              {p.type && (
                <text
                  x={pos.x}
                  y={pos.y - 12}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  letterSpacing="0.05em"
                  fill={color}
                  stroke="#0a0a0a"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {p.type.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** A non-agent endpoint (telegram, operator, …) drawn on the rim. */
export function RimNode({
  id, count, nodeRef, onSelect, dimmed, unborn,
}: {
  id: string;
  count: number;
  nodeRef: (el: HTMLElement | null) => void;
  onSelect?: (id: string) => void;
  dimmed?: boolean;
  /** GROW mode: no replayed event has touched this endpoint yet. */
  unborn?: boolean;
}) {
  return (
    <button
      type="button"
      ref={nodeRef}
      // Same scroll/measure hook the agent boxes carry. Without it a rim node is
      // invisible to "take me to this thing" AND to any measurement that enumerates
      // node boxes by this attribute — which is how a gm<->telegram edge could look
      // like it had only ONE endpoint.
      data-agent-id={id}
      onClick={onSelect ? () => onSelect(id) : undefined}
      title={`${id} — ${count} messages, external endpoint (not an agent)`}
      className={clsx(
        'flex flex-col items-center gap-0.5 rounded-lg border border-dashed border-neutral-700',
        'bg-neutral-900 px-2.5 py-1.5 min-w-[88px] transition hover:bg-neutral-800',
        'focus:outline-none focus:ring-1 focus:ring-sky-500',
        dimmed && 'opacity-30',
        // `invisible`, not removed: a rim node that leaves the flow during GROW reflows the
        // rim row and moves every other endpoint, which moves every edge landing on one.
        unborn && 'invisible',
      )}
    >
      <span className="text-[11px] text-neutral-300">{id}</span>
      <span className="text-[10px] text-neutral-500">{count}</span>
    </button>
  );
}
