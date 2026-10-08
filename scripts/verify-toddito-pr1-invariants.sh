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
chk "score.ts SEC-01 validation kept" "src/lib/scoring/score.ts" "validateScoringResult"

echo
[ $fail -eq 0 ] && echo "ALL INVARIANTS HOLD" || echo "INVARIANTS VIOLATED -- do not land"
exit $fail
