# Lee & Associates CRE BDR: swap Twilio/BlueBubbles for Sendivo

- **Supersedes:** `docs/PLAN_lee-associates-agentphone-swap.md` — the operator
  pivoted away from AgentPhone to Sendivo (real, authenticated API docs now at
  `docs/reference/Sendivo_API.md` in `lee-associates-revops`, commit `42bfba1`).
  That doc's research on the Hermes plugin architecture and the 3 original
  code touchpoints carries over directly (re-confirmed below against
  Sendivo's actual shape, not copy-pasted); this doc adds what's genuinely
  different about Sendivo, including **two more required touchpoints this
  seat missed in the AgentPhone pass** (§3) — found now by reading more of
  the codebase while re-verifying against Sendivo's actual API, not because
  Sendivo is uniquely more complex.
- **Scope, per gm, unchanged and not re-litigated:** provider swap only, same
  inbound-BDR behavior, Jason's human-calling phase untouched.

## 0. What's actually different about Sendivo vs. AgentPhone — checked, not assumed to be interchangeable

**Sendivo is SMS/MMS only.** No iMessage, no unified channel auto-selection —
unlike AgentPhone, this is NOT a simplification that collapses two adapters
into one; it's a straight return to a single SMS-shaped transport, structurally
very close to the existing Twilio adapter. That also means **the swap drops
iMessage delivery entirely**, same as it would have stayed on SMS-only if
AgentPhone's SMS leg had also been the fallback for every non-Apple lead —
noting this as a factual property of the choice, not re-opening the decision
gm said not to re-ask.

**Sendivo bakes in 10DLC/A2P compliance machinery as first-class API objects**
(`GET /brands`, `GET /campaigns` with `verification_status`/`status`,
`GET /phone-numbers`) — this is a materially stronger starting position than
either Twilio (which this client already burned) or AgentPhone (whose
compliance story was undocumented). **Still not verified live** — see §4.

**Sendivo tracks AI-vs-human conversation state server-side**
(`ai_enabled`, `ai_stopped_at`, `needs_human`, `awaiting_reply` on every
conversation) and has a dedicated `POST /conversations/{id}/messages`
endpoint that is explicitly a state transition ("permanently stops the AI
Responder for that thread... there is no resume"), not just a send. Neither
Twilio nor AgentPhone had anything like this. This is the one piece of
Sendivo's shape that doesn't map onto "swap the adapter class and move on" —
see §2.

## 1. The 3 touchpoints found for AgentPhone — re-confirmed against Sendivo's actual shape, not assumed to carry over unchanged

Same reasoning, same risk ranking, now grounded in Sendivo specifics:

**1a. `agent/plugins/keonda-tools/adapter.py:189`** — `_handle_send_message`'s
`runner.adapters.get(Platform.SMS)` lookup. Same fix: resolve whatever
platform name the new adapter registers under (e.g. `Platform("sendivo")`).
Unchanged from the AgentPhone finding.

**1b. `agent/plugins/keonda-tools/bdr_send.py`'s `_GATED_ADAPTERS` — still the
highest-risk item, full stop.** Add the new adapter class to this tuple or
outbound AI-authored sends over Sendivo ship completely ungated — the
project's own documented "decision #1: never fail open on a new channel"
extension point, same as before.

**1c. `infra/agent-entrypoint.sh`'s `PUBLIC = ("bluebubbles", "sms")`** —
same fail-closed RCE check, same required edit, same "loud and safe" failure
mode if missed (container refuses to boot).

## 2. New Sendivo-specific finding: the console's OPERATOR-reply path is a 4th hardcoded touchpoint, missed in the AgentPhone pass

Re-reading the code while checking Sendivo's "human takeover" endpoint
against something concrete (gm's hint #2) surfaced a call site the AgentPhone
plan never looked at: **`agent/plugins/keonda-tools/console_routes.py`'s
`_send_sms` / `_send_imessage` / `_lead_channel` / `_send_reply`.** This is a
SEPARATE, THIRD implementation of "send a message" — the operator-console
reply path (Jason typing into the live Hermes console) — that bypasses the
platform adapter classes entirely: `_send_sms` calls Twilio's REST API
directly via `sms_selftest._twilio_send`; `_send_imessage` POSTs to
BlueBubbles' HTTP API directly via raw `urllib`. Neither goes through
`SmsAdapter`/`BlueBubblesAdapter`, so `_GATED_ADAPTERS` never applied here —
correctly, since "Operator messages bypass the content gate on purpose (the
human is authorized)." `_lead_channel()` picks `'sms'` vs `'bluebubbles'`
per-lead from a local SQLite state DB keyed on the last inbound message's
channel; `_send_reply()` is the single dispatch chokepoint.

**This needs its own Sendivo-shaped replacement, and it's a genuinely better
mapping than a plain `/sms` POST — this is where gm's hint #2 actually lands:**

- Since Sendivo is single-channel, `_lead_channel()`'s per-lead
  SMS-vs-iMessage detection becomes unnecessary — one fewer hardcoded
  decision, not one to port forward.
- The operator's reply should call `POST /conversations/{id}/messages`
  (human takeover), not the generic `POST /sms` — it's explicitly addressed
  at a conversation, not a bare phone number, and it is precisely "a human
  is now handling this thread," which is exactly what the operator-console
  reply IS. **New step this requires that neither `_send_sms` nor
  `_send_imessage` needed:** resolve the Sendivo `conversation_id` first
  (`GET /conversations?phone_number=...`) before sending.
- **Real edge case to handle, not hand-wave:** "a thread starts at the
  contact's FIRST INBOUND reply — outbound messages sent before any reply
  ever came in are NOT part of a thread." If the operator wants to proactively
  text a lead who hasn't replied yet, there is no `conversation_id` to take
  over. The replacement needs a fallback: conversation exists → human-takeover
  endpoint; no conversation yet → plain `POST /sms`.

**Also found, lower stakes, same pass: `agent/plugins/keonda-tools/
bdr_status.py` monkeypatches `SmsAdapter.connect` to bolt Twilio's
status-callback route (`/webhooks/twilio/status`, parsing Twilio-specific
`MessageStatus`/`MessageSid` form fields) onto the adapter's own aiohttp app.**
This is Twilio-callback-shaped, not reusable as-is. Sendivo's equivalent is
structurally different — "Outbound Delivery Status" is its own
dashboard-registered account-level webhook, not a per-send callback URL — so
this needs a new handler for that event, not a port of `bdr_status.py`'s
parsing code. Lower priority than §1b/2's items: this is delivery-status
observability, not a safety gate or a send path — flag as a known gap to
close, not a blocker to ship without.

## 3. Real open risks — flagged, not resolved

1. **10DLC/A2P approval status — gm asked me to check this directly; I
   can't without the live key.** The reference doc confirms this Sendivo
   account already has a named brand/campaign, which is a stronger starting
   position than Twilio's unregistered state ever was, but "has a campaign"
   and "carriers approved" are different claims. Whoever holds the actual
   `sdk_...` key should run this before any real send is trusted:
   ```
   curl -s https://app.sendivo.io/api/v1/campaigns \
     -H "Authorization: Bearer $SENDIVO_API_KEY" | jq '.data[] | {id, status, registration_state}'
   ```
   Look for `"Carriers Approved"` specifically, not just presence of a
   campaign. Given this exact client already burned one provider on A2P,
   this is the one check that should happen before anything else here.
2. **No documented webhook signature/secret scheme.** Twilio signs
   (`X-Twilio-Signature`, HMAC-SHA1); AgentPhone signs (HMAC-SHA256,
   `whsec_...`). Sendivo's reference doc describes four dashboard-configured
   webhooks with Save/Send-Test actions but never mentions a signing secret
   or any authenticity mechanism. **Don't assume there isn't one** — check
   the dashboard's webhook config screen directly for a secret field before
   concluding the new adapter's inbound handler has no way to verify a
   request actually came from Sendivo. If there genuinely is none, the
   adapter needs a compensating control (unguessable path segment, shared
   secret query param, or an IP allowlist from Sendivo's documented sending
   ranges) rather than accepting unauthenticated POSTs to a public URL —
   the Twilio adapter's `SMS_INSECURE_NO_SIGNATURE` escape hatch (loud
   warning, dev-only) is the wrong default to quietly inherit here.
3. **Does Sendivo have its own platform-level AI auto-responder, separate
   from our Hermes bot?** The phrase "permanently stops the AI Responder for
   that thread" reads as if Sendivo's platform has its own AI feature, not
   just a state field we set. If so, **it must be confirmed disabled/unused
   for this account/campaign** — two independent AI systems (Sendivo's
   native one and our Hermes bot) both trying to answer the same inbound SMS
   would be a severe, concrete regression (duplicate or conflicting replies
   to a real lead), and it's the kind of thing that wouldn't show up until a
   real lead gets two different answers. Not resolved by the reference doc
   as pasted — check the Sendivo dashboard's AI Responder settings for this
   number/campaign, or ask Sendivo support directly, before going live.

## 4. Infra delta — same shape as the AgentPhone plan's §5, Sendivo specifics substituted

Same recommendation as before: mirror `docs/ARCHITECTURE.md` §4's own
"transport-swap delta" table structure rather than inventing a new one.
`BLUEBUBBLES_*` env block → `SENDIVO_API_KEY`, `SENDIVO_WEBHOOK_*`;
`platform_toolsets.bluebubbles` → `platform_toolsets.sendivo` (same chat-only
lockdown, also what §1c's entrypoint check validates); Caddyfile gets a real
public route for the inbound webhook (same shape as the already-inert
`/webhooks/twilio*` route — Sendivo, like Twilio, is a public-webhook
provider, not a private-link one like BlueBubbles, so the Mac-box machinery
goes away the same way it would have under AgentPhone). Healthcheck: same
§4-equivalent recommendation from the AgentPhone doc still applies —
assert the specifically-active adapter's gate, not "any importable one,"
given there will again be 3 candidate classes in `_GATED_ADAPTERS` once
Sendivo's is added alongside the still-present Twilio/BlueBubbles entries.

## What's reusable vs. new

```
REUSABLE AS-IS:
  Everything in the AgentPhone plan's Hermes-plugin-architecture research
    (open Platform enum, ctx.register_platform, zero core changes needed)
  plugins/platforms/sms/adapter.py's STRUCTURE as the template (closer fit
    than ever -- Sendivo is SMS-only, same shape as Twilio)
  bdr_gate.py's decide_outbound() -- pure, transport-agnostic, untouched
  Cal.com booking, Twenty CRM write path, console UI shell -- untouched

NEW THIS SWAP, beyond the AgentPhone-era findings:
  plugins/platforms/sendivo/adapter.py -- new adapter module
  console_routes.py's operator-reply path (NEW finding, §2) -- needs a
    Sendivo-shaped _send_reply equivalent using POST /conversations/{id}/
    messages with a conversation-id-resolve step + no-conversation-yet
    fallback to POST /sms
  bdr_status.py's delivery-status tracking (NEW finding, §2, lower
    priority) -- needs a handler for Sendivo's separate "Outbound Delivery
    Status" webhook, not a port of the Twilio-callback parsing code
  Same 3 required edits as the AgentPhone plan (§1): adapter.py's lookup,
    bdr_send.py's gate tuple (still highest-risk), entrypoint.sh's PUBLIC
    tuple
  Infra delta per §4, same shape as before with Sendivo's actual env vars
```

## What to tell the operator

Re-scoped against the real Sendivo docs, not a copy of the AgentPhone plan.
The 3 originally-found code touchpoints hold in the same shape and same
risk order (the content-safety gate in `bdr_send.py` is still the one to
double-check hardest). Found one more real call site on this pass — the
operator-console's own reply path bypasses the platform adapters entirely
and needs its own Sendivo wiring, which turns out to be a genuinely better
fit than a plain send: Sendivo's "human takeover" endpoint models exactly
what an operator reply already is. Three things flagged as open, not
resolved: the actual 10DLC approval status needs one live API call from
whoever holds the real key (given this client already burned one provider on
this exact failure mode); no documented webhook signing secret, needs a
dashboard check before deciding how to authenticate inbound webhooks; and
whether Sendivo has its own built-in AI responder that would need to be
turned off to avoid two AI systems answering the same lead. No agentId
blocker this time — ready for builder-3 or whoever's free once those three
are answered, or in parallel if they're fine being resolved during build
rather than before it.
