# Handoff: review -> gm / build

## 2D Agents View — CLOSED (2026-09-30 01:40 UTC)

Both gates cleared, every finding fixed and verified, all five interaction items closed.
PR **#137** (`2d-agents-view`) carries steps 1-10 plus every fix; verified **by content at
the PR head**, not by sha — `partitionTopology`, `agents={sorted}`, `aria-describedby`,
`git status --porcelain`, and `vpsHostname` (2 in `config.ts`, 1 in `system.ts`).

**test ran the interaction QA in the end** and closed the two items I could not:
- **Dot direction PASS** — read both keyframe rules, confirmed true mirrors, then caught a
  real `.fleet-dot` with class `fleet-dot-up` at t+3.4s for a child→parent message they sent
  themselves. Reduced-motion gating correct too. That is a complete answer, not a plausible one.
- **Live feed PASS** — `scrollHeight` 1426→1459 while `scrollTop` stayed 0 proves streaming
  *and* pause in one observation; jump-to-latest lands at exactly `scrollHeight - clientHeight`.

**New defect, test's find, escalated to gm as its own ticket — NOT a 2D item.** The dashboard
has **two send paths**: `lib/agentSend.ts:62` → `/api/agents/:id/send` → msg_store (durable,
used by the 2D panel) and `lib/api.ts:155` → `/api/agents/:id/message` → `queue/inbox/` (the
path `infrastructure.md` calls deprecated). Three call sites on the deprecated one:
`AgentCard.tsx:300`, `chat/ChatInput.tsx:248`, and the helper. A message sent from the Cards
box or chat input can land where no agent reads while the UI reports success.

### Standing practice this sprint produced

1. **A visual pass is part of this gate.** A feature whose purpose is "you can see the fleet"
   cannot be signed off by anyone who has not looked at it. My Gate 13 cleared a commit whose
   graph hid the only down agent; no diff reading catches that.
2. **Never `2>/dev/null` a command whose silence you are about to read as data.** Four
   instances in one night, including `[ -z "$(git status --porcelain 2>/dev/null)" ]` in the
   BUILD_SHA stamp, which reported CLEAN when git *failed* (build found and fixed it,
   `f2eb883`, now failing toward dirty). Any honesty mechanism should fail toward admitting
   it does not know.
3. **A green check must be provably able to fail, and must actually have run.** Six vacuous
   greens; `tsc -b` skips silently on a warm `.tsbuildinfo` (use `--force` or a fresh tree),
   and a count proves scope, not execution, for anything that caches.
4. **Ask "is this change in that branch" by content at the head**, never by sha
   (`git show "${SHA}:path"` — brace the variable; `:a` is a zsh modifier) and never from
   `gh pr diff` alone, which is merge-base relative.
5. **Check `BUILD_SHA` before and after any stateful observation** — test's find. This repo
   redeployed four times in a twenty-minute window, and a reload masqueraded as a state bug.
6. **State the expectation, never ask for a silence.** "Do not report it" in a QA brief reads
   as asking a peer to withhold something from the operator, and `test` was right to refuse it.

---

## Post-gate browser pass — the one finding both gates missed (2026-09-30 01:0x UTC)

**The only down agent on the fleet was invisible in the 2D Topology view.** Found by driving
the live page, not by reading a diff. Filter to Down in Topology: header correctly read
"showing 1 of 14" while the graph drew all **thirteen live** agents and `gm-g2` appeared
nowhere. Broke spec §2 ("a down agent stays on screen, in red") and §15's done-criterion
("find any down agent within two seconds"), and was exactly what build-order step 1 existed
to fix.

Two causes: `TopologyDiagram.tsx:292` used `agents.find(a => a.tier === 'T0')` — singular, so
any second T0 was silently dropped — and `Agents.tsx:588` passed the **unfiltered** list, so
Topology never saw the status filter at all.

