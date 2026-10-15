# Keonda: consumer-product engineering cleanup plan

- **Requested by:** operator, via gm, 2026-10-15. Full gstack process
  (brainstorm/research/hypothesize/refine/plan). Research delivered by
  bshr, folded in below, not re-derived.
- **Explicit sequencing constraint, stated up front so it can't drift:**
  this is **fully parallel to, and must not compete with, BUILD-A-THON.v9
  hackathon prep (Oct 17-18)**. Hackathon prep owns its own time-boxed
  priority — merging the 5 held keonda.io PRs and running the Table One
  dinner demo. **This plan does not include "merge the 5 PRs" as one of
  its own action items** — that work already has an owner and a deadline;
  duplicating it here would be exactly the scope-collision this
  constraint exists to prevent. This plan picks up what's left once that
  lands, plus items that don't touch the demo path at all.

## 0. Repo state, verified fresh by bshr, not recalled

| Repo | What it is | State |
|---|---|---|
| `v6-keonda` | Feature-complete facilitator console (gatherings→attendees→placements→broadcasts, "placed not sorted" rationale-required mechanic) + venue directory | 26 merged PRs Aug 10-11, then dead 2+ months. Known gaps in its OWN README: no per-user auth, SJE-13 hardening never run, MCP surface deferred. |
| `keonda.io` | "Your community manager" — WhatsApp-voice agent, tenant-tagged relationship graph. Current pilot: Umi Volleyball. | Dormant since Sept 2. 5 real, tested, **mergeable** PRs sitting 11+ days (see §1 — hackathon prep's to land, not this plan's). |
| `community-brain-3d` | Matchmaking viz — `/api/graph` does genuine gives/wants pairing, super-connector + isolated-person detection, 34 real named people from past events. **Live-verified, not placeholder.** | Real risk: untracked local files on ONE machine, never committed — same single-point-of-failure class as a prior near-loss incident. |
| `substrate-queonda-devops` | Broader platform infra | Stale 4 months. **Not a near-term lever for anything in this plan** — correctly out of scope, per bshr. |

## 1. The 5 held keonda.io PRs — NOT this plan's to land, context only

For awareness, since this plan's later items build on what they change:
`#19` (removes cross-contaminated client files — resolves the "files
question" flagged earlier, see §2), `#20` (community-dinner engine Phase-0,
first real dinner), `#21` (preserves 10 live-only scripts incl. 2 security
tests), `#22` (**fixes a CONFIRMED cross-tenant PII leak** — per-tenant
Cognee memory isolation + sidecar auth), `#24` (hardens the isolation
test). All five are real, tested, mergeable — hackathon prep's job to
land them. This plan assumes they'll be in by the time anything below
starts, and does not duplicate that work.

## 2. Lee & Associates / Jason CRE-BDR — fully resolved, feeds this plan directly

Correction to an earlier framing (bshr verified twice, not assumed):
**the jason-cre capability lives inside `keonda.io`'s own codebase**, one
of four shipped capabilities sharing the same engine as Umi Volleyball —
not a separate, unrelated repo as earlier framed. The committed code
itself has **zero real data or credentials anywhere**, verified
file-by-file — genuinely generic/parameterized, matching the operator's
actual original intent (reusable scraper/crawler logic). The real risk
lived in a SEPARATE, non-git deployment profile
(`~/.hermes/profiles/jason-cre`) running this code against real env vars
— confirmed dormant (clean stop Oct 3, nothing newer, process not
running), but **historically real appointment/contact data for Jason
Woods is still sitting there.**

**Operator confirmed: Jason's specific integration is off-scope, no
longer pursued. Hermes itself is still wanted for other future things.**
So `jason-cre.yaml`/`bdr_*.py` inside keonda.io are cleanup/removal
candidates for this plan, not a feature to preserve or design around.

