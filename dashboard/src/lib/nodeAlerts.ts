/**
 * Per-node and per-edge alert aggregation for the 2D Agents View v2 overlay (build's v2 step
 * 3). Pure functions over plain message arrays — no DOM, no React, no Date.now() inside (the
 * caller passes `now`, so this module is deterministic and the tests can pin time exactly).
 *
 * Message shape is TrafficMessage (lib/fleetTraffic.ts): id, from_agent, to_agent, type,
 * created_at. Only two types carry an alert: `escalate` and `held_message` — every other type
 * (task, reply, ...) contributes nothing here, alert-wise.
 */
import type { TrafficMessage } from './fleetTraffic.ts';
import { pairKey } from './topologyLines.ts';

export interface AlertCounts {
  escalate: number;
  held: number;
}

export interface NodeAlertsOptions {
  /** Alert window in hours. Default 24 — an all-time badge would never clear (build's own
   *  instruction: windowing must be a parameter, not baked in as "always 24h"). */
  windowHours?: number;
  /** Reference "now", as epoch ms. Required, not defaulted to Date.now() — this module never
   *  reads the clock itself, so a caller's test can pin it and get a reproducible result. */
  now: number;
}

export interface NodeAlertsResult {
  byNode: Record<string, AlertCounts>;
  /** Escalations only, keyed by topologyLines' pairKey. Held messages have no edge — a held
   *  message is a fact about a stuck DELIVERY to one node, not a conversation between two. */
  byEdge: Record<string, { escalate: number }>;
  /** Alerts whose recipient is not currently drawn on the graph (retired, unknown, or simply
   *  not in `visibleIds`) — NEVER silently dropped. build measured live: 6 of 7 all-time
   *  held_message rows belong to a single retired node (gm-g2). Without this bucket the
   *  visible held badge would show "1" with no way to say the other 6 are real and just not
   *  drawable — the same "31 vs 30 connections" shape as FIX 2. */
  hidden: AlertCounts;
}

function emptyCounts(): AlertCounts {
  return { escalate: 0, held: 0 };
}

/**
 * An escalate/held message has a DIRECTION, and the alert belongs to the RECIPIENT
 * (`to_agent`), not the sender: the recipient is the one who has to act on an escalation, and
 * a held message is a stuck delivery TO that node, not an action by whoever sent it. Same
 * reasoning for both alert types, so both key off `to_agent` uniformly.
 */
export function nodeAlerts(
  messages: TrafficMessage[],
  visibleIds: Set<string> | string[],
  opts: NodeAlertsOptions
): NodeAlertsResult {
  const visible = visibleIds instanceof Set ? visibleIds : new Set(visibleIds);
  const windowHours = opts.windowHours ?? 24;
  const cutoff = opts.now - windowHours * 3_600_000;

  const byNode: Record<string, AlertCounts> = {};
  const byEdge: Record<string, { escalate: number }> = {};
  const hidden: AlertCounts = emptyCounts();

  for (const m of messages) {
    const kind: keyof AlertCounts | null =
      m.type === 'escalate' ? 'escalate' : m.type === 'held_message' ? 'held' : null;
    if (!kind) continue; // every other type contributes nothing here

    const ts = m.created_at ? Date.parse(m.created_at) : NaN;
    if (!Number.isFinite(ts) || ts < cutoff) continue; // unparseable or older than the window

    if (!visible.has(m.to_agent)) {
      hidden[kind] += 1;
      continue;
    }

    (byNode[m.to_agent] ??= emptyCounts())[kind] += 1;

    // Edges are escalate-only (see the field comment on byEdge above), and only drawable
    // when BOTH ends are actually on the graph — a node-level badge on `to_agent` already
    // surfaced the alert even when the sender itself is hidden, so this is additive, not the
    // only place the alert is recorded.
    if (kind === 'escalate' && visible.has(m.from_agent)) {
      const key = pairKey(m.from_agent, m.to_agent);
      (byEdge[key] ??= { escalate: 0 }).escalate += 1;
    }
  }

  return { byNode, byEdge, hidden };
}
