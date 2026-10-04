# Keonda as Community Manager: Pilot Execution Plan

- **Requested by:** operator, via gm (msg_b9ae2864_17208420) — "I want to
  start setting up some pilots as I have interest in having Keonda in as
  a community manager." Real forward motion, not more research.
- **Checked fresh today, not taken from memory:** the engine's self-tests
  (`dinner.py --demo`, `graph.py --demo`), the real RSVP data file, the
  seating-ui wiring, and the Hermes profile list — all re-verified against
  the actual repo and runtime state right now, not recalled from an
  earlier pass.

## The direct answer: yes, keep Steve's volleyball crew as pilot #1 — but one real number needs an explanation before trusting it as evidence either way

The locked Sept 20 design review already named Steve's volleyball crew as
pilot #1. That's still the right call — but checked fresh today, the real
data behind it hasn't moved in a month: **exactly 1 event, 3 RSVPs,
unchanged since September 3rd**, despite the Hermes WhatsApp profile
being live the whole time. That flatness could mean two very different
things, and they point to two very different fixes:

- **If the wiring gap is why** (nothing downstream currently happens when
  someone RSVPs — no table ever gets composed, no dinner ever gets
  booked, so there was never a reason for the group to come back), then
  finishing the 3 wiring moves below is the actual fix, and the crew is
  still a good pilot.
- **If the community itself has gone quiet** independent of the product
  (Steve not actively promoting it, the group having moved on), then
  wiring the plumbing won't fix engagement, and worth knowing before
  investing in it as evidence of anything.

**Recommended: run the wiring moves against this exact group first — it's
the cheapest possible test of which explanation is true, and it's free
either way, since the group and the Hermes profile already exist.** If
engagement stays flat after a real dinner actually gets run and offered,
that's the real signal to look elsewhere for pilot #1, not a guess made
from the RSVP count alone.

## "Pilots," plural — the honest state is there is exactly one, today

Checked the Hermes profile list directly: `jason-cre` (a different
product — CRE lead-gen, not community), `sj-fac`/`sj-venue` (Silicon
Jungle facilitator-side, not a separate community), and
`tulum-volleyball` (Steve's crew — the one real candidate). **There is no
second community sitting ready to go.** If the operator wants parallel
pilots now, recruiting a second real community is itself new setup work,
not something already available to flip on.

**Recommended sequencing, not parallel from zero:** prove the mechanism
once, for real, on the group that already exists — then use that proof
(a real dinner that ran, a real HQ score that landed) as the actual pitch
to recruit pilot #2, rather than standing up two unproven pilots at once
with nothing yet to show either of them.

## The sequence, phase by phase

```
PHASE 0 — THE 3 WIRING MOVES (days, not weeks — nothing here is new code)
  (a) seating-ui's "compose table" button calls the real plan_dinner
      tool, instead of reading the frozen seating.json from Sept 20
  (b) stand up one real Hermes config for the dinner/community flow,
      same pattern as the jason-cre.yaml that already works
  (c) actually run one real dinner with Steve's crew, let the
      already-tested HQ-score mechanism fire against real guests
        │
        ▼
PHASE 1 — PROVE THE SIGNAL
  confirm real witness edges landed (the HQ-score graph actually has
  an entry that didn't exist before), not just that the dinner happened
        │
        ▼
PHASE 2 — PROVE THE RETENTION LOOP, NOT JUST ONE NIGHT
  run a second dinner with the same group. Does anyone who showed up
  once come back? This is the actual thing Keonda-as-community-manager
  is supposed to prove — "attended once" becoming "gets invited back"
  — and it can't be proven from a single dinner.
        │
        ▼
PHASE 3 — ONLY NOW, RECRUIT PILOT #2
  use Phase 1/2's real result as the pitch for a second community,
  rather than a cold "we built something, want to try it" ask
```

## What's genuinely new engineering vs. what's just wiring — checked, not assumed

**Just wiring, nothing new to build (re-verified today by running the
actual self-tests):**
- `dinner.py --demo` ran clean just now: real lane-diverse table
  composition, real venue assignment, real event IDs. This exists and
  works.
- `graph.py --demo` ran clean just now: the HQ-score witness mechanism,
  the "recall wall" (who can see what another person said), and
  cross-community tenancy (one community's data can't leak into
  another's) all pass their own tests. This exists and works.
- Both of the above are the SAME shared engine the CRE-BDR client work
  already runs on — reusing it for community pilots isn't a new system,
  it's a new tenant on a system that's already proven elsewhere.

**Genuinely not built yet, and NOT required to run the first real
dinner:** the vision deck's "Neighborhood Forms" step — a 3-minute
WhatsApp voice intake that would replace today's lightweight RSVP
tracking with a real profile-building conversation. Searched the
codebase directly; nothing matching this exists. **This can wait** — the
first real dinner only needs the 3 wiring moves above, not this. Worth
scoping separately once Phase 2 proves the loop is worth the investment.

**One infrastructure thing worth a look before pilot #2, not blocking
pilot #1:** the graph engine's database connection isn't live in this
environment right now — it's running on its own built-in JSONL fallback
(a real, tested resilience feature, not a bug: "fact NOT lost, no raise,
reconcile safe"). That's genuinely fine at pilot #1's scale. Worth
confirming a real database is connected before a second community adds
real volume on top of the fallback path.

## One small thing to check before trusting the existing data at all

While verifying the RSVP numbers, a file named `steve-immigration.rsvps.jsonl`
turned up sitting in the same community-graph data folder as the real
volleyball RSVPs — the naming looks like it belongs to the separate
Imcore/Lee-Associates work, not the community track. This may just be a
stray fixture, or it may be the same cross-repo file-mixing issue already
known and being cleaned up on a separate thread (`task_6099b82c`). Worth
a 2-minute check before anyone reads that file as community data, not
something this plan needs to resolve itself.

## What to tell the operator

Steve's crew stays pilot #1. The flat month of data isn't yet a verdict
on the community — it's a verdict on the wiring, which has a cheap, fast
test: finish the 3 moves, run one real dinner, see if the numbers move.
"Pilots" plural starts for real after that one dinner proves the loop,
not before — recruiting a second community now, before anything's been
shown to work once, would be starting two unproven things instead of one
proven one.
