import { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { StatusDot } from './StatusDot';
import { TierBadge } from './TierBadge';
import type { PairCountRow } from '../lib/api';
import { lineWidthPx, pairKey, shortAgo, partitionTopology } from '../lib/topologyLines';
import { dotColor, type TrafficMessage } from '../lib/fleetTraffic';
import { TopologyOverlay, RimNode, useNodePositions, type OverlayEdge } from './TopologyOverlay';
import { externalEndpoints } from '../lib/rimNodes';
import { selectCrossEdges, busiestDrawn, edgeLiveness, edgeDirection } from '../lib/overlayGeometry';

interface Agent {
  id: string;
  name: string;
  tier: string;
  machine?: string;
  machine_status?: string;
  parent?: string;
  alive?: boolean;
  tmux_alive?: boolean;
  can_spawn?: string[];
  // The API already returned these; this component simply declared a narrower type and
  // dropped them, which is why the org chart could only ever show reachable-vs-dead while
  // the individual agent panes showed real activity. Item 5 of the operator's ask.
  status?: string;
  activity?: string;
  current_task?: string;
}

interface TopologyDiagramProps {
  agents: Agent[];
  /** Canonical per-pair counts from GET /api/messages/pair-counts (spec §16). Omit and the
   *  lines render as they always did: no counts, no thickness, nothing pretending to be data. */
  pairs?: PairCountRow[];
  /** The window `pairs` was counted over. Only used to label it honestly in tooltips. */
  windowHours?: number;
  /** Click a line. Passed the two ends; the page decides what opens. */
  onSelectConnection?: (a: string, b: string) => void;
  /** Click an agent box. The page decides what opens. */
  onSelectAgent?: (id: string) => void;
  /** Agent whose panel is currently open — gets a bright border (spec §4 selection). */
  selectedAgentId?: string | null;
  /** Clicking empty space clears the selection (spec §4). */
  onClearSelection?: () => void;
  /** Explicit set of agent ids to keep bright, overriding the selection-derived set. Used by
   *  search: picking a repo or prompt highlights the agents that use it (spec §8) without
   *  opening any panel. */
  brightIds?: string[] | null;
  /** Messages that JUST arrived, one dot each, colour by type and direction by sender
   *  (spec §4). The page owns the poll-diff and the expiry; this component only draws what
   *  it is handed, so a dot can never appear without a real message behind it (spec §2). */
  dots?: TrafficMessage[];
  /** Every agent id the fleet has ever known, retired rows included. Distinguishes "a
   *  hidden agent" from "not an agent at all" — without it a retired seat like gm-g2
   *  would be misclassified as an external endpoint and get a rim node of its own. */
  allAgentIds?: string[];
  /** Pairs with historic traffic but none in the window (API `dead_pairs`). Drawn
   *  differently from quiet — see overlayGeometry.edgeLiveness. */
  deadPairs?: PairCountRow[];
  /** Layer visibility. Cross edges and the rim are independently toggleable from the
   *  hierarchy, which always renders (spec: hierarchy is the skeleton). */
  layers?: { cross?: boolean; external?: boolean; counts?: boolean };
  /** Cap on cross edges drawn, highest count first. null = show all. */
  crossTopN?: number | null;
  /** Per-node escalation / held-message counts, windowed. From lib/nodeAlerts. */
  nodeAlerts?: Record<string, { escalate: number; held: number }>;
  /** Per-edge escalation counts, keyed by pairKey. An escalation is a fact about the
   *  CONVERSATION as well as the recipient, so the edge carries it too. */
  edgeAlerts?: Record<string, { escalate: number }>;
  /** The moment being viewed, when the time bar is scrubbed. Threaded in rather than
   *  read from a clock, so edge liveness is judged against what was true THEN — an
   *  edge whose only traffic is after this instant did not exist yet. */
  asof?: string | null;
  /** GROW mode. `null`/absent means normal: everything is present. A Set means the replay
   *  is growing the chart, and ONLY these ids (agents) / pairKeys (edges) have been touched
   *  by a replayed event so far; everything else is hidden until its first event lands.
   *  Two sets rather than one derived from the other: an edge needs BOTH ends born, but a
   *  node can be born by a spawn event with no edge at all, so neither implies the other. */
  bornIds?: ReadonlySet<string> | null;
  bornEdges?: ReadonlySet<string> | null;
}

/** A box or a line is a real control when it has a handler and plain markup when it does not.
 *  One element, two shells: without this the node markup would exist in two copies and they
 *  would drift. `button` over `div onClick` so the graph is usable from a keyboard (spec §2
 *  says everything is clickable — that has to include people not using a mouse). */
function Clickable({
  onClick, title, className, children, elRef, dataAgentId,
}: {
  onClick?: () => void; title?: string; className: string; children: React.ReactNode;
  /** Both shells forward the ref: the overlay has to measure a node whether or not
   *  it happens to be interactive, or an unclickable box would have no position and
   *  every edge touching it would silently vanish. */
  elRef?: (el: HTMLElement | null) => void;
  /** Scroll/focus target, forwarded on BOTH shells for the same reason as the ref:
   *  "take me to this agent" must work whether or not the box happens to be clickable. */
  dataAgentId?: string;
}) {
  if (!onClick) {
    return <div ref={elRef} data-agent-id={dataAgentId} title={title} className={className}>{children}</div>;
  }
  return (
    <button type="button" ref={elRef} data-agent-id={dataAgentId} onClick={onClick} title={title}
      className={clsx(className, 'text-left focus:outline-none focus:ring-2 focus:ring-sky-500')}>
      {children}
    </button>
  );
}

// 2D Agents View spec §4. Lines carry the message count for the window and get thicker with
// traffic; a line with no traffic goes thin and grey rather than disappearing (spec §12 —
// nothing important is hidden). This replaces the literal "hub-spoke"/"mesh" strings, which
// described the topology's shape and told you nothing about whether anything was moving.
// The maths lives in lib/topologyLines.ts so it can be tested and so this file keeps
// exporting nothing but components (react-refresh/only-export-components).

type PairLookup = { get: (a: string, b: string) => PairCountRow | undefined; busiest: number };

/** Spec §4 selection: the selected agent and everyone it talks to stay bright, everything
 *  else fades. Returns null when nothing is selected, which the callers read as "no fading" —
 *  distinct from "an empty neighbour set", where everything else SHOULD fade. */
function useBrightSet(
  selectedAgentId: string | null | undefined, pairs: PairCountRow[] | undefined,
): Set<string> | null {
  return useMemo(() => {
    if (!selectedAgentId) return null;
    const bright = new Set<string>([selectedAgentId]);
    for (const p of pairs ?? []) {
      if (p.a === selectedAgentId) bright.add(p.b);
      else if (p.b === selectedAgentId) bright.add(p.a);
    }
    return bright;
  }, [selectedAgentId, pairs]);
}

function useDotsByPair(dots: TrafficMessage[] | undefined): Map<string, TrafficMessage[]> {
  return useMemo(() => {
    const m = new Map<string, TrafficMessage[]>();
    for (const d of dots ?? []) {
      const k = pairKey(d.from_agent, d.to_agent);
      const list = m.get(k);
      if (list) list.push(d); else m.set(k, [d]);
    }
    return m;
  }, [dots]);
}

/**
 * `busiest` is the denominator every line's thickness is scaled against, and it MUST be the
 * busiest line actually DRAWN — not the busiest pair in the data.
 *
 * review's browser pass (2026-09-30) caught this: the global busiest pair was gm<->telegram
 * at 150, but telegram is not a node in this tree — it is invisible and unclickable. So every
 * visible line was scaled against a number the operator cannot see and drawn systematically
 * too thin relative to the busiest line on screen (gm<->build, 131). The thicknesses were
 * internally consistent and quietly wrong, which is why only looking at it found this.
 *
 * `drawnKeys` is the set of pairKeys the tree renders. Empty (nothing drawn yet) falls back to
 * the global max rather than to 0, so the first render cannot divide by zero.
 */
function usePairLookup(pairs: PairCountRow[] | undefined, drawnKeys: Set<string>): PairLookup {
  return useMemo(() => {
    const map = new Map<string, PairCountRow>();
    let globalMax = 0;
    let drawnMax = 0;
    for (const p of pairs ?? []) {
      const k = pairKey(p.a, p.b);
      map.set(k, p);
      if (p.count > globalMax) globalMax = p.count;
      if (drawnKeys.has(k) && p.count > drawnMax) drawnMax = p.count;
    }
    return {
      get: (a: string, b: string) => map.get(pairKey(a, b)),
      busiest: drawnKeys.size > 0 ? drawnMax : globalMax,
    };
  }, [pairs, drawnKeys]);
}

function getNodeBorder(agent: Agent): string {
  if (agent.alive || agent.tmux_alive) {
    if (agent.machine === 'mac' && (agent.machine_status === 'sleeping' || agent.machine_status === 'offline')) {
      return 'border-amber-500';
    }
    return 'border-green-500';
  }
  return 'border-red-500/60';
}

function getNodeOpacity(agent: Agent): string {
  if (!agent.alive && !agent.tmux_alive) return 'opacity-50';
  return '';
}

// A seat that is merely reachable and a seat that is mid-turn are different facts, and
// the org chart previously showed only the first. `working` is the live detector state
// (corroborated by transcript activity server-side); anything else falls back to the
// reachable/dead distinction the tree already made.
function isWorking(agent: Agent): boolean {
  return agent.status === 'working' && (agent.alive || agent.tmux_alive) === true;
}

function AgentNode({
  agent, onSelect, selected, dimmed, nodeRef, alerts, unborn,
}: {
  agent: Agent; onSelect?: (id: string) => void; selected?: boolean; dimmed?: boolean;
  /** Registers this box with the overlay's position tracker. */
  nodeRef?: (el: HTMLElement | null) => void;
  /** Escalations and held messages landing ON this agent, already windowed. */
  alerts?: { escalate: number; held: number };
  /** GROW mode: this seat has not been touched by a replayed event yet. */
  unborn?: boolean;
}) {
  const working = isWorking(agent);
  // GROW reveal flash. Local state rather than a set held by the parent: the parent would
  // have to own one independent 700ms timer per seat and re-render the whole tree to clear
  // each one, when the only thing that changes is a ring on a single box.
  const [flash, setFlash] = useState(false);
  const wasUnborn = useRef(unborn);
  useEffect(() => {
    const was = wasUnborn.current;
    wasUnborn.current = unborn;
    if (!was || unborn) return;                 // only fire on unborn -> born
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(t);
  }, [unborn]);
  // Agent-level only. The operator explicitly did NOT want skill/prompt execution detail,
  // so this shows the task a seat is on, never which tool or skill is running.
  const subtitle = working ? (agent.current_task || 'working').trim() : '';
  return (
    <Clickable
      elRef={nodeRef}
      // Same attribute the agent cards already carry, so "scroll to this agent" is one
      // selector that works in either view rather than two that drift.
      dataAgentId={agent.id}
      onClick={onSelect ? () => onSelect(agent.id) : undefined}
      className={clsx(
        'relative flex flex-col items-center gap-1 rounded-lg border-2 bg-neutral-900 px-3 py-2.5 min-w-[110px] transition hover:bg-neutral-800',
        // Status GLOW, not just a dot (spec step 3). The dot stays — it is the thing
        // that survives prefers-reduced-motion and a colourblind read — and the glow is
        // an additional, redundant cue on the same fact. A down seat gets a red glow at
        // lower intensity than a working seat's blue: down is a state to notice, working
        // is a state that is changing, and the brighter one should be the live one.
        working ? 'border-sky-400 shadow-[0_0_12px_-2px_rgba(56,189,248,0.7)]'
          : (!agent.alive && !agent.tmux_alive)
            ? clsx(getNodeBorder(agent), 'shadow-[0_0_10px_-3px_rgba(248,113,113,0.65)]')
            : getNodeBorder(agent),
        // An escalation landing here outranks both: it is the one state that is asking
        // a human for something. Ring rather than border swap, so the status colour
        // underneath is never destroyed (spec section 2).
        (alerts?.escalate ?? 0) > 0 && 'ring-2 ring-red-500/70',
        // Selection reads as a ring, not a border swap: overwriting the border would throw
        // away the status colour, which is the one thing that must never be hidden (spec §2).
        selected && 'ring-2 ring-sky-300 ring-offset-2 ring-offset-neutral-900',
        // Fade, not hide: a down agent that is also unrelated to the selection still has to
        // stay on screen and still has to be red (spec §2, §7 — nothing important is hidden).
        dimmed && 'opacity-30',
        // GROW: `invisible`, NOT conditional render and NOT `hidden`. Removing the box from
        // the flex flow would reflow the whole tree every time a seat is revealed, which
        // moves every other box, which invalidates every position the overlay measured —
        // the edges would jump on every reveal. visibility:hidden keeps the geometry frozen
        // so a reveal is a box fading in at the coordinates the overlay already knows.
        unborn && 'invisible',
        flash && 'ring-2 ring-sky-300',
        getNodeOpacity(agent)
      )}
      title={working ? (agent.activity || 'working') : (agent.status || (agent.alive ? 'idle' : 'stopped'))}
    >
      {/* Held-message badge. Top-LEFT, because the working pulse owns top-right and two
          indicators on the same corner read as one smudge. Not aria-hidden: unlike the
          pulse (which duplicates the border colour) this is the only place the count
          appears, so hiding it from a screen reader would lose the fact entirely. */}
      {(alerts?.held ?? 0) > 0 && (
        <span
          title={`${alerts!.held} held message${alerts!.held === 1 ? '' : 's'} waiting for ${agent.id}`}
          className="absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center"
        >
          {alerts!.held}
        </span>
      )}
      {working && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
        >
          {/* motion-safe: the expanding ring is decoration, so it is the only part gated.
              Every bit of INFORMATION survives prefers-reduced-motion — the solid dot
              below, the sky border and the task subtitle all stay — so a reader who
              suppresses motion loses the animation, never the meaning. A continuously
              looping pulse is the shape that actually troubles vestibular sensitivity,
              which is why this one is worth gating and a one-shot spinner is not. */}
          <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <StatusDot status={agent.alive ? 'running' : 'stopped'} />
        <span className="text-sm font-semibold text-neutral-100 truncate max-w-[90px]">{agent.name}</span>
      </div>
      <TierBadge tier={agent.tier} />
      {subtitle && (
        <span className="text-[10px] text-sky-300/90 truncate max-w-[100px]" title={subtitle}>
          {subtitle}
        </span>
      )}
      {!working && agent.machine && (
        <span className="text-[10px] text-neutral-500">{agent.machine}</span>
      )}
    </Clickable>
  );
}

/** One clickable segment between two named agents, thickness and count from `lookup`.
 *  `stubPx` is the length of the line above and below the label, so the caller keeps the
 *  spacing the tree already had instead of this component guessing at layout. */
function Connection({
  a, b, lookup, windowHours, onSelect, stubPx, dimmed, dots, labelRef, unborn,
}: {
  a: string; b: string; lookup: PairLookup; windowHours: number;
  onSelect?: (a: string, b: string) => void; stubPx: number;
  dimmed?: boolean; dots?: TrafficMessage[];
  /** GROW mode: no replayed event has touched this pair yet. */
  unborn?: boolean;
  /** Registers the count pill as a routing OBSTACLE.
   *
   *  builder-1 measured 12 of 12 cross edges overlapping something on the real page,
   *  26 overlaps in total, and the single biggest cause was that these pills were
   *  never obstacles at all — the router only ever saw AgentNode boxes. A perfect
   *  routing algorithm cannot avoid a rectangle nobody told it about. */
  labelRef?: (el: HTMLElement | null) => void;
}) {
  const row = lookup.get(a, b);
  const count = row?.count ?? 0;
  const width = lineWidthPx(count, lookup.busiest);
  const tip = count
    ? `${a} ⇄ ${b} · ${count} message${count === 1 ? '' : 's'} · last ${shortAgo(row?.last_at ?? null)}`
    : `${a} ⇄ ${b} · no messages in the last ${windowHours}h`;
  const line = (
    <div
      className={clsx('shrink-0', count ? 'bg-neutral-500' : 'bg-neutral-800')}
      style={{ width: `${width}px`, height: `${stubPx}px` }}
    />
  );
  // A button, not a div with onClick: the lines are real controls, so they have to be
  // reachable and announced without a mouse (spec §2, "everything is clickable" — for
  // everyone). No onSelect and it degrades to plain text rather than a dead button.
  const label = onSelect ? (
    <button
      ref={labelRef as ((el: HTMLButtonElement | null) => void) | undefined}
      type="button"
      onClick={() => onSelect(a, b)}
      title={tip}
      aria-label={tip}
      className={clsx(
        'text-[10px] bg-neutral-950 px-1.5 py-0.5 rounded z-10 relative transition-colors',
        'hover:text-neutral-100 hover:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-sky-500',
        count ? 'text-neutral-400' : 'text-neutral-600',
      )}
    >
      {count || '—'}
    </button>
  ) : (
    <span
      ref={labelRef as ((el: HTMLSpanElement | null) => void) | undefined}
      title={tip}
      className={clsx('text-[10px] bg-neutral-950 px-1.5 py-0.5 rounded z-10 relative',
        count ? 'text-neutral-400' : 'text-neutral-600')}
    >
      {count || '—'}
    </span>
  );
  return (
    // `relative` so a dot animates across the WHOLE connection, label included, rather than
    // across one half of it — over a 30px segment, half the travel reads as a flicker.
    // `invisible` for the same reason AgentNode uses it: the count pill is a registered
    // routing obstacle, so removing it from the flow during GROW would change every route
    // mid-replay. Hidden but still occupying its box keeps the geometry identical.
    <div className={clsx('relative flex flex-col items-center gap-0', dimmed && 'opacity-30',
      unborn && 'invisible')}>
      {line}
      {label}
      {line}
      {/* `a` is always the upper node in the tree, so a message sent BY `a` travels down and
          one sent TO it travels up. Direction comes off the message, never from the line. */}
      {(dots ?? []).map((d) => (
        <span
          key={d.id}
          aria-hidden
          className={clsx('fleet-dot', d.from_agent === a ? 'fleet-dot-down' : 'fleet-dot-up',
            dotColor(d.type))}
        />
      ))}
    </div>
  );
}

export function TopologyDiagram({
  agents, pairs, windowHours = 24, onSelectConnection, onSelectAgent, selectedAgentId,
  onClearSelection, dots, brightIds,
  allAgentIds, deadPairs, layers, crossTopN = 12, nodeAlerts, edgeAlerts, asof = null,
  bornIds = null, bornEdges = null,
}: TopologyDiagramProps) {
  // GROW predicates. Both collapse to `false` when the sets are absent, so every call site
  // below is a no-op outside growth rather than a branch each one has to remember.
  const unbornNode = (id: string) => bornIds != null && !bornIds.has(id);
  const unbornEdge = (a: string, b: string) => bornEdges != null && !bornEdges.has(pairKey(a, b));
  const containerRef = useRef<HTMLDivElement>(null);
  const { positions, register, size: overlaySize } = useNodePositions(containerRef);
  const showCross = layers?.cross ?? true;
  const showExternal = layers?.external ?? true;
  // Partition first: the set of lines the tree will draw is what the thickness denominator has
  // to be computed from, so it cannot wait until render. partitionTopology computes `rest` by
  // SUBTRACTION — whatever the tree does not claim is still rendered — because the previous
  // tier-matching version could drop an agent that matched no bucket, and did: the fleet's
  // only down agent (gm-g2, also tier T0) appeared nowhere. See the note on the function.
  //
  // ONE memo produces BOTH the partition and the drawn-line set, deliberately. drawnKeys used
  // to recompute the tiers itself — its own `find` for the root, its own lead filter — which
  // was a second copy of the same partition that could drift from the one actually rendered.
  // It caused no visible bug (a second T0 draws no line either way), but it is the same
  // two-sources-for-one-fact shape as the disagreeing message stores this feature exists to
  // have killed, so it goes before it becomes one. A single memo also keeps the Set identity
  // stable for usePairLookup, which is why drawnKeys was memoised in the first place.
  const { partition, drawnKeys } = useMemo(() => {
    const part = partitionTopology(agents);
    const keys = new Set<string>();
    for (const lead of part.leads) {
      if (part.root) keys.add(pairKey(part.root.id, lead.id));
      for (const w of part.workersByLead[lead.id] ?? []) keys.add(pairKey(lead.id, w.id));
    }
    return { partition: part, drawnKeys: keys };
  }, [agents]);
  const { root: gm, leads: pms, workersByLead: workersByParent, rest: orphanAgents } = partition;

  const lookup = usePairLookup(pairs, drawnKeys);
  const selectionBright = useBrightSet(selectedAgentId, pairs);
  // An explicit highlight wins over the selection-derived set: the two are different questions
  // ("who does this agent talk to" vs "who uses this repo") and answering both at once would
  // brighten a union that means neither.
  const bright = useMemo(
    () => (brightIds ? new Set(brightIds) : selectionBright),
    [brightIds, selectionBright],
  );
  const dotsByPair = useDotsByPair(dots);
  // External endpoints: things with traffic that are not agents. `allAgentIds` is the
  // FULL registry so a retired seat reads as a hidden agent rather than a new external
  // endpoint; the visible list is what the tree actually drew.
  const rim = useMemo(() => {
    if (!showExternal) return { endpoints: [], dropped: [] };
    const visible = agents.map((a) => a.id);
    return externalEndpoints(pairs ?? [], allAgentIds ?? visible, visible);
  }, [pairs, agents, allAgentIds, showExternal]);

  // Cross edges: every pair with traffic that the hierarchy tree does not already draw.
  // Dead pairs ride the same path so they are routed and hit-tested identically —
  // the only difference is how they are stroked.
  const crossSelection = useMemo(() => {
    if (!showCross) return null;
    const rows = [...(pairs ?? []), ...(deadPairs ?? [])];
    const positioned = new Set(positions.keys());
    return selectCrossEdges(rows, positioned, drawnKeys, pairKey, crossTopN);
  }, [pairs, deadPairs, positions, drawnKeys, crossTopN, showCross]);

  const overlayEdges: OverlayEdge[] = useMemo(() => {
    if (!crossSelection) return [];
    // The VIEWED moment. While the time bar is scrubbed this is asof, not the wall
    // clock — otherwise an edge whose only traffic is after the scrubbed moment gets
    // described as "quiet", which is a claim about a conversation that had not
    // happened yet.
    const viewedNow = asof ? Date.parse(asof) : Date.now();
    const now = Number.isFinite(viewedNow) ? viewedNow : Date.now();
    const denom = busiestDrawn(crossSelection.drawn, lookup.busiest);
    // flatMap rather than map().filter(): dropping the absent case here narrows
    // `liveness` for the compiler as a side effect of the early return, instead of
    // needing a type predicate to re-assert something the filter already guaranteed.
    return crossSelection.drawn.flatMap((p): OverlayEdge[] => {
      const byType = p.by_type ?? {};
      const top = Object.entries(byType).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
      const lastAt = p.last_at ? Date.parse(p.last_at) : null;
      const liveness = edgeLiveness(
        p.count, Number.isNaN(lastAt as number) ? null : lastAt, now, windowHours * 3600_000,
      );
      // An edge that did not exist at the viewed moment is not drawn AT ALL. Drawing
      // it dashed-and-grey would still assert a relationship that had not formed yet,
      // which is what the scrubbed view was doing: nine tooltips claiming "quiet" about
      // pairs whose only traffic was days after the moment on screen.
      if (liveness === 'absent') return [];
      return [{
        a: p.a, b: p.b, count: p.count, type: top, byType,
        direction: edgeDirection(p.a_to_b ?? 0, p.b_to_a ?? 0),
        liveness,
        widthPx: lineWidthPx(p.count, denom),
        // Same rule hierarchy lines use: an edge stays bright only if the selected
        // agent is one of its two ends.
        dimmed: bright !== null && p.a !== selectedAgentId && p.b !== selectedAgentId,
        // An escalation on this pair overrides the type colour. Type tells you WHAT
        // the traffic was; an escalation tells you something needs a human, and that
        // is the more urgent fact for a glance across the whole graph.
        escalate: edgeAlerts?.[pairKey(p.a, p.b)]?.escalate ?? 0,
      }];
    });
  }, [crossSelection, lookup.busiest, windowHours, bright, selectedAgentId, asof]);

  // GROW: a cross edge is drawn only once a replayed event has touched it. Filtered AFTER
  // the memo, not inside it, so widthPx keeps the live `denom` — a growing chart whose
  // surviving lines rescaled on every reveal would read as traffic changing when only
  // visibility did. Unlike the DOM nodes this needs no invisible-box trick: SVG paths are
  // absolutely positioned, so removing one moves nothing.
  const drawnOverlayEdges = bornEdges == null
    ? overlayEdges
    : overlayEdges.filter((e) => bornEdges.has(pairKey(e.a, e.b)));

  const isDim = (id: string) => bright !== null && !bright.has(id);
  // A line stays bright only if the selected agent is one of its two ends.
  const lineDim = (a: string, b: string) =>
    bright !== null && a !== selectedAgentId && b !== selectedAgentId;

  return (
    // Spec §4: clicking empty space clears. Guarded on e.target === e.currentTarget so a
    // click that bubbled up from a node or a line does not immediately undo the selection
    // it just made — without that check, selecting anything is impossible.
    <div
      ref={containerRef}
      // `relative` is what the absolutely-positioned overlay measures against — every
      // node box is converted into coordinates local to THIS element.
      className="relative flex flex-col items-center gap-0 py-6 overflow-x-auto"
      onClick={(e) => { if (onClearSelection && e.target === e.currentTarget) onClearSelection(); }}
    >
      {/* Edges first in document order so node boxes paint OVER them: an opaque
          bg-neutral-900 node then covers any line passing near it, which is the
          cheap half of "no lines through boxes" (routeEdge does the real half).
          No double-render of nodes, one fewer thing to keep in sync. */}
      {drawnOverlayEdges.length > 0 && (
        <TopologyOverlay
          width={overlaySize.w}
          height={overlaySize.h}
          edges={drawnOverlayEdges}
          positions={positions}
          windowHours={windowHours}
          onSelectConnection={onSelectConnection}
        />
      )}
      {/* T0: GM */}
      {gm && (
        <>
          <AgentNode nodeRef={register(gm.id)} alerts={nodeAlerts?.[gm.id]} agent={gm} onSelect={onSelectAgent} selected={selectedAgentId === gm.id} dimmed={isDim(gm.id)} unborn={unbornNode(gm.id)} />
          {/* Trunk down to the PM bar. Deliberately unlabelled: this is a bus, not a pair,
              and the "hub-spoke" string it replaces described the shape rather than the
              traffic. The real gm<->pm counts sit on each PM's own segment below. */}
          <div className="w-px h-12 bg-neutral-700" />
        </>
      )}

      {/* T1: PMs row */}
      {pms.length > 0 && (
        <>
          {/* The bus line over the lead row.
              It used to be pure arithmetic — left: calc(50% - (n-1)*80px), width:
              (n-1)*160px — which assumes every lead sits exactly 160px from the next.
              Nothing enforces that, so the bar pointed at coordinates the leads were
              not at, and the moment the row wrapped it was describing a layout that no
              longer existed. Measured from the real lead boxes instead: first centre to
              last centre, in the same overlay-local space the edges already use.
              Falls back to the old arithmetic only before the first measurement. */}
          <div className="relative flex items-start justify-center w-full">
            {pms.length > 1 && (() => {
              const first = positions.get(pms[0].id);
              const last = positions.get(pms[pms.length - 1].id);
              const container = containerRef.current;
              if (first && last && container) {
                return (
                  <div
                    className="absolute top-0 h-px bg-neutral-700"
                    style={{ left: `${first.cx}px`, width: `${Math.max(0, last.cx - first.cx)}px` }}
                  />
                );
              }
              return (
                <div
                  className="absolute top-0 h-px bg-neutral-700"
                  style={{
                    left: `calc(50% - ${(pms.length - 1) * 80}px)`,
                    width: `${(pms.length - 1) * 160}px`,
                  }}
                />
              );
            })()}
          </div>
          {/* NO flex-wrap. Wrapping put `review` on a second row under `think` while its
              stub still pointed up at a bus bar that was no longer above it, and left
              `think` and `test` hanging off connectors that reached nothing — which is
              what the operator meant by the hierarchy being off. The container is
              already overflow-x-auto, so a fleet too wide to fit now scrolls, which
              keeps every connector pointing at the thing it connects to. Scrolling is
              honest about running out of room; wrapping silently lies about structure.
              min-w-max stops the row being squashed instead of scrolling. */}
          <div className="flex items-start gap-8 justify-center min-w-max">
            {pms.map((pm) => {
              const pmWorkers = workersByParent[pm.id] || [];
              return (
                <div key={pm.id} className="flex flex-col items-center gap-0">
                  {/* The gm<->pm line itself: count, thickness and click all live here. */}
                  {gm && (
                    <Connection
                      labelRef={register(`label:${pairKey(gm.id, pm.id)}`)}
                      a={gm.id} b={pm.id} lookup={lookup} windowHours={windowHours}
                      onSelect={onSelectConnection} stubPx={18}
                      dimmed={lineDim(gm.id, pm.id)}
                      dots={dotsByPair.get(pairKey(gm.id, pm.id))}
                      unborn={unbornEdge(gm.id, pm.id)}
                    />
                  )}
                  <AgentNode nodeRef={register(pm.id)} alerts={nodeAlerts?.[pm.id]} agent={pm} onSelect={onSelectAgent} selected={selectedAgentId === pm.id} dimmed={isDim(pm.id)} unborn={unbornNode(pm.id)} />

                  {/* Workers under this PM. Each worker gets its OWN line to the PM rather
                      than sharing one "mesh" label for the group — a per-pair count is the
                      whole point, and one label for six workers can't carry six numbers. */}
                  {pmWorkers.length > 0 && (
                    <div className="flex items-start gap-3 flex-wrap justify-center max-w-xs">
                      {pmWorkers.map((w) => (
                        <div key={w.id} className="flex flex-col items-center gap-0">
                          <Connection
                            labelRef={register(`label:${pairKey(pm.id, w.id)}`)}
                            a={pm.id} b={w.id} lookup={lookup} windowHours={windowHours}
                            onSelect={onSelectConnection} stubPx={14}
                            dimmed={lineDim(pm.id, w.id)}
                            dots={dotsByPair.get(pairKey(pm.id, w.id))}
                            unborn={unbornEdge(pm.id, w.id)}
                          />
                          <AgentNode nodeRef={register(w.id)} alerts={nodeAlerts?.[w.id]} agent={w} onSelect={onSelectAgent} selected={selectedAgentId === w.id} dimmed={isDim(w.id)} unborn={unbornNode(w.id)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Orphan workers (no parent or parent not a PM) */}
      {orphanAgents.length > 0 && (
        <div className="mt-6 pt-4 border-t border-neutral-800 w-full">
          <p className="text-xs text-neutral-600 text-center mb-3">Not in the tree ({orphanAgents.length})</p>
          <div className="flex items-start gap-3 flex-wrap justify-center">
            {orphanAgents.map((w) => (
              <AgentNode key={w.id} nodeRef={register(w.id)} alerts={nodeAlerts?.[w.id]} agent={w} onSelect={onSelectAgent} selected={selectedAgentId === w.id} dimmed={isDim(w.id)} unborn={unbornNode(w.id)} />
            ))}
          </div>
        </div>
      )}

      {/* External endpoints on the rim. These have real traffic and no node, so before
          this they were invisible AND their busiest pair (gm<->telegram, the largest in
          the whole dataset) was unreachable. Dashed border and no status dot: they are
          not agents and must not be mistaken for one. */}
      {rim.endpoints.length > 0 && (
        <div className="mt-6 pt-4 border-t border-neutral-800 w-full">
          <p className="text-xs text-neutral-600 text-center mb-3">
            External ({rim.endpoints.length})
            {rim.dropped.length > 0 && (
              // Say what is NOT drawn rather than leaving a silent gap. Today this is
              // exactly one pair: an endpoint whose other end is a retired seat the
              // fleet view hides on purpose, so the edge has nowhere to land.
              <span
                className="text-neutral-700"
                title={rim.dropped.map((d) => `${d.a} ⇄ ${d.b} (${d.count}) — ${d.hiddenId} is retired and not drawn`).join('\n')}
              >
                {' · '}{rim.dropped.length} not drawn
              </span>
            )}
          </p>
          <div className="flex items-start gap-3 flex-wrap justify-center">
            {rim.endpoints.map((e) => (
              <RimNode
                key={e.id}
                id={e.id}
                count={e.count}
                nodeRef={register(e.id)}
                onSelect={onSelectAgent}
                dimmed={isDim(e.id)}
                unborn={unbornNode(e.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {agents.length === 0 && (
        <p className="text-neutral-600 text-sm py-12">No agents to display</p>
      )}
    </div>
  );
}
