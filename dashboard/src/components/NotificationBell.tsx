import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, ShieldCheck, ClipboardList, AlertTriangle, Clock, X } from 'lucide-react';
import { getGmAuthState, fetchAlerts } from '../lib/api';
import { isFleetMember } from '../lib/topologyLines';
import { nodeAlerts } from '../lib/nodeAlerts';
import { useOrchestraStore } from '../stores/useOrchestraStore';
import { useAgents } from '../hooks/useAgents';
import AuthFlow from './AuthFlow';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

const NEEDS_AUTH_STATES = new Set([
  'needs_login',
  'login_options',
  'url_ready',
  'code_prompt',
  'login_success',
]);

export default function NotificationBell() {
  const navigate = useNavigate();
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll auth state
  const poll = useCallback(async () => {
    try {
      const data = await getGmAuthState();
      setNeedsAuth(NEEDS_AUTH_STATES.has(data.state));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [poll]);

  // Fetch pending counts
  const { data: approvalStats } = useQuery({
    queryKey: ['unified-approvals-stats'],
    queryFn: () => fetchJson<{ by_status: Record<string, number>; total: number }>('/approvals/unified/stats'),
    refetchInterval: 10000,
  });

  const { data: qData } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: () => fetchJson<{ questionnaires: any[]; pending: number }>('/questionnaires'),
    refetchInterval: 10000,
  });

  const pendingApprovals = approvalStats?.by_status?.pending || 0;
  const pendingQuestionnaires = qData?.pending || (qData?.questionnaires ?? []).filter((q: any) => q.status === 'pending').length || 0;

  // Per-agent alerts (escalations, held messages) — gm's requirement: the bell must actually
  // focus the node its count is about, so approvals/questionnaires (not per-node) stay exactly
  // as they were above; only this section can offer a "go to node" click.
  const openAgentPanel = useOrchestraStore((s) => s.openAgentPanel);
  const { data: agentsData } = useAgents(); // same query key as every other consumer — shared cache, not a second fetch
  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts(24),
    refetchInterval: 10_000,
  });
  // nodeAlerts requires `now` explicitly (it never reads the clock itself) — read it into
  // state on the same cadence as the alerts refetch rather than calling Date.now() inside a
  // memo body, which React's purity rule (rightly) treats as an impure render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  // Same fleet-membership rule the topology/search page already uses (lib/topologyLines.ts),
  // not a second definition of "visible" — a retired seat like gm-g2 must read as hidden here
  // exactly the way it does everywhere else, or the bell could offer a click the graph can't
  // honour.
  const visibleIds = useMemo(() => {
    const all: { id: string; alive?: boolean; retired_at?: string | null }[] = agentsData?.agents ?? [];
    return new Set(all.filter((a) => isFleetMember(a, all)).map((a) => a.id));
  }, [agentsData]);

  const alerts = useMemo(
    () => nodeAlerts(alertsData?.messages ?? [], visibleIds, { now, windowHours: 24 }),
    [alertsData, visibleIds, now],
  );

  const escalateEntries = useMemo(
    () => Object.entries(alerts.byNode)
      .filter(([, c]) => c.escalate > 0)
      .map(([id, c]) => ({ id, count: c.escalate }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
    [alerts],
  );
  // Held messages get their own section ONLY when there is real signal on a VISIBLE node —
  // measured live the day this shipped, 6 of 7 all-time held_message rows belonged to one
  // retired seat (gm-g2) and only one visible node (reflect) had any. A section that is
  // almost always empty is worse than no section; this recomputes from live data every render
  // rather than hardcoding "today's" thinness, so it appears/disappears honestly as it changes.
  const heldEntries = useMemo(
    () => Object.entries(alerts.byNode)
      .filter(([, c]) => c.held > 0)
      .map(([id, c]) => ({ id, count: c.held }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
    [alerts],
  );
  const hiddenTotal = alerts.hidden.escalate + alerts.hidden.held;
  const visibleAlertTotal = escalateEntries.reduce((n, e) => n + e.count, 0)
    + heldEntries.reduce((n, e) => n + e.count, 0);
  // What the Inbox page actually shows — used for the "View all in Inbox" footer link below.
  // Escalations/held messages are NOT in the Inbox (they live on the graph), so they must not
  // make that link appear promising something it cannot deliver.
  const inboxPending = pendingApprovals + pendingQuestionnaires + (needsAuth ? 1 : 0);
  // The badge counts the FULL honest total, including alerts on hidden/retired nodes (spec §2:
  // nothing important is hidden) — the dropdown below still only offers a click on what can
  // actually be reached, with one explicit non-navigable line for the rest (see render below).
  const totalPending = inboxPending + visibleAlertTotal + hiddenTotal;

  // Navigate to the agent view, select the node (single source of truth: the store's own
  // selection, not a second one), then scroll its box into view once it exists in the DOM.
  // data-agent-id is on both the agent cards and the topology node boxes, so this works
  // whichever view mode Agents.tsx happens to be in. Polls briefly via rAF rather than a fixed
  // timeout, since this component has no lifecycle hook into the destination page's mount.
  const goToAgent = useCallback((id: string) => {
    openAgentPanel(id);
    navigate('/agents');
    setDropdownOpen(false);
    const deadline = Date.now() + 2000;
    const tryScroll = () => {
      const el = document.querySelector(`[data-agent-id="${CSS.escape(id)}"]`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (Date.now() < deadline) requestAnimationFrame(tryScroll);
    };
    requestAnimationFrame(tryScroll);
  }, [navigate, openAgentPanel]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative p-1.5 text-neutral-400 hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {totalPending > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full bg-red-500 text-white border-2 border-neutral-950 px-1">
              {totalPending}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <span className="text-sm font-semibold text-white">Notifications</span>
              <button onClick={() => setDropdownOpen(false)} className="text-neutral-500 hover:text-neutral-300">
                <X size={14} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {totalPending === 0 && (
                <p className="px-4 py-6 text-sm text-neutral-500 text-center">All clear</p>
              )}

              {pendingApprovals > 0 && (
                <button
                  onClick={() => { navigate('/inbox'); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3"
                >
                  <div className="p-1.5 rounded-lg bg-violet-500/15">
                    <ShieldCheck size={14} className="text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-neutral-200">{pendingApprovals} pending approval{pendingApprovals !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-neutral-500">Review in Inbox</p>
                  </div>
                  <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingApprovals}</span>
                </button>
              )}

              {pendingQuestionnaires > 0 && (
                <button
                  onClick={() => { navigate('/inbox'); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3"
                >
                  <div className="p-1.5 rounded-lg bg-amber-500/15">
                    <ClipboardList size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-neutral-200">{pendingQuestionnaires} questionnaire{pendingQuestionnaires !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-neutral-500">Needs your input</p>
                  </div>
                  <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingQuestionnaires}</span>
                </button>
              )}

              {escalateEntries.length > 0 && (
                <div className="border-t border-neutral-800/60">
                  <p className="px-4 pt-2.5 pb-1 text-[11px] uppercase tracking-wider text-neutral-500">Escalations · 24h</p>
                  {escalateEntries.map(({ id, count }) => (
                    <button
                      key={`escalate-${id}`}
                      onClick={() => goToAgent(id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-neutral-800 transition-colors flex items-center gap-3"
                    >
                      <div className="p-1.5 rounded-lg bg-red-500/15 shrink-0">
                        <AlertTriangle size={14} className="text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200 truncate">{id}</p>
                        <p className="text-xs text-neutral-500">Go to node</p>
                      </div>
                      <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">{count}</span>
                    </button>
                  ))}
                </div>
              )}

              {heldEntries.length > 0 && (
                <div className="border-t border-neutral-800/60">
                  <p className="px-4 pt-2.5 pb-1 text-[11px] uppercase tracking-wider text-neutral-500">Held messages · 24h</p>
                  {heldEntries.map(({ id, count }) => (
                    <button
                      key={`held-${id}`}
                      onClick={() => goToAgent(id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-neutral-800 transition-colors flex items-center gap-3"
                    >
                      <div className="p-1.5 rounded-lg bg-orange-500/15 shrink-0">
                        <Clock size={14} className="text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200 truncate">{id}</p>
                        <p className="text-xs text-neutral-500">Go to node</p>
                      </div>
                      <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">{count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Honest, non-navigable: alerts real but their node is retired/hidden — a click
                  here would go nowhere, so this is text only, never a button (spec §2: nothing
                  important is hidden — the count stays true, it just can't be clicked). */}
              {hiddenTotal > 0 && (
                <div className="border-t border-neutral-800/60 px-4 py-2.5">
                  <p className="text-xs text-neutral-500">{hiddenTotal} more on retired seats</p>
                </div>
              )}

              {needsAuth && (
                <button
                  onClick={() => { setAuthOpen(true); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors flex items-center gap-3"
                >
                  <div className="p-1.5 rounded-lg bg-red-500/15">
                    <Bell size={14} className="text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-neutral-200">Auth required</p>
                    <p className="text-xs text-neutral-500">GM needs login</p>
                  </div>
                </button>
              )}
            </div>

            {inboxPending > 0 && (
              <div className="border-t border-neutral-800 px-4 py-2.5">
                <button
                  onClick={() => { navigate('/inbox'); setDropdownOpen(false); }}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                >
                  View all in Inbox &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <AuthFlow onClose={() => setAuthOpen(false)} />
        </div>
      )}
    </>
  );
}
