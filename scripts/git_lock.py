#!/usr/bin/env python3
"""git_lock.py — serialize git writes across seats sharing one working tree.

orchestraos runs plan/build/review/ea (and others) in the SAME checkout, no
per-seat worktree. `git add`+`git commit` from two seats at once can race: one
seat's commit sweeps up files another seat staged (hit live 2026-09-29,
gm decision: flock wrapper instead of per-seat worktrees for now). Wrap your
FULL add+commit sequence in one call instead of running git raw:

    python3 scripts/git_lock.py -- git add <files>
    python3 scripts/git_lock.py -- bash -c 'git add <files> && git commit -m "..."'

Calling add and commit as two separate git_lock.py invocations still leaves a
race window between them — always combine them into one command (via `bash -c`)
when both are needed.

Uses fcntl.flock on a lock file next to .git — same primitive as
registry_lock.py, already proven on this platform. The lock is held for the
child's whole lifetime because the fd stays open across exec.
"""
import fcntl
import os
import subprocess
import sys
import time

TIMEOUT_S = 30


def git_dir():
    # --absolute-git-dir, not --show-toplevel + ".git": in a worktree, <toplevel>/.git
    # is a FILE (a gitdir pointer), not a directory, so joining onto it crashes. This
    # resolves to the real per-worktree git dir (e.g. <repo>/.git/worktrees/<name>),
    # which is always a directory. Found live by build 2026-09-30 in /tmp/pr137-fix.
    out = subprocess.run(
        ["git", "rev-parse", "--absolute-git-dir"],
        capture_output=True, text=True, check=True)
    return out.stdout.strip()


def main(argv):
    args = argv[1:]
    if args and args[0] == "--":
        args = args[1:]
    if not args:
        print("usage: git_lock.py -- <command...>", file=sys.stderr)
        return 2

    lock_path = os.path.join(git_dir(), "seat-write.lock")
    fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o644)
    deadline = time.monotonic() + TIMEOUT_S
    while True:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            break
        except OSError:
            if time.monotonic() >= deadline:
                print(f"git_lock: held by another seat for {TIMEOUT_S}s+, "
                      "proceeding anyway (assume stale)", file=sys.stderr)
                break
            time.sleep(0.1)
    try:
        return subprocess.run(args).returncode
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        except OSError:
            pass
        os.close(fd)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
