// Pure module: external ("rim") endpoint derivation + deterministic perimeter
// placement for the 2D Agents View cross-edge overlay.
// See docs/DESIGN_2d-view-cross-edges-overlay.md §2.2. No DOM, no React,
// no simulation loop — a fixed deterministic rim, on purpose (design §2.2).

export interface PairCountRow {
  a: string;
  b: string;
  count: number;
  last_at: string | null;
}

export interface ExternalEndpoint {
  id: string;
  count: number;   // total messages across every pair touching this endpoint
  peers: string[]; // every distinct peer this endpoint has traffic with, sorted for determinism
}

// A pair that cannot be drawn because one side is a known agent that isn't currently
// rendered (retired / mid-rotation) — distinct from a pair that simply has no traffic.
export interface DroppedPair {
  a: string;
  b: string;
  count: number;
  hiddenId: string; // whichever of a/b is the non-visible agent
}

export interface ExternalEndpointsResult {
  endpoints: ExternalEndpoint[]; // sorted: count desc, then id asc — stable across renders
  dropped: DroppedPair[];
}

// `agentIds` is every agent id the fleet has ever known (the full registry) — this is what
// tells a retired/rotated id like "gm-g2" apart from a genuine external system like
// "telegram": both are absent from the rendered tree, but only one of them is an agent.
// `visibleAgentIds` is the subset actually rendered right now (subset of agentIds). This
// module does not re-derive hiding rules itself — that logic lives in TopologyDiagram.tsx
// and changes independently (the hidden set "grows with every rotation" per build's brief)
// — it only trusts what the caller says is currently drawable.
export function externalEndpoints(
  pairs: PairCountRow[],
  agentIds: string[],
  visibleAgentIds: string[],
): ExternalEndpointsResult {
  const agentSet = new Set(agentIds);
  const visibleSet = new Set(visibleAgentIds);

  const byId = new Map<string, { count: number; peers: Set<string> }>();
  const dropped: DroppedPair[] = [];

  for (const row of pairs) {
    const aIsAgent = agentSet.has(row.a);
    const bIsAgent = agentSet.has(row.b);

    if (!aIsAgent) {
      const entry = byId.get(row.a) ?? { count: 0, peers: new Set<string>() };
      entry.count += row.count;
      entry.peers.add(row.b);
      byId.set(row.a, entry);
    }
    if (!bIsAgent) {
      const entry = byId.get(row.b) ?? { count: 0, peers: new Set<string>() };
      entry.count += row.count;
      entry.peers.add(row.a);
      byId.set(row.b, entry);
    }

    // Dropped: exactly one side is an agent, and that agent isn't currently visible.
    if (aIsAgent && !bIsAgent && !visibleSet.has(row.a)) {
      dropped.push({ a: row.a, b: row.b, count: row.count, hiddenId: row.a });
    } else if (bIsAgent && !aIsAgent && !visibleSet.has(row.b)) {
      dropped.push({ a: row.a, b: row.b, count: row.count, hiddenId: row.b });
    }
  }

  const endpoints = [...byId.entries()]
    .map(([id, { count, peers }]) => ({ id, count, peers: [...peers].sort() }))
    .sort((x, y) => y.count - x.count || x.id.localeCompare(y.id));

  return { endpoints, dropped };
}

export interface RimBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlaceRimOptions {
  boxWidth?: number;
  boxHeight?: number;
  gap?: number;
  /** y of the first (bottom-most) row, in overlay-local coords — caller supplies this as
   *  "just below the lowest tier of workers" (design §2.2); this module has no tree layout
   *  knowledge of its own. */
  baseY?: number;
}

const RIM_DEFAULTS = { boxWidth: 96, boxHeight: 32, gap: 12, baseY: 0 };

// Deterministic perimeter placement, evenly spaced along the bottom edge. If a single row
// would exceed containerWidth, wraps into additional rows rather than compressing/overlapping
// boxes — each additional row rises above the base row, reading as a loose arc as the rim
// wraps rather than a rigid single line. NOT force-directed, NOT physics (design §2.2): the
// row-count and every box position are a pure function of (endpoint count, containerWidth,
// box size), nothing iterative or simulated.
export function placeRim(
  endpoints: { id: string }[],
  containerWidth: number,
  opts: PlaceRimOptions = {},
): RimBox[] {
  const { boxWidth, boxHeight, gap, baseY } = { ...RIM_DEFAULTS, ...opts };
  if (endpoints.length === 0 || containerWidth <= 0) return [];

  const perRow = Math.max(1, Math.floor((containerWidth + gap) / (boxWidth + gap)));
  const boxes: RimBox[] = [];

  for (let i = 0; i < endpoints.length; i++) {
    const row = Math.floor(i / perRow);
    const rowStart = row * perRow;
    const itemsInRow = Math.min(perRow, endpoints.length - rowStart);
    const col = i - rowStart;
    const rowWidth = itemsInRow * boxWidth + (itemsInRow - 1) * gap;
    // Clamp: a box wider than the container can't be centered without going negative —
    // physically impossible to satisfy "within container width" in that degenerate case,
    // so left-align rather than let x drift negative.
    const rowStartX = Math.max(0, (containerWidth - rowWidth) / 2);
    const x = rowStartX + col * (boxWidth + gap);
    const y = baseY - row * (boxHeight + gap);
    boxes.push({ id: endpoints[i].id, x, y, width: boxWidth, height: boxHeight });
  }

  return boxes;
}