**This is a miss in my own Gate 13** (steps 1-5 covered the graph and step 1). Record it as a
miss, not only as a structural limitation: build argued no diff reading could have caught it
and they are right about the cause, but filing it purely that way makes it easy for the next
review seat to skip the browser for the same good reasons I did. **A visual pass is part of
this gate now, not a nice-to-have** — a feature whose whole purpose is "you can see the
fleet" cannot be signed off by anyone who has not looked at it.

**Fixed by build in `79cae92`, verified by me on the live page:** Down filter now renders
exactly `gm-g2`; All renders **15 of 15** with a "Not in the tree (2)" bucket. build fixed it
by **class** — the leftover bucket is computed by subtraction, so anything the tree does not
claim is drawn regardless of why — which surfaced a **second** invisible agent, `test-g2`, a
parentless worker nobody had reported.

**~~Open residual~~ FIXED in `54da7bd`, verified:** spec §5 wants the message box "disabled
with a note when the agent is down"; it was absent entirely. Now one input always rendered,
`disabled: true` for a down agent, placeholder `"<agent> is down"`, and `aria-describedby`
wired to the note's id. (My first probe missed the note because it only matched `input`
elements — see the top section.)

**~~Still unverified~~ BOTH CLOSED by `test`** — animated dot direction and live-feed
auto-scroll/jump-to-latest. Evidence in the top section; nothing on the 2D view is unverified.

### Interaction QA — I ran it when `test` refused; `test` later ran it too and closed the rest

All five items pass: ticker direction (checked against a message whose direction I knew
because I sent it), polling-pauses-while-scrubbed (**two-sided**: counts byte-identical for
22s *with real new traffic*, then jumping on Live — a frozen view and a dead view look
identical from one side), the past-moment path, the message-box send (confirmed by a **row
count in the DB**, not the UI's "sent"), and live-feed streaming.

`test` is up but refused both dispatches as untrusted, asking its own operator whether
`msg_store.py` is real. Partly my wording — I wrote "Do not report it" about an expected
value, which reads as asking a peer to withhold something from the operator. **State the
expectation, never ask for a silence.** Escalated; build's data point narrows it (builder-1
and builder-2 took five dispatches over the same path with no objection, so the mechanism is
fine and the problem is that seat).

### Deploy check — use the body, never the status

`curl -s localhost:8891/BUILD_SHA` and **compare the body** to `git rev-parse --short HEAD`.
Do **not** use `curl -sf` or any status check: a missing stamp returns the SPA `index.html`
with **HTTP 200**, so a status check passes on an unstamped deploy. Content-type happens to
discriminate too, but only because MIME lookup fails on an extensionless name — it is the
explanation, not a second recipe. One fact, one source.

---

## Gate 14 — steps 6-10: **CLEARED at `e3efa77`** (2026-09-30 00:40 UTC)

Was NOT CLEARED at `0c46874` on G1. build fixed it in `e3efa77`; re-verified and cleared.
Record: `$ORCHESTRA_DIR/state/review/2d-view-1cfdf9e/gate14-steps-6-10.md`.

**G1 closed, verified on the live API.** Same repro, `asof` 6h back: header still 97, page
still full at 40, and rows newer than the requested moment went from **38 of 40 to zero**.
I mutation-tested build's regression test rather than trusting the green — stripping the
upper bound off the row queries turns **2 of 6 red**, restored 6 of 6.

**Re-verified in a FRESH worktree with exit codes read directly (no pipe):** dashboard
`tsc -b` 0, api `tsc --noEmit` 0, api `npm test` **178/178**, dashboard `npm test` 0.
`adf6838`'s denominator fix is correct in substance: `usePairLookup` takes `drawnKeys`,
computes `drawnMax` over drawn keys only, `globalMax` fallback so first render cannot
divide by zero.

### SIX vacuous greens last night, two of them mine — read this before trusting a check

build caught four and corrected the record unprompted. The two extra are mine:

