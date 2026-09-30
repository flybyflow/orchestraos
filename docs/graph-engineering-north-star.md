# OrchestraOS North-Star: A Graph-Engineered, Graph-RAG Org

Status: DIRECTION (draft for /plan-ceo-review) — 2026-09-29
Not a rewrite plan. The frame the org self-improves toward, one lever at a time.

## 0. Why this exists (the bottleneck, twice)
gstack + gbrain was the production-capacity baseline: one operator running many Claude
Code threads, gated by how many the operator's own human context could hold. OrchestraOS
exists to lift that ceiling — move the coordination out of one human's head into a fleet.

But we just re-hit the SAME shape one tier down: the **GM** became the single context that
everything threads through (17-min turns, SLA breaches, context-to-0% stalls). Same disease,
new host. The fix is not "more agents" — a bigger fleet threads more streams through the same
throat. The fix is the **shape of the work**: turn the org from a linear sprint into an
explicit execution graph. (Ref: "Graph Engineering — AI agent systems that don't break at
scale." The essay is the model; this doc applies it to us.)

## 1. Reference frame — what we keep
- **The gstack process is the ontology of work:** Think → Plan → Build → Review → Test →
  Ship → Reflect. These are node ROLES, not a mandatory serial chain. Sequence ≠ dependency.
- **gbrain is the shared state / graph-RAG substrate.** It is where artifacts and decisions
  live and are queried — the "durable state, not transcripts" layer.
- **BSHR is the one new primitive:** the controlled cycle (Brainstorm→Search→Hypothesize→
  Refine) with a convergence rule (cap 5 passes, dedup against everything seen). It is the
  org's canonical "repeat until it converges" node. Already a seat (`bshr`).

## 2. The model, applied to us
```
NODE   = a seat (gm, plan, build, review, ea, bshr, builder-1…) — one bounded job
EDGE   = reports_to + "A produced data B consumes" (today only the first half)
STATE  = gbrain artifacts + msg_store + registry (today: too much rides in transcripts)
ROUTER = the GM/lead's judgment → must become an inspectable switch on classified state
GATE   = a check that lets work continue (today: only the T0/T1 human rotation gate)
```
Graph shapes and where each belongs in the org:
- **Chain** — only where a step truly consumes the prior (plan → build → review of ONE unit).
- **Diamond** — the workhorse: a lead decomposes and fans out to its pod, then joins.
  *(Just enabled via down-delegation in the lead prompts — the org's first real diamond.)*
- **Router** — classify the request, send small work down a short path, reserve the full
  graph for work that earns it.
- **Controlled cycle** — BSHR, iterative repair, rotation-at-ceiling. Always with a hard stop.

## 3. Current state vs target
| Piece | Today | Gap |
|---|---|---|
| Nodes | ✅ seats | prose prompts, not typed contracts |
| Edges | ⚠️ reports_to only | not "data B consumes"; no deterministic plumbing |
| Fan-out (diamond) | ✅ down-delegation live | leads must actually parallelize, not solo |
| Controlled cycle | ✅ BSHR + cron_beat rotation | fine |
| Router / Gate | ⚠️ GM prose judgment | no inspectable switch; one real gate (rotation) |
| Verification on edge | ⚠️ review/test as stages | no per-node verifier w/ structured pass/fail |
| **Artifact state, not transcripts** | ❌ threading bodies | **the deepest bottleneck** |
| **Graph RAG (gbrain) as node state** | ❌ not wired | nodes can't query shared artifacts/decisions |
| Node contracts (typed I/O/failure) | ❌ prose | can't route/verify/swap deterministically |
| Topology as cost | ✅ opus build/review, sonnet else | extend to route-simple-cheap |

## 4. The three priorities (in order)
**P1 — Artifact/run state, not transcripts. (Correction: this is NOT the same as graph-RAG.)**
Two distinct things, kept distinct (advisor correction 2026-09-29):
- **Source of truth = canonical artifacts + explicit run state.** Each node writes its output
  (plan file, build report, findings, retro) to a durable store and records run state: owner,
  status, version, timestamps, retry/idempotency keys, human approvals. Nodes pass **refs**,
  not bodies; the GM/ea/reviewers read the artifact, not a retelling threaded through three
  agents. This is the direct fix for context burn + fan-in and makes the org resumable/auditable.
- **gbrain = index + retrieval, NOT the source of truth.** gbrain indexes relationships between
  artifacts and retrieves relevant context. Do NOT make the graph a mutable database of record —
  that reintroduces write-contention and, with shared node state, ACL/tenant-leakage questions.
  Canonical state is authoritative; the graph points at it.
This split is the whole of P1. "Graph RAG" = the retrieval layer over canonical artifacts, not
a replacement for them.

**P2 — Node contracts (typed input / output / failure).**
Give each seat a contract, not just a prose prompt: one job, explicit input, structured
output, a named failure state. Structured output is what lets the graph *trust* a node,
*route* on its result, *verify* it, and *swap* the model without a rebuild. Start with the
sprint seats (plan/build/review) and BSHR.

**P3 — Verification-on-edge + deterministic routing (NOT a classifier-first).**
(Advisor correction: contracts + schema validation + explicit pass/fail/retry edges are a
stronger first step than adding a classifier.) So: put verifiers on edges with structured
pass/fail/retry — stop weak work before it moves downstream (review already does this for
landing; generalize). Route **deterministically from run state**, with a human fallback for
genuinely ambiguous cases; only add a probabilistic classifier later if determinism proves
insufficient. Separate generate / approve / publish across seats — never one context doing all
three.

## 5. Topology is the cost model
Route simple requests through a short path on a cheap model; reserve the full parallel graph
for work that earns it. We started this (opus for build+review, sonnet for reasoning/plan).
Extend: a `router` step classifies incoming operator tasks → trivial ones answered directly
by ea/gm; complex ones decomposed into the diamond. Graph engineering is not maximizing agent
count — it is spending coordination only where parallelism/specialization/verification pays.

## 6. What stays simple (the discipline)
Keep one seat in one loop when: the task is short, one context holds it, no independent
branches, failure is cheap. Only draw the graph when dependencies force it. Last checklist
line, always: *is the graph simpler than the problem it solves?* If not, delete nodes.

## 7. Roadmap (incremental, each shippable)
1. **Diamond first (DONE/in-flight):** leads fan out to pods; the 2D-view sprint is the pilot.
2. **Artifact refs over bodies:** leads write to gbrain + pass refs; ea/gm query, not receive.
3. **gbrain as the org's graph-RAG state** (P1 complete): every node reads/writes the graph.
4. **Node contracts** on the sprint seats (P2).
5. **Router + edge verifiers** (P3).
Each step is measured (GM inbound/hour, context-burn-rate, tokens/task) — topology changes
must show the number move, or they revert.

## 8. Done means
- **Product throughput moves (the real metric).** The org ships a real keonda / CRE /
  Silicon Jungle feature end-to-end, autonomously, faster than the operator could thread it
  by hand. Org elegance is not the goal; product output is. Every phase reports against this.
- No single seat is the serial throat: work fans out and joins by data dependency, not by org line.
- State lives in gbrain as queryable artifacts; nodes pass refs, not transcripts — the org
  resumes after any crash and can say what happened, why, and where to resume.
- A trivial request never pays for the full graph; a risky one always gets verification.
- The operator's context is no longer the ceiling — the graph is.

## 9. Measurable hypotheses (the 2D sprint is the test)
Don't assert Amdahl/diamond wins — measure them on the live 2D sprint before betting bigger:
- **H1 (serial-hub):** coordination, not genuinely-parallel work, dominates a slow turn.
  Measure per-stage latency + GM/lead idle-vs-busy split. Confirms only if coordination > work.
- **H2 (diamond helps):** fan-out cuts wall-clock without fan-in becoming the new bottleneck.
  Measure handoff payload size, parallel-branch latency, and join wait.
- **H3 (artifact-refs cut load):** passing refs (not bodies) drops GM inbound + context burn.
  Measure with `fanin_metric.py` + retries + review rework before/after.
A hypothesis that doesn't hold on the sprint kills or reshapes its phase. No metric move, no build.

## 10. CEO REVIEW — verdict
Adopted as **direction**, executed **bounded** (reconciles the operator's "adopt" with the
advisor's "don't over-invest ahead of evidence," and the live 2D sprint already producing it):
- **Direction locked:** gstack roles + BSHR cycle + graph-engineered topology + artifact-refs.
- **Correction applied:** durable artifact/run-state (source of truth) is NOT graph-RAG
  (index/retrieval over it). gbrain indexes; canonical state is authoritative. Avoids the
  mutable-graph + ACL/tenant-leakage trap.
- **First engineering step = contracts + schema + pass/fail/retry edges + deterministic
  routing**, not a classifier.
- **The 2D sprint is the evidence test.** Do NOT launch a parallel larger design loop while the
  sprint is running (that reproduces the attention-fragmentation this doc diagnoses). After the
  sprint closes, update this note with H1-H3 findings and decide whether the full north-star is
  warranted.

**Watch (from the premise challenge):** (a) product-throughput is the real metric, not org
elegance (§8); (b) the true ceiling may be single-account quota, not topology — if H1/H3 show
quota-bound, horizontal scale (accounts/machines) jumps ahead of P2/P3.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | /plan-ceo-review | Challenge premise + scope before committing the org to a north-star | 1 | resolved | Strategic-miscalibration risk (factory vs revenue product); wrong-constraint risk (quota vs topology); missing product-throughput metric; verify gbrain fit |
| Advisor feedback | operator-relayed | Independent second opinion on the architecture claim | 1 | folded in | artifact/run-state ≠ graph-RAG (corrected P1); soften Amdahl/diamond claims → measure (added H1-H3); contracts+schema+pass/fail/retry edges + deterministic routing before a classifier (corrected P3); bounded-C execution |

**VERDICT: ADOPTED AS DIRECTION, BOUNDED EXECUTION.** Direction locked; P1 corrected
(canonical artifact/run-state vs gbrain index); contracts/edges/deterministic-routing before
classifier; measurable hypotheses H1-H3 tested on the live 2D sprint; no parallel design loop;
revisit after the sprint closes. Product throughput is the success metric, not org elegance.

NO UNRESOLVED DECISIONS
