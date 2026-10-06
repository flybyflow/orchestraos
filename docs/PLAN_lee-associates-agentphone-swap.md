# Lee & Associates CRE BDR: swap BlueBubbles/Twilio for AgentPhone

- **Requested by:** operator, via gm (`msg_d5bed15c_8778070`), live infra for a
  paying client (Jason Wood / Lee & Associates, real MOU). Full gstack process
  requested — this is the plan step; nothing built yet.
- **Repo:** `~/conductor/repos/lee-associates-revops` (Hermes gateway +
  `keonda-tools` CRE plugin, separate from `keonda.io` — see `docs/ARCHITECTURE.md`).
- **Scope, confirmed with operator, do not expand:** provider swap only. Same
  bot behavior (qualify a lead, book on Jason's Cal.com, escalate deal-substance
  to the operator). The MOU's human-only Calling phase is untouched.

## 0. Correction to the dispatch's premise, checked before scoping anything

The dispatch frames this as swapping "Twilio/BlueBubbles" as if both are live.
Checked the actual deployed config (`infra/docker-compose.yml`,
`infra/.env.example`, `docs/ARCHITECTURE.md` §4): **only BlueBubbles/iMessage is
the active transport.** Twilio SMS was already abandoned in production — "the
compose is Twilio-era... before the pivot to iMessage after **Twilio's A2P
compliance failure**" — and is kept disabled (`platforms.sms.enabled:false`,
empty env vars, its Caddy route "inert") as a documented legacy fallback only.

This isn't just a framing nitpick — it surfaces the real risk in §4 below: the
reason Twilio died was A2P/10DLC SMS compliance, not iMessage/BlueBubbles. The
swap target (AgentPhone) auto-falls-back to SMS/MMS whenever a lead's phone
can't do iMessage, which is a real fraction of CRE leads. If AgentPhone's SMS
leg hits the same wall, the swap inherits the old failure mode for exactly the
leads BlueBubbles-only already couldn't reach.

## 1. What AgentPhone actually is, researched directly (api docs + skills.md), not assumed from gm's summary

gm's dispatch only had the outbound `/v1/calls` shape. The actually-relevant
piece is `POST /v1/messages` — **one unified endpoint for SMS, iMessage, and
WhatsApp**: "The platform delivers over iMessage automatically when both sides
support it and falls back to SMS/MMS otherwise." This is a materially better
fit than I expected: it replaces BlueBubbles *and* Twilio with ONE adapter and
ONE webhook, and removes the channel-routing problem entirely (today's split
between a BlueBubbles adapter and a Twilio adapter goes away — AgentPhone
picks the channel per-recipient automatically).

**Inbound delivery mechanism (the thing gm flagged as the real unknown):**
webhook-only, no polling/WebSocket option. `POST /v1/webhooks` registers an
account-level default; `POST /v1/agents/{agent_id}/webhook` overrides it per
agent (one per agent, not many). Event type `agent.message` covers
`sms`/`mms`/`imessage`/`whatsapp`/`voice` in one stream. Signed:
`X-Webhook-Signature: sha256=<hex>` = `HMAC-SHA256(secret, "{timestamp}." + rawBody)`,
secret is `whsec_...` returned at webhook creation. Retried on 5xx/timeout up
to ~21h; 4xx is not retried. Auth for our own calls: `Authorization: Bearer
sk_live_...`.

**Real documentation gap, not resolved by reading harder:** the exact JSON
field layout of an `agent.message` payload for a plain 1:1 SMS/iMessage isn't
shown anywhere in the docs — only that group messages carry `data.group` and
`data.senderIdentifier`. **Do not guess the schema and write a parser against
assumed field names.** `POST /v1/webhooks/test` sends a synthetic event to a
real registered endpoint — the first build step should be standing up a
throwaway endpoint (or an ngrok/local tunnel) and firing that test event to
get the real payload before writing `AgentPhoneAdapter`'s parsing code,
exactly the same "reference beats recall" discipline that's caught real bugs
elsewhere this project.

## 2. How this maps onto the Hermes plugin architecture — researched from the actual existing adapters, not inferred

Hermes platforms are a clean plugin contract (`gateway/platforms/base.py`):
an adapter class with `connect()`/`disconnect()`/`send()`/`get_chat_info()`,
a `register(ctx)` entry point that calls `ctx.register_platform(name=...,
adapter_factory=..., required_env=[...], ...)`, and `Platform` is an open
enum (`Platform._missing_()` mints new members for plugin names on demand) —
so adding `agentphone` as a brand-new platform needs **zero changes to
Hermes core**.