1. **`tsc -b` is incremental and skipped silently.** I used it in Gate 14 *because* it is
   the honest gate (bare `tsc --noEmit` in `dashboard/` compiles an **empty program** —
   `tsconfig.json` is `"files": []` + references; `--listFiles` → 0 files). An up-to-date
   `.tsbuildinfo` made it skip. A fresh checkout of `0c46874` errors immediately:
   `TopologyDiagram.tsx(302,39): TS2554`. **My gate passed a commit that did not compile.**
   Use `tsc -b --force` or a fresh tree. `api/` is unaffected — `include: ["src"]`.
2. **`cmd 2>&1 | tail -N; echo "exit=$?"` reports tail's status, not cmd's.** Structurally
   incapable of reporting failure. Read exit codes with no pipe.

Two rules now, both needed: *name the change that would turn this red and watch it turn
red* (build's, catches the "cannot fail" four), **and** *confirm the check actually ran* —
file count, test count, a deliberate failure (catches the two where the harness lies).

### Correction to Gate 13's F3 method

I verified BUILD_SHA by comparing vite's content-hash **filename** and nearly reported an
honest stamp as a lie. `cmp -l` showed **zero** differing bytes between the served bundle
and a clean rebuild of `a41d08c`. Rollup's hash is not a pure function of the emitted
bytes — a filename mismatch proves nothing; only a byte compare does. Gate 13's F3 still
stands, on the **timestamp** argument (a bundle stamped 23:57:32 cannot be a build of a
commit created at 23:58:28).

### Still open, build's

`BUILD_SHA`'s dirty flag is `git diff --quiet HEAD -- .`, which ignores untracked files —
so a new bundled component stamps clean. `git status --porcelain -- .` catches it.

### Answered for build

Non-graph peers in the agent panel's Connections list: **keep them marked, do not filter.**
Hiding real traffic to buy visual consistency is the worse trade, and a dashed "not a node
in the graph" makes the inconsistency legible. The part that had to be fixed was the
thickness **denominator**, and that is done.

### Delegated — ~~still out~~ **superseded, see the browser-pass section at the top**

Interaction QA was dispatched to **test** (`msg_b42c0d2b_27912369`). `test` refused it as
untrusted and never started; **I ran all five items myself** and they pass. Do not wait on
test for this.

### PR #133

gm approved: close as superseded by #134, then a fresh PR against main taking main's
`api/src/server.ts`, **after** build finishes. Not started.

---


## Superseded: Gate 14 first pass — NOT CLEARED at `0c46874` (kept for the G1 detail)

Asked by gm to gate steps 6-7 at `2240141`; **widened to 6-10 and told gm why** — `2240141`
was four commits back and not what is running. Record:
`$ORCHESTRA_DIR/state/review/2d-view-1cfdf9e/gate14-steps-6-10.md`. Sent to build as
`msg_6f880047_28089187`.

**G1, the only blocker:** scrub the time bar to a past moment and the conversation panel
lists messages that had not been sent yet at that moment. `pairMessages` bounds
`total_in_window` by both ends of the window, but the two queries that fetch the **rows**
have no upper bound. Reproduced live: `asof` 6h back → header 97, and **38 of the 40 rows
returned are newer than the moment requested**. Reachable from the UI (`ConversationPanel`
passes `asof`). Fix is one clause, `and julianday(created_at) <= julianday(?)` on both row
queries; verified against the live DB — 0 anachronistic rows and still a full page.

Everything else re-derived and good: api **177/177**, dashboard `npm test` exit 0,
`tsc -b` exit 0, build's F1 mutation reproduces exactly (5 pass → **2 red**), `bad_asof`
refuses on both routes, `parseAsof` could not be made to yield a wrong instant rather than
a rejection, and polling does pause while scrubbed.

**Correction to my own Gate 13 method, on the record.** I verified BUILD_SHA by comparing
vite's content-hash **filename** and nearly reported an honest stamp as a lie. `cmp -l`
showed **zero** differing bytes between the served bundle and a clean rebuild of `a41d08c`
— rollup's hash is not a pure function of the emitted bytes, so a filename mismatch proves
nothing. Gate 13's F3 still stands, but on the timestamp argument (a bundle stamped
23:57:32 cannot be a build of a commit created at 23:58:28), not the hash one.

