# Toddito security remainder: SEC-05/07/09 + residual SEC-03/08

- **Requested by:** operator, via gm (`msg_a894361f_65032933`) — patch the
  full `docs/SECURITY.md` list, not just what PR #1 happens to cover. Real
  fixes, not documented residuals.
- **Sequencing:** SEC-03/08 touch the same files PR #1 is rebasing
  (`elevenlabs-config/route.ts`, `webhooks/elevenlabs/route.ts`) — do those
  AFTER PR #1 lands, to avoid a second collision on the same files. SEC-05,
  SEC-07, SEC-09 touch different files entirely and can start now, in
  parallel with PR #1's rebase.

## SEC-09 — drop the `?token=` query param (ready now, no open questions)

`src/middleware.ts`: for non-API routes, the admin-token lookup falls back to
`req.nextUrl.searchParams.get("token")`. Confirmed safe to remove outright,
not just theoretically:
- `/api/admin/auth` (`src/app/api/admin/auth/route.ts`) already sets a proper
  `httpOnly` `admin_token` cookie on successful login — the query-param
  path isn't load-bearing for the real login flow.
- Repo-wide grep for other `?token=` construction found only the unrelated
  per-session `resume_token` mechanism (`elevenlabs-config/route.ts`) —
  different token, different purpose, no collision.
- **Fix:** delete the query-param branch of the ternary; non-API routes rely
  on the cookie only, same as the code already does when cookies are
  present. No frontend changes needed — nothing in `src/` currently
  constructs an admin link with `?token=`.

## SEC-05 — fail closed when the webhook secret is unset (ready now)

`src/app/api/webhooks/elevenlabs/route.ts:91-112`: `if (secret) {...verify...}
else { console.warn(...) }` — falls through and processes the request
UNVERIFIED when `ELEVENLABS_WEBHOOK_SECRET` is unset. Per SECURITY.md's own
remediation: fail closed (401/500) in production; gate the unsigned fallback
to `NODE_ENV !== 'production'` only. Concretely: the `else` branch should
return a 401 (mirroring the bad-signature branch's own `recordWebhookEvent`
+ 401 pattern) when `process.env.NODE_ENV === 'production'`, and only warn-
and-continue otherwise (local dev without a configured secret).

## SEC-07 — checked directly, does NOT appear to actually be open

SECURITY.md: "Report renderer / CitationText must treat parsed transcript
content as text, not HTML (stored XSS via spoken `<script>`/markdown)."
Read `CitationText.tsx` directly (confirmed identical on `origin/main`, not
a stale local copy): it renders via plain JSX string interpolation
(`{p.value}`, `{text}`) — no `dangerouslySetInnerHTML`, no markdown parser.
**Repo-wide grep for `dangerouslySetInnerHTML`/`react-markdown`/`ReactMarkdown`
across all of `src/` returns zero hits.** React escapes JSX text
interpolation by default, so absent either of those, there is no HTML-
injection vector anywhere in the report rendering path, regardless of which
specific component renders which LLM-generated field.

**This is a surprising result, flagged rather than quietly closed out** —
the same shape of surprise this session already hit once on the CSO finding
(a flagged item that turned out to already be fine). Recommend one
independent pass confirming this before editing SECURITY.md to mark it
resolved, the same corroboration bar CSO got (two people, not one, before
calling a finding a non-issue) — but as of this check, there's no code for
anyone to "fix."

## SEC-08 — full fix, not just the "partial" PR #1 covers (after PR #1 lands)

PR #1's commit is explicitly labeled "SEC-08 partial." This session's own
prior work (builder-2) already found the full exploit chain with exact
locations, not just the missing `status === 'scored'` guard:
- `src/hooks/useElevenLabsSession.ts:113-115` passes
  `dynamicVariables.session_id` to the public ElevenLabs browser SDK —
  entirely attacker-writable client-side.
- `elevenlabs-config/route.ts:129-139` never pins a server-side
  `conversation_id`/`session_id` pair when minting the signed URL.
- `webhooks/elevenlabs/route.ts:136-153` does an unguarded
  `sessions.id = sessionIdFromPayload` lookup with no cross-check against
  `conversation_id`, then (:275-298) unconditionally sets
  `status='completed'` and scores attacker-supplied transcript content.
- `persist.ts:84,89` deletes then inserts the reports row unconditionally.

**Real fix needs all of:** pin the real `conversation_id` server-side at
signed-URL-mint time (store it against the session row), cross-check it on
webhook receipt before trusting the payload's `session_id`, and add the
`status === 'scored'` guard PR #1's partial commit already covers. Do this
as its own pass after PR #1 lands — it's editing the exact same two route
files PR #1's rebase is touching; stacking it on top avoids a second
conflict against the same lines.

## SEC-03 residual — the 6-field PII leak, real open design question (after PR #1 lands)

`elevenlabs-config/route.ts` returns `client_org`, `client_name`,
`respondent_role`, `org_type`, `org_industry`, `org_employee_range` in a
public, unauthenticated JSON response. PR #1's own commit message says this
"cannot be stripped today without a bigger architecture change" — **not
resolved by this plan, a real open question, not guessed past:** which of
these 6 fields does the BROWSER actually need to render the pre-call UI
(greeting, personalization), versus which only need to reach the ElevenLabs
agent itself server-side (which could receive them via a server-to-server
call when minting the signed URL, never echoed to the client at all)?
Whoever picks this up should check the actual frontend consumer
(`useElevenLabsSession.ts` / the session page) field-by-field before
proposing a strip list — don't assume all 6 are necessary just because
they're all returned today.

## What to tell gm / the operator

SEC-09 and SEC-05 are small, scoped, ready to dispatch now with no open
questions. SEC-07 appears to already be a non-issue on direct inspection —
recommending independent corroboration before marking it closed in
SECURITY.md, not a fix. SEC-08's full fix and SEC-03's residual both need to
land after PR #1 (same files, avoids a double-conflict) — SEC-03 also has a
real, unresolved design question (which fields the client genuinely needs)
that shouldn't be guessed past.
