#!/usr/bin/env python3
"""fanin_metric.py — measure GM fan-in load (F5 success signal for the topology fix).

The scaling fix (Part A) routes worker reports through leads/ea instead of straight
to the GM. This measures whether that actually cut the GM's inbound volume. Run it
before the prompt change (baseline) and after (compare).

Usage: python3 scripts/fanin_metric.py [--hours N]  (default 6)
Reads ~/.orchestra/state/tasks.db (or $ORCHESTRA_DIR/state/tasks.db).
"""
import os, sqlite3, sys, json

def _db():
    d = os.environ.get("ORCHESTRA_DIR") or os.path.expanduser("~/.orchestra")
    return os.path.join(d, "state", "tasks.db")

def measure(hours=6):
    con = sqlite3.connect(_db())
    win = f"-{hours} hours"
    # GM inbound: every message addressed to gm in the window
    total = con.execute(
        "SELECT COUNT(*) FROM messages WHERE to_agent='gm' "
        "AND datetime(created_at) > datetime('now', ?)", (win,)).fetchone()[0]
    per_hour = round(total / hours, 1) if hours else total
    # by sender — who floods the GM (the fan-in shape)
    by_sender = con.execute(
        "SELECT from_agent, COUNT(*) c FROM messages WHERE to_agent='gm' "
        "AND datetime(created_at) > datetime('now', ?) GROUP BY from_agent "
        "ORDER BY c DESC", (win,)).fetchall()
    # how much is raw pipeline chatter (leads/workers) vs operator/ea
    fleet = {"plan","build","review","think","brain","bshr","builder-1","builder-2",
             "test","ship","reflect"}
    fleet_reports = sum(c for s, c in by_sender if s in fleet)
    con.close()
    return {
        "window_hours": hours,
        "gm_inbound_total": total,
        "gm_inbound_per_hour": per_hour,
        "fleet_raw_reports": fleet_reports,   # the number Part A should shrink
        "by_sender": {s: c for s, c in by_sender},
    }

if __name__ == "__main__":
    hours = 6
    if "--hours" in sys.argv:
        hours = int(sys.argv[sys.argv.index("--hours") + 1])
    print(json.dumps(measure(hours), indent=2))

# ponytail: msgs/hour is the cheap proxy for GM load; context-fill-rate needs the
# Part-B signal fix first, add it there once decide() sees live context.