**The new adapter is architecturally closer to `plugins/platforms/sms/adapter.py`
(Twilio) than to `gateway/platforms/bluebubbles.py`.** BlueBubbles talks to a
remote Mac box over a private link; AgentPhone, like Twilio, is "the provider
POSTs a signed webhook to a public URL we run." Use the SMS adapter as the
structural template (aiohttp webhook server, signature validation, build a
`MessageEvent`, call `self.handle_message(event)`), not BlueBubbles — same
shape, different signature scheme (HMAC-SHA256 vs Twilio's SHA1) and JSON
body instead of form-encoded.

## 3. Three required code touchpoints beyond "add a new platform plugin" — found by reading the bot's own code, not assumed to be purely additive

The dispatch asked me to flag "what changes in the bot's own code vs. what's
pure provider-side config." It is **not** purely additive. The CRE bot
(`agent/plugins/keonda-tools/`) hardcodes the specific transport in two
places, and a third file hardcodes the two known transport names for a
safety check:

**3a. `agent/plugins/keonda-tools/adapter.py:189` — `_handle_send_message`
looks up `runner.adapters.get(Platform.SMS)` by name, not "whatever the live
transport is."** Once AgentPhone registers as a new `Platform("agentphone")`,
this lookup returns `None` and the bot's own `send_message` tool breaks
outright ("no live SMS adapter"). **Must update this line to resolve the
actually-configured transport.** Low risk of being missed — it fails loudly
(the bot literally can't text anyone, caught in testing) — but still a
required line-item.

**3b. `agent/plugins/keonda-tools/bdr_send.py`'s `_GATED_ADAPTERS` — the
highest-risk item in this whole plan.** This is the content-class SEND GATE:
every outbound message is classified, and anything touching deal substance
(price/terms/legal) is suppressed to the lead and redirected to the operator
instead — "a BDR books meetings; it never negotiates the deal." It works by
monkeypatching `.send` on a hardcoded tuple of (module, classname) pairs,
currently `[("plugins.platforms.sms.adapter", "SmsAdapter"),
("gateway.platforms.bluebubbles", "BlueBubblesAdapter")]`. **The module's own
docstring already anticipated this exact task** — "Adding a transport = one
line here, and it is gated by default (decision #1: never fail open on a new
channel)" — so this is a documented, intentional extension point, not an
obscure trap. But it is a **manual step that must not be forgotten**: if the
AgentPhone adapter class isn't added to this tuple, outbound sends over the
new transport are completely ungated — deal-substance text could reach a real
lead directly. This is a silent failure mode (no error, no crash, just a
missing safety check) on a live client's real leads — the single highest-value
thing to verify before this ships.

**3c. `infra/agent-entrypoint.sh`'s `PUBLIC = ("bluebubbles", "sms")` —
the fail-closed RCE-hardening gate.** Asserts every *configured* public
toolset is chat-only (no terminal/file/browser tools) before the gateway
starts, and refuses to boot if zero public toolsets are configured at all.
If `platform_toolsets.bluebubbles` is removed and replaced with
`platform_toolsets.agentphone` without adding `"agentphone"` to this tuple,
`present` becomes empty and **the container refuses to start** — a loud,
safe failure (easy to catch at first bring-up), but still a required
line-item, and the kind of thing worth listing explicitly so build doesn't
spend an hour debugging a boot failure that's actually just this one-line
miss.

## 4. A pre-existing weakness in the gate-liveness healthcheck, surfaced by adding a third adapter — worth fixing alongside, not just working around

`infra/docker-compose.yml`'s `agent` healthcheck treats the gate as live once
`install_gate()` returns `gated_any=True`, and `gated_any` is `True` if **any**
adapter in `_GATED_ADAPTERS` patched successfully — it's an OR across the
whole tuple, not "the actually-active transport specifically got gated."
Today this is low-risk because both Twilio's and BlueBubbles's classes are
always importable and both currently patch cleanly, so `gated_any` is
effectively always true from either. But once there are **three** candidate
adapters and only one is the live transport, a scenario where the new
`AgentPhoneAdapter`'s patch throws (e.g. a method-signature mismatch) while
the dormant Twilio class still patches fine would leave the healthcheck
**green while the live transport is completely ungated** — silent, not loud.
**Recommend tightening this alongside the swap:** assert the *specific*,
actually-configured transport's `.send` carries `_keonda_gated = True`, not
just "something in the tuple did." Cheap to add, meaningfully closes the
exact failure mode this task's extra adapter makes newly possible.

## 5. Infra delta — mirror the repo's own documented pattern, don't invent a new shape

`docs/ARCHITECTURE.md` §4 is literally titled "Transport-swap delta" and is
the exact punch-list this repo used for the LAST provider swap (Twilio →
BlueBubbles). Reuse that structure for this one instead of improvising:

| File | Twilio → BlueBubbles (already done, for reference) | BlueBubbles → AgentPhone (this task) |
|---|---|---|
| `infra/docker-compose.yml` (`agent` env) | Replaced `TWILIO_*` block with `BLUEBUBBLES_*` | Replace `BLUEBUBBLES_*` block with `AGENTPHONE_API_KEY`, `AGENTPHONE_AGENT_ID`, `AGENTPHONE_WEBHOOK_SECRET`, webhook host/port. **Simplification: no private-link port-publish needed** — AgentPhone is a public webhook like Twilio was, not a Mac-reachable private port, so the `BLUEBUBBLES_BIND_ADDR`/private-interface machinery can be removed outright, not just swapped. |
| `infra/hermes/config.yaml.example` | Enabled `platforms.bluebubbles`, set `platform_toolsets.bluebubbles: [keonda, clarify, memory]` | Enable `platforms.agentphone`, set `platform_toolsets.agentphone: [keonda, clarify, memory]` (same chat-only lockdown — this is also what §3c's entrypoint check validates) |
| `infra/Caddyfile` | BlueBubbles inbound is a private POST from the Mac, routed or direct | AgentPhone inbound is a public signed webhook — add a real Caddy route (`/webhooks/agentphone` → `agent:<port>`), same shape as the already-inert `/webhooks/twilio*` route, not a private-link passthrough |
| `agent` healthcheck | Asserted BlueBubbles connection live | Assert the AgentPhone webhook listener is up — **and** per §4 above, assert gate-liveness on the specific active adapter, not just "any" |
| **New, no Twilio/BlueBubbles equivalent** | — | Decommission: once cut over, the Mac box and its BlueBubbles server are no longer needed at all — confirm with the operator before actually powering it down (dedicated Apple ID, SIP config, etc. — don't destroy a working fallback until AgentPhone is proven in production) |

## 6. Real open risks — flagged, not resolved; do not let build guess past these

1. **A2P/10DLC compliance on AgentPhone's SMS-fallback leg** (§0) — the
   documented reason Twilio was abandoned. AgentPhone's docs mention
   "unregistered 10DLC numbers → 403 with a registration link" but don't say
   whether/how their platform pre-handles registration differently from raw
   Twilio. Needs a direct answer from AgentPhone (or the operator, who may
   already know from testing) before relying on the SMS-fallback path for
   non-iMessage leads — otherwise this swap could silently fail for exactly
   the Android/non-Apple leads BlueBubbles already couldn't reach, just with
   a different error.
2. **Exact inbound webhook payload shape** (§1) — not documented; resolve via
   `POST /v1/webhooks/test` against a real throwaway endpoint before writing
   the parser, not by guessing field names from the field names used for
   group messages.
3. **The `agentId` for the operator's AgentPhone account** — gm is still
   waiting on this from the operator; nothing can be registered/tested
   end-to-end without it.
4. **iMessage feature parity, scoped down, not assumed equivalent.** BlueBubbles
   exposes typing indicators / tapbacks / etc.; AgentPhone has analogous
   features (`typing`, reactions) but it is **not yet confirmed the current
   bot uses any of them** — `grep` of `keonda-tools` for anything beyond
   plain text send/receive turned up nothing in this pass, but a build-time
   check against the full `bluebubbles.py` adapter's actually-used methods
   (not just the ones a BDR bot would plausibly need) is the honest way to
   close this, not an assumption.

## 7. What's reusable vs. new

```
REUSABLE AS-IS:
  Hermes plugin architecture (ctx.register_platform, open Platform enum) --
    zero core changes needed
  plugins/platforms/sms/adapter.py's STRUCTURE as the template (webhook
    server, signature validation, MessageEvent construction) -- not its
    Twilio-specific auth/signing code
  bdr_gate.py's decide_outbound() -- pure, already tested, transport-agnostic
  Cal.com booking path, Twenty CRM write path, console -- untouched, this
    task is the transport layer only

NEW THIS SWAP:
  plugins/platforms/agentphone/adapter.py -- new adapter module
  3 required edits: adapter.py's Platform.SMS lookup (3a), bdr_send.py's
    _GATED_ADAPTERS tuple (3b, the highest-risk one), agent-entrypoint.sh's
    PUBLIC tuple (3c)
  infra delta per §5's table
  recommended: tighten the gate-liveness healthcheck (§4)
```

## What to tell the operator

Scoped, not built. The provider swap itself maps cleanly onto the existing
plugin architecture and is actually a simplification (one AgentPhone adapter
replaces both the Twilio and BlueBubbles adapters, and removes the Mac-box
private-network dependency entirely). Found three places the bot's own code
hardcodes the current transport that must be updated as part of this swap,
most importantly the deal-substance content gate (`bdr_send.py`) — the
project's own code already anticipated this as a one-line extension point,
so it's a known, bounded step, not a surprise, but it's the one item worth
double-checking directly before go-live given what it protects. Two real
open risks flagged rather than guessed past: whether AgentPhone's SMS
fallback re-triggers the same A2P compliance problem that killed Twilio, and
the undocumented exact webhook payload shape (resolve via AgentPhone's own
`/v1/webhooks/test` endpoint before writing the parser). Waiting on the
operator's `agentId` to go further.
