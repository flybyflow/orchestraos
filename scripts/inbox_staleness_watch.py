#!/usr/bin/env python3
"""inbox_staleness_watch.py — nudge idle agents sitting on unread inbox mail.

    python3 scripts/inbox_staleness_watch.py            # one tick
    python3 scripts/inbox_staleness_watch.py --loop      # tick every --interval-min forever
    python3 scripts/inbox_staleness_watch.py --dry-run   # classify + print, nudge nothing

Why (gm, 2026-10-08): idle fleet agents don't automatically poll msg_store for new mail.
A critical process correction sat undelivered in build's queue while build kept working
under stale instructions -- that's how PR #8 got self-merged. A seat with status='pending'
mail older than --threshold-min, whose tmux pane is genuinely idle (not mid-turn), gets a
one-line nudge via nudge_pane.py so the runtime actually reads its inbox.

Never nudges a working/thinking/stalled pane (that's a different, already-handled failure
mode -- see red_alert_watch.py) and never re-nudges the same agent inside --cooldown-min, so
a stuck agent gets reminded periodically rather than spammed every tick.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.environ.get("ORCHESTRA_ROOT") or os.path.dirname(HERE)
ORCH = os.environ.get("ORCHESTRA_DIR") or os.path.expanduser("~/.orchestra")
REGISTRY = os.path.join(ORCH, "registry.json")
STATE_DIR = os.path.join(ORCH, "state", "inbox-staleness")
LAST_NUDGE_PATH = os.path.join(STATE_DIR, "last_nudge.json")

DEAD_STATUSES = {"retired", "parked"}  # superseded lineages -- never a live pane

_ENV = dict(os.environ, PYTHONPATH=REPO_ROOT)


def _run(args, timeout=20):
    return subprocess.run(args, cwd=REPO_ROOT, env=_ENV, capture_output=True,
                           text=True, timeout=timeout)


def _load_registry():
    with open(REGISTRY) as f:
        return json.load(f).get("agents", {})


def _load_last_nudge():
    try:
        with open(LAST_NUDGE_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_last_nudge(d):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(LAST_NUDGE_PATH, "w") as f:
        json.dump(d, f, indent=2)


def oldest_pending_age_s(agent: str, now: datetime):
    """(count, age_s of oldest pending message) for agent's inbox, or (0, None)."""
    r = _run(["python3", "msg_store.py", "inbox", "--agent", agent,
              "--status", "pending", "--limit", "50"])
    if r.returncode != 0:
        return 0, None
    try:
        msgs = json.loads(r.stdout)["messages"]
    except (json.JSONDecodeError, KeyError):
        return 0, None
    if not msgs:
        return 0, None
    oldest = min(datetime.fromisoformat(m["created_at"]) for m in msgs)
    return len(msgs), (now - oldest).total_seconds()


def pane_state(session: str) -> str:
    """agent-status.py's state field, or 'unknown' on any failure (fail-closed: never nudge)."""
    r = _run(["python3", "scripts/agent-status.py", session])
    if r.returncode != 0:
        return "unknown"
    try:
        return json.loads(r.stdout).get("state", "unknown")
    except json.JSONDecodeError:
        return "unknown"


def tick(threshold_s: int, cooldown_s: int, dry_run: bool) -> int:
    now = datetime.now(timezone.utc)
    last_nudge = _load_last_nudge()
    nudged = 0
    for name, info in _load_registry().items():
        if info.get("status") in DEAD_STATUSES or not info.get("runtime"):
            continue
        session = info.get("tmux_session") or name
        count, age_s = oldest_pending_age_s(name, now)
        if age_s is None or age_s < threshold_s:
            continue
        since_last = now.timestamp() - last_nudge.get(name, 0)
        if since_last < cooldown_s:
            continue
        state = pane_state(session)
        if state != "idle":
            continue
        text = f"you have {count} pending inbox messages, please check"
        if dry_run:
            print(f"[dry-run] would nudge {session}: {text} (oldest {int(age_s // 60)}m old)")
            continue
        r = subprocess.run(["python3", "scripts/nudge_pane.py", session, text],
                            cwd=REPO_ROOT, capture_output=True, text=True)
        if r.returncode == 0:
            last_nudge[name] = now.timestamp()
            nudged += 1
            print(f"nudged {session}: {text} (oldest {int(age_s // 60)}m old)")
        else:
            print(f"nudge FAILED for {session}: {r.stderr.strip()}", file=sys.stderr)
    if not dry_run:
        _save_last_nudge(last_nudge)
    return nudged


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--threshold-min", type=float, default=15,
                     help="pending mail older than this is stale (default 15)")
    ap.add_argument("--cooldown-min", type=float, default=15,
                     help="minimum minutes between repeat nudges of the same agent (default 15)")
    ap.add_argument("--interval-min", type=float, default=5,
                     help="with --loop, minutes between ticks (default 5)")
    ap.add_argument("--loop", action="store_true", help="run forever instead of one tick")
    ap.add_argument("--dry-run", action="store_true", help="classify and print, nudge nothing")
    ns = ap.parse_args(argv)

    threshold_s = ns.threshold_min * 60
    cooldown_s = ns.cooldown_min * 60
    if not ns.loop:
        tick(threshold_s, cooldown_s, ns.dry_run)
        return 0
    while True:
        tick(threshold_s, cooldown_s, ns.dry_run)
        time.sleep(ns.interval_min * 60)


if __name__ == "__main__":
    sys.exit(main())
