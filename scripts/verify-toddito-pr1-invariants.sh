#!/bin/bash
# Post-merge invariants for toddito PR #1 (fix/report-tone-language).
#
# WHY THIS EXISTS. PR #1's rebase crosses three other PRs, and in four places
# a *clean merge* does not prove the right thing happened -- taking one side
# wholesale silently reverts a good fix, and the regression is invisible to the
# existing tests. Named by review and gm:
#
#   ReportView.tsx index="05"  PR #1 changes the kicker, PR #9 changes the title
#                              of the SAME line. Correct result carries BOTH.
#   score/route.ts             PR #13 is a strict SUBSET of PR #1 (guard only,
#                              no SEC-06 rate limit). Taking PR #13's side drops
#                              the rate limit while keeping the auth -- invisible
#                              to any test that only checks for a 401.
#   dashboard/route.ts         main LOST PR #1's MAX_PAGE_SIZE clamp.
#   engagements/route.ts       PR #1's GET has NO guard at all; main guards both
#                              handlers. Taking PR #1 ships an unauthenticated
#                              cross-tenant listing including session ids.
#
# Run from the PR #1 worktree AFTER re-merging against whatever main actually
# contains. Verified to FAIL when an invariant is broken (reverting
# score/route.ts to main's version produces 2 FAILs), so a pass means something.
# Exit non-zero on any failure.
fail=0
chk() { # chk <description> <file> <pattern>
  if git show ":$2" 2>/dev/null | grep -qF "$3"; then
    printf "  PASS  %s\n" "$1"
  else
    printf "  FAIL  %s\n          expected in %s: %s\n" "$1" "$2" "$3"; fail=1
  fi
}

echo "COLLISION 1 -- ReportView index=05 must carry BOTH attributes"
echo "  (only applicable once PR #9 has landed; before that the title is main's)"
chk "PR #1's kicker survived"        "src/components/report/ReportView.tsx" 'kicker="What stood out"'
if git show origin/main:src/components/report/ReportView.tsx 2>/dev/null | grep -q 'title="Observations worth saying out loud"'; then
  chk "PR #9's title survived"       "src/components/report/ReportView.tsx" 'title="Observations worth saying out loud"'
else
  echo "  SKIP  PR #9 not in main yet -- re-run after it lands"
fi
chk "PR #1's 06 kicker survived"     "src/components/report/ReportView.tsx" 'kicker="Worth your attention"'

echo "COLLISION 2 -- score/route.ts must have BOTH the guard AND the rate limit"
chk "SEC-02 guard present"           "src/app/api/sessions/[id]/score/route.ts" "requireAdminToken(req)"
chk "SEC-06 rate limit present"      "src/app/api/sessions/[id]/score/route.ts" "rateLimit("
chk "no stale _req signature"        "src/app/api/sessions/[id]/score/route.ts" "req: NextRequest"

echo "OTHER RESOLUTIONS THAT A CLEAN MERGE WOULD NOT PROVE"
chk "dashboard limit clamp kept"     "src/app/api/dashboard/route.ts" "MAX_PAGE_SIZE"
chk "StageCurve crash guard kept"    "src/components/report/StageCurve.tsx" "if (!primaryPt) return null"
chk "engagements GET is guarded"     "src/app/api/engagements/route.ts" "requireWorkspaceAccount(req)"
chk "score.ts prose-reply path kept" "src/lib/scoring/score.ts" "replied in prose"

echo "SEC-01 SPLIT -- the validator comes OUT, the key normaliser must NOT go with it"
# gm approved splitting the SEC-01 zod validator out of PR #1 entirely (its
# schemas had drifted behind main's ScoringResult in three places). But validate.ts
# held TWO things, and only one of them was the validator: normaliseObservationKey
# maps the wire key `key_observations` (which prompt.ts, STILL IN THIS PR, asks the
# model for) onto the storage name `clinical_observations`. Delete it along with the
# validator and tsc stays clean -- the cast is unchecked -- while persist.ts:110
# writes null on every new report and ReportView's `.length > 0` guard hides
# section 05. So: validator absent, normaliser present AND called.
if git show ":src/lib/scoring/validate.ts" >/dev/null 2>&1; then
  printf "  FAIL  validate.ts must be gone (SEC-01 split out per gm)\n"; fail=1
else
  printf "  PASS  validate.ts removed (SEC-01 split out per gm)\n"
