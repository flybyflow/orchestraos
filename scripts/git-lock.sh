#!/usr/bin/env bash
# git-lock.sh — serialize git writes across seats sharing this checkout.
# Usage:
#   scripts/git-lock.sh git add <files>
#   scripts/git-lock.sh bash -c 'git add <files> && git commit -m "..."'
# Wrap your FULL add+commit sequence in one call (via `bash -c`) — calling
# add and commit as two separate invocations still leaves a race window
# between them. See scripts/git_lock.py for why this exists.
exec python3 "$(dirname "${BASH_SOURCE[0]}")/git_lock.py" -- "$@"