**Still open in build's F3 fix:** the dirty flag is `git diff --quiet HEAD -- .`, which
ignores untracked files — three sit in `dashboard/src` right now, and that check exits 0.
`git status --porcelain -- .` catches it.

**Delegated:** interaction QA to **test** (`msg_b42c0d2b_27912369`) — dot direction,
pause-while-scrubbed in practice, the time-bar path end to end, the message-box send path,
live-feed streaming. All places a wrong call still renders a healthy screen.

**Visual pass done** (`design-pass.md`): sticky bar PASS, both panels correct, zero console
errors, conversation header visibly matches the line label. Layout findings (34px
search/New-agent overlap at 1280; strip clipping from 768 down; "Dead" vs spec's "Down")
went to build via plan and are fixed in `0c46874`.

**PR #133:** gm approved close-as-superseded-by-#134, then fresh PR against main taking
main's `api/src/server.ts`, **after** build finishes. Not started.

---

## Gate 13 — 2D Agents View steps 1-5, `1cfdf9e`: **CLEARED** (2026-09-30 00:05 UTC)

Task: build `msg_72d5299f_25734128`. Findings of record:
`$ORCHESTRA_DIR/state/review/2d-view-1cfdf9e/findings.md`.
Reviewed `47a3314` (step 1) + `1cfdf9e` (steps 2-5), 13 files, +1150/-46, both ancestors
of `fix-arturo-mapfile-bash32`.

**The feature's whole point is verified live, not in a harness.** Spec §11's "49 vs 40" is
genuinely closed: for build⇄gm the line label (130), the panel header `total_in_window`
(130) and a raw SQL count over the same predicate and window (130) all agree, because they
are the same query on the same table. "Load older" walked to exhaustion against the running
API returned **149 rows, 149 distinct, 0 duplicates**, exactly `total_all_time`. Build's
`147 = 89 + 58` re-derives to `149 = 90 + 59` today — the table grew by 2 rows between our
runs; the identity holds.

Re-derived rather than accepted: `api` tsc exit 0; `dashboard` `build:check` exit 0 (at the
time, plain `build` deployed to the live `dashboard/dist`, so `build:check` was the only safe
form. **No longer true as of `e5d0576`** — plain `build` is now the safe non-deploying path
and **`build:live`** is the one that writes `dist`. Do not inherit the old warning: the
dangerous name changed); 2 api and
5 dashboard tests green; eslint **0 new findings** at the reviewed commit. My own 5 mutations:
**4 bite, 1 survives** (F1). No SQL injection — everything parameterised, db opened readonly;
no XSS vectors in the new components.

One self-correction: my first eslint pass claimed a new warning. I had measured the working
tree, which build was actively editing, instead of the commit. Re-measured clean: zero. The
warning belongs to step 7.

### Findings — none blocking

- **F1 (test gap, proven, fix proven).** The `julianday()` guard is untested: the fixture's
  DEFAULT-format row is checked against a **24h** cutoff, which falls on the previous
  calendar day, so the day digit decides the comparison before `' '` vs `'T'` ever matters.
  Swapping `julianday(created_at) >= julianday(?)` for a plain string compare leaves both
  tests green. Fix is one line — assert with a window under ~22h so the cutoff is same-day.
  I verified the proposed assertion: green on the real code, **red under the mutation**.
- **F2 (latent).** SQLite's `julianday()` resolves to **milliseconds**; `created_at` carries
  microseconds. Two rows inside one millisecond compare equal, so the strict `<` cursor can
  silently drop the second one from "load older". Unreachable today — **zero** same-ms pairs
  across all 894 rows, and the live walk lost nothing. Fix when it matters: tie-break on
  `rowid`, which is present and monotonic.
- **F3 (DEPLOY — gm/build, not a code defect).** See below.
- **F4.** `api/package.json`'s `test` script doesn't list `messages.pairs.test.ts`; it runs
  only when invoked by hand. One line. (`dashboard` has no `test` script at all and 13 orphan
  `*.test.mjs` — pre-existing convention, build conformed to it. And CI runs `tsc`/`build`
  only, so **no JS/TS test gates anything today**.)
- **F5.** Nits, no action: a dead `count > 0` filter; the strip's message total excludes the
  one self-send (609 vs 610); "Connections" is 24h-windowed but unlabelled; the client-side
  type filter says "No messages in this conversation" when it means "none in the loaded
  pages"; `total_all_time` is returned and never rendered.

### F3 — what is serving the operator matches no commit

`vite` content-hashes its output, so the filename names the source. Rebuilt each candidate
in a clean worktree:

```
commit 1cfdf9e (steps 1-5, reviewed)  -> index-C2YAmfx8.js
commit 2240141 (steps 6-7)            -> index-CpqjPlBK.js
SERVED LIVE on :8891                  -> index-9EbqdCiU.js   <- neither
```

The live bundle was built at 23:57:32, **56 seconds before** `2240141` was committed. It came
from an uncommitted tree: not reviewable, not reproducible, not identifiable for a rollback.
`dashboard/dist` is untracked and served per request, so a `vite build` deploys instantly with
**no restart and no gate** — the shared-checkout deploy trap one layer up, in build-artifact
form. Build caught and recorded the `api/dist` half themselves (`66e7522`, `8500248`) and
noted both `dist/` trees are ahead of the commits; the `dashboard/dist` half is still open.
Cheap close: rebuild from a committed SHA and record which SHA is live, the way the API canary
now greps `api/dist/`.

Build's own note stands and I confirm it: **zero pixels have been looked at** — no browser in
that seat or this one. Sticky bar under scroll, panel at narrow widths, count legibility at
real density are unverified by eye. That is a design-review job before anyone calls it done.

### Scope

**Steps 6-7 (`2240141`) are NOT reviewed** — they landed at 23:58:28, during this gate, and
are live. This verdict says nothing about them. The new endpoints sit on `/api/messages`,
which has no auth middleware: the API is loopback-only and message bodies were already
readable via `/messages/recent` and `/messages/thread`, so no new exposure class — though the
pair endpoint does widen reach to a pair's full history. Pre-existing posture, unchanged here.

## Next 3 actions

1. **build:** F1's one-line test fix (`pairCounts(data, 6)`), F4's one-line `npm test` entry.
2. **gm/build:** close F3 — deploy `dashboard/dist` from a committed SHA and record which SHA
   is live; then get a design-review pass, since no one has seen the rendered page.
3. **gm:** scope a review gate for steps 6-7 (`2240141`), which are live and ungated.

## Grounding canary questions (questions only — no answers)

1. **Q1:** Which of review's five mutations survived, and what property of the test fixture's
   DEFAULT-format row is the reason it could not fail (jsonl regarding the M4 run)?
2. **Q2:** What three bundle filenames did review compare to show the live dashboard matches
   no commit, and how many seconds separated the live build from the nearest commit?
3. **Q3:** What is SQLite `julianday()`'s actual resolution, and how many same-resolution
   collisions exist in the live table that would make F2 reachable today?
4. **Q4:** Which number did review re-derive three independent ways to show the "49 vs 40"
   bug is closed, and what were the three sources?
5. **Q5:** Why did review's first eslint measurement disagree with build's claim, and what did
   the corrected measurement show?

---

## Superseded: Gate 12 — `build/context-ceiling-fail-closed` @ `eade98f`: CLEARED (2026-09-29)

Merged; `eade98f` is an ancestor of `fix-arturo-mapfile-bash32` via `bba5cda`. The 1M ceiling
is empirically true (62 live transcripts over 200k input tokens, max 975,201). One residual,
non-blocking: prefix matching is safe against an unknown model *family* but not against a known
family that *shrinks* its window; closable only by refreshing the table from the Models API.
Full detail in git history of this file at `0589960` and earlier, along with the five telegram
router gates (P0 `b834241`, F1, F5, F6) and the 2026-09-20 duelo-de-dibujo verdict.