fi
chk "normaliser kept, not deleted with it" "src/lib/scoring/contract.ts" "normaliseObservationKey"
chk "normaliser WIRED at the call site"    "src/lib/scoring/score.ts" "normaliseObservationKey(parsed)"
chk "old wire key still accepted"          "src/lib/scoring/contract.ts" "clinical_observations ?? key_observations"
chk "removal documented for the next PR"   "docs/SCORING.md" "SEC-01 output validator is not in this PR"

echo "package.json -- the one file where a side-pick passes every local check"
# This one bit. The merge took PR #1's package.json wholesale, which is 9 days
# older than main's in five ways it was never meant to change: it drops vitest +
# @vitest/coverage-v8, deletes the test/test:coverage/type-check scripts main's
# own ci.yml invokes, drops @vercel/analytics (imported by main's layout.tsx,
# EmailGate.tsx and PrePhase.tsx), drops livekit-client, drops the `overrides`
# pins, and re-adds @vapi-ai/web. Local tsc and vitest BOTH stayed green because
# node_modules was a hardlink copy that still had main's packages installed --
# the manifest regression is invisible until `npm ci` runs on CI.
# 02cff01's package.json change is exactly two lines. Anything more is a revert.
n=$(git diff --cached origin/main -- package.json | grep -cE '^[-+][^-+]')
if [ "$n" = "4" ]; then
  printf "  PASS  package.json is main + 02cff01's 2 lines, nothing else\n"
else
  printf "  FAIL  package.json diverges from main on %s lines, expected 4 (02cff01's 2)\n" "$n"; fail=1
fi
chk "next 16.3.7 (02cff01)"            "package.json" '"next": "16.3.7"'
chk "plotly 4 (02cff01)"               "package.json" '"plotly.js": "^4.1.1"'
chk "vitest devDep kept"               "package.json" '"vitest"'
chk "test:coverage script kept (ci.yml:48 runs it)" "package.json" '"test:coverage"'
chk "type-check script kept (ci.yml:34 runs it)"    "package.json" '"type-check"'
chk "@vercel/analytics kept (3 src importers)"      "package.json" '"@vercel/analytics"'
chk "audit overrides pins kept"        "package.json" '"overrides"'
if git show ":package.json" | grep -q "vapi"; then
  printf "  FAIL  vapi deps must be gone (main migrated to livekit)\n"; fail=1
else
  printf "  PASS  no vapi deps (main migrated to livekit)\n"
fi

echo "prompt.ts -- PR #1 and PR #9 BOTH contribute; a side-pick drops one silently"
chk "PR#9 OUTPUT VOLUME section kept"  "src/lib/scoring/prompt.ts" "OUTPUT VOLUME"
chk "PR#9 variable-length note kept"   "src/lib/scoring/prompt.ts" "3 to 6"
chk "PR#1 PLAIN-LANGUAGE RULE kept"    "src/lib/scoring/prompt.ts" "PLAIN-LANGUAGE RULE"
chk "PR#1 key_observations rename kept" "src/lib/scoring/prompt.ts" "key_observations"
# PR #1's whole purpose: the prompt must stop telling the model to sound clinical
if git show ":src/lib/scoring/prompt.ts" 2>/dev/null | grep -q "TONE: Clinical"; then
  printf "  FAIL  PR#1 removed 'TONE: Clinical'\n          still present in src/lib/scoring/prompt.ts\n"; fail=1
else
  printf "  PASS  PR#1 removed 'TONE: Clinical'\n"
fi

echo "ReportView -- all THREE kicker sites, not just the two in the 05 block"
chk "skeleton kicker renamed (line ~244)" "src/components/report/ReportView.tsx" 'kicker="05 · What stood out"'
chk "PR#9 guard comment kept"             "src/components/report/ReportView.tsx" "empty array is truthy"
# demo/page.tsx: gm and plan both ruled the 4 hunks are STRIPPED from PR #1
# (msg: "drop demo/page.tsx hunks regardless of correctness"), so it must match
# main exactly. Asserting the strip, not the rename -- the opposite of what an
# earlier revision of this script checked.
if git diff --cached origin/main -- src/app/report/demo/page.tsx | grep -q .; then
  printf "  FAIL  demo/page.tsx must match main (hunks stripped per ruling)\n"; fail=1
else
  printf "  PASS  demo/page.tsx matches main (hunks stripped per ruling)\n"
fi

echo
[ $fail -eq 0 ] && echo "ALL INVARIANTS HOLD" || echo "INVARIANTS VIOLATED -- do not land"
exit $fail
