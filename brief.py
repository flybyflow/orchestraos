#!/usr/bin/env python3
"""Send brief status updates to the operator via Telegram."""
import json
import os
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent))
from plugins.telegram.tg_send import send_text  # noqa: E402

ORCHESTRA_DIR = Path(os.environ.get("ORCHESTRA_DIR") or Path(__file__).resolve().parent)
ACTIVITY_FILE = ORCHESTRA_DIR / "activity.jsonl"


def send_brief(agent_id: str, stage: str, message: str):
    """Send a brief to the operator via Telegram.

    stage: 'ack' | 'checkpoint' | 'result' | 'blocker'
    """
    icons = {"ack": "\U0001f4cb", "checkpoint": "\U0001f504", "result": "✅", "blocker": "\U0001f6ab"}
    icon = icons.get(stage, "\U0001f4cc")

    text = f"{icon} *{agent_id}* — {stage}\n{message}"

    # tg_send resolves the remembered operator chat itself (the same path gm's Telegram
    # replies already use successfully) instead of a separate, unconfigured env-var
    # scheme. It prints its own reason to stderr on failure.
    ok = send_text(text)

    # Log to activity BEFORE returning, always -- a brief that delivered nothing must
    # never look identical to one that succeeded (2026-09-30, gm/build finding: this
    # used to return False before writing here at all, so failures left zero trace).
    try:
        entry = json.dumps({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "agent": agent_id,
            "event": f"brief_{stage}",
            "detail": message[:200],
            "delivered": ok,
        })
        with open(ACTIVITY_FILE, "a") as f:
            f.write(entry + "\n")
    except Exception as e:
        print(f"brief.py: activity log write failed: {e}", file=sys.stderr)

    if not ok:
        print(f"brief.py: delivery FAILED for {agent_id}/{stage} -- see tg_send error above", file=sys.stderr)

    return ok


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 brief.py <agent-id> <stage> <message>")
        print("  stage: ack | checkpoint | result | blocker")
        sys.exit(1)
    ok = send_brief(sys.argv[1], sys.argv[2], " ".join(sys.argv[3:]))
    sys.exit(0 if ok else 1)