**Net, confirmed by bshr:** Saturday's hackathon demo runs off clean repo
code with no real env vars loaded — **not blocked by any of this.** The
PII leak (#22) is worth fixing before Cognee is ever enabled for any
tenant (already hackathon prep's to land), but there's no actively
ticking clock on the items below.

## 3. What "designed as a consumer product" actually means here — the real planning question

Not "add polish" — the research surfaces four concrete, different kinds
of debt, each needing a different kind of fix:

**3a. Multi-tenant isolation is the load-bearing risk, and #22 fixes the
known instance, not the class.** A cross-tenant PII leak via shared
Cognee memory already happened once (caught, fixed in #22). For a real
consumer product with more than one pilot tenant, the question isn't
"is this instance fixed" — it's "what's the standing isolation guarantee,
and is it tested as a class, not per-incident." Recommend: once #22
lands, a dedicated audit pass across every shared-state surface (not
just Cognee) with the same rigor #22's own tests already established as
the bar, not a one-off patch treated as closed.

**3b. Code organization — now simpler, because Jason CRE-BDR is
confirmed off-scope.** keonda.io's four capabilities sharing one engine
was previously a real design tension (does Umi Volleyball's engine need
to stay generic enough for jason-cre's use case). With jason-cre
confirmed dead, that constraint is gone — the engine can be designed
around the capabilities actually being kept, not held generic for a
capability nobody's using. Concretely: remove `jason-cre.yaml`/`bdr_*.py`
from keonda.io (the git-tracked code, zero real data, low risk to
delete), separately from —

**3c. The real-data cleanup, which is NOT a code change.** The dormant
`~/.hermes/profiles/jason-cre` deployment profile holds real historical
client data (Jason Woods' appointments/contacts) outside git entirely.
Confirmed dormant, not actively risky today, but it's real PII sitting
on disk with no active purpose. Recommend archiving/scrubbing it properly
(export what's needed for any record-keeping requirement, then delete)
rather than leaving it indefinitely — this is an ops action, not
something to fold into a code PR, and worth its own explicit go-ahead
given it's irreversible.

**3d. v6-keonda's own documented gaps are real engineering debt, not
hypothetical.** Its README already names them: no per-user auth, SJE-13
hardening never run, MCP surface deferred. 26 merged PRs then 2+ months
dead suggests this was shipped to "feature-complete for a demo" and
never taken further — exactly the hackathon-prototype shape the operator
wants moved past. Recommend scoping per-user auth and the SJE-13
hardening pass as their own tracked items once there's a decision on
whether v6-keonda specifically is the product surface being invested in
going forward (a real product-direction question, not an engineering one
— flag to gm/operator before spending build time, don't assume).

**3e. Quick win, cheap, worth doing regardless of the rest of this plan's
timeline:** `community-brain-3d`'s untracked local files (one machine,
never committed) are a real, current single-point-of-failure — the same
class of risk that already caused a near-loss once. This has nothing to
do with "consumer-product polish" and everything to do with "don't lose
real, live-verified, working code to a laptop problem." Recommend
committing those files immediately, independent of everything else in
this plan and definitely not waiting on the hackathon to clear first —
the cost of doing this now is near zero and the cost of not doing it is
total loss of real work.

## 4. Recommended sequencing

```
NOW, doesn't wait on anything:
  3e. Commit community-brain-3d's untracked files. Near-zero cost,
      real data-loss risk if skipped.

AFTER hackathon prep lands the 5 PRs (their deadline, not negotiable by
this plan):
  3a. Multi-tenant isolation audit, using #22's tests as the bar.
  3b. Remove jason-cre.yaml/bdr_*.py from keonda.io's git history.

SEPARATE OPS ACTION, own go-ahead, irreversible:
  3c. Archive/scrub ~/.hermes/profiles/jason-cre's real data.

NEEDS A PRODUCT-DIRECTION ANSWER FIRST, not an engineering call:
  3d. v6-keonda's per-user auth + SJE-13 hardening -- only worth scoping
      once there's a decision that v6-keonda is still the invested-in
      product surface, not a hackathon artifact left feature-complete
      and abandoned.

OUT OF SCOPE:
  substrate-queonda-devops -- stale, not a near-term lever, confirmed by
  bshr, not revisited here.
```

## What to tell the operator

Parallel to hackathon prep, not competing with it — confirmed explicitly.
One item (community-brain-3d's untracked files) is a real, cheap,
immediate action worth doing regardless of anything else. Jason CRE-BDR
cleanup is now simple and low-risk (the code is clean; the real data
lives outside git in a dormant profile that needs a separate, deliberate
archive/scrub decision — flagging that as irreversible and wanting
explicit sign-off before it happens). v6-keonda's real engineering debt
(auth, hardening) is a genuine product-direction question before it's an
engineering one — is this still the surface being invested in, or a
hackathon artifact.
