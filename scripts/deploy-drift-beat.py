#!/usr/bin/env python3
"""Notice a commit that nobody deployed.

WHY THIS EXISTS, and what it is NOT. `dashboard`'s `build:live` verifies its own deploy: it
stamps `dist/BUILD_SHA` from HEAD and then confirms the proxy is serving that stamp. That
covers "did my deploy land". It cannot cover "is there a commit nobody deployed", because it
only runs when someone runs it — which was exactly the 2026-09-30 case: the stamp said
f2eb883, the proxy served f2eb883, they MATCHED, and HEAD was a real-code commit ahead of
both. The self-check would have printed OK and been right. Nobody ran it, because nobody
deployed. (review's scoping, and it is correct.)

That half is a heartbeat, not a build step. Two design constraints, both load-bearing:

1. DOCS-ONLY DRIFT MUST BE SILENT. Almost every served-vs-HEAD mismatch is a docs or baton
   commit and materially irrelevant. An alert that cries wolf on those gets muted within a day,
   and then it is worse than nothing — the same trap as a check whose answer is always "fine".
   So it alerts only when the delta touches real build inputs.
2. IT MUST NOT REPEAT ITSELF. A beat that re-alerts on the same drift every interval is noise.
   It records the (served, head) pair it last reported and stays quiet until that changes.

`--dry-run` prints the verdict and sends nothing, so the alert path is testable without
putting a fabricated drift notice in gm's inbox.

Exit codes: 0 = nothing to say (in sync, docs-only, already reported, or could not check).
Never nonzero for drift — this informs, it does not gate. Only a genuine internal error is
nonzero, so a broken beat is distinguishable from a quiet one.
"""
from __future__ import annotations
import json, os, subprocess, sys, urllib.request, urllib.error
from pathlib import Path

# Paths under these prefixes change what actually runs; anything else is docs/config noise.
BUILD_INPUT_PREFIXES = ("dashboard/src/", "dashboard/package.json", "dashboard/index.html",
                        "dashboard/vite.config", "api/src/", "api/package.json")
ROOT = Path(__file__).resolve().parent.parent
STATE = Path(os.environ.get("ORCHESTRA_DIR", Path.home() / ".orchestra")) / "state" / "deploy-drift.json"


def _git(*args: str) -> str | None:
    """Run git in the repo; None on any failure. Never 2>/dev/null into a value we read as data —
    a failure returns None and is handled, not silently treated as empty output."""
    try:
        out = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout.strip() if out.returncode == 0 else None


def served_sha(port: int) -> str | None:
    """The stamp the proxy is actually serving, or None. A missing stamp is answered by the SPA
    fallback with 200 + HTML, so shape-check the body rather than trusting the status."""
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/BUILD_SHA", timeout=3) as r:
            body = r.read(200).decode("utf-8", "replace").strip()
    except (urllib.error.URLError, OSError, ValueError):
        return None
    if not body or "<" in body or len(body.split()) != 1:
        return None                     # HTML fallback or junk: not a stamp
    return body


def main() -> int:
    port = int(os.environ.get("ORCHESTRA_DASHBOARD_PORT", "8891"))
    served = served_sha(port)
    head = _git("rev-parse", "--short", "HEAD")
    if served is None or head is None:
        return 0                        # proxy down or not a repo: nothing to report

    base = served.split("-")[0]         # tolerate a "-dirty" suffix
    if base == head:
        return 0

    # Is the delta real, or docs? An unknown served sha (rebased away, or from another tree)
    # cannot be diffed — report it rather than guessing, since that is genuinely odd.
    if _git("cat-file", "-e", f"{base}^{{commit}}") is None:
        changed, undiffable = [], True
    else:
        names = _git("diff", "--name-only", f"{base}..{head}")
        if names is None:
            return 0
        changed = [p for p in names.splitlines() if p.startswith(BUILD_INPUT_PREFIXES)]
        undiffable = False
    if not changed and not undiffable:
        return 0                        # docs-only drift: deliberately silent

    key = f"{base}->{head}"
    try:
        prev = json.loads(STATE.read_text()).get("last_reported")
    except (OSError, ValueError):
        prev = None
    if prev == key:
        return 0                        # already said this

    detail = ("served sha is not in this repo (rebased away or a different tree)"
              if undiffable else f"{len(changed)} build input(s) changed: " + ", ".join(changed[:6]))
    print(f"deploy-drift: live={served} head={head} — {detail}")
    try:
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps({"last_reported": key, "served": served, "head": head}))
    except OSError:
        pass                            # cannot persist: better to re-report than to crash

    if "--dry-run" in sys.argv:
        print("deploy-drift: --dry-run, not messaging gm")
        return 0
    msg = ROOT / "msg_store.py"
    if msg.exists():
        body = (f"Deploy drift: the dashboard is serving {served} but HEAD is {head}, and the "
                f"delta touches code rather than docs.\n\n{detail}\n\n"
                "Nobody has deployed since that commit landed. `cd dashboard && npm run build:live` "
                "deploys and self-verifies. This beat stays quiet for docs-only drift and will not "
                "repeat itself for this same pair.")
        subprocess.run([sys.executable, str(msg), "send", "--from", "deploy-drift-beat",
                        "--to", "gm", "--type", "escalate", "--priority", "medium",
                        "--subject", f"Deploy drift: live {served} vs HEAD {head} (code, not docs)",
                        "--body", body], cwd=ROOT, capture_output=True, timeout=30)
    return 0


if __name__ == "__main__":
    sys.exit(main())
