#!/usr/bin/env bash
# Confirm that what the proxy is SERVING matches the stamp we just wrote.
#
# Why this is automatic rather than a step in a runbook (review's argument, 2026-09-30, and it
# is the right one): a check whose answer is almost always "fine" trains you out of running it.
# Every served-vs-HEAD mismatch tonight but one resolved to docs-only drift, and the single time
# the delta was real code was the time nobody had asked for the check. Relying on a person to
# keep running something boring 90% of the time is the same bet as relying on a green that
# cannot fail.
#
# Three outcomes, all printed explicitly. That matters: the failure mode this whole evening kept
# producing was a check whose SILENCE got read as a pass, so "could not verify" must never look
# like "verified".
set -u
PORT="${ORCHESTRA_DASHBOARD_PORT:-8891}"
STAMP_FILE="$(dirname "$0")/../dist/BUILD_SHA"

[ -r "$STAMP_FILE" ] || { echo "verify-deploy: NO STAMP at $STAMP_FILE — build:live should have written one"; exit 1; }
WROTE="$(cat "$STAMP_FILE")"

# Plain -s, deliberately not -sf: a missing stamp is served by the SPA fallback as 200 + HTML,
# so -f would pass on it. We compare the BODY.
SERVED="$(curl -s --max-time 3 "http://127.0.0.1:${PORT}/BUILD_SHA" 2>/dev/null || true)"

if [ -z "$SERVED" ]; then
  echo "verify-deploy: COULD NOT VERIFY — nothing answered on :${PORT} (proxy down?). Stamp written: ${WROTE}"
  exit 0                      # not a build failure; a dev box or CI legitimately has no proxy
fi

case "$SERVED" in
  "$WROTE")
    echo "verify-deploy: OK — serving ${SERVED}" ;;
  *'<!doctype'*|*'<html'*)
    echo "verify-deploy: MISMATCH — :${PORT} returned HTML, not a stamp. dist/BUILD_SHA is missing"
    echo "                from what is being served; something wrote dist without stamping it"
    echo "                (a bare 'npx vite build' does this). Wrote: ${WROTE}"
    exit 1 ;;
  *)
    echo "verify-deploy: MISMATCH — wrote ${WROTE} but :${PORT} is serving ${SERVED}"
    echo "                the proxy may be serving a different dist than the one just built"
    exit 1 ;;
esac
