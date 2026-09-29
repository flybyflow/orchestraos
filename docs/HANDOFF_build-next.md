# Handoff: build -> next build generation
- **Lineage:** build (Gen 3, 2026-09-29 overnight)
- **Timestamp:** 2026-09-30T00:05:00Z
- **Working Directory:** /Users/flybyflow/orchestraos (**shared with plan/review/ship — commit only through `scripts/git-lock.sh` with explicit pathspecs**)
- **Second working tree:** `/tmp/sec01-toddito` (clone of `brollistika/toddito`, branch `main`) — the Pulse/Toddito security work. In `/tmp`, so treat it as disposable and push after every commit.
- **Last Commit SHA (orchestraos):** `1cfdf9e` on `fix-arturo-mapfile-bash32`
- **Last Commit SHA (toddito):** `4f83b9f` on `main`, pushed and remote-verified

## 1. Current Goal & Phase State
Two workstreams, both at a clean stopping point. Nothing half-applied in either tree.
- **2D Agents View** (`docs/2d-agents-view-spec.md`, task from plan `msg_5ed403a1_24335965`): build-order steps **1-5 COMPLETE**. Steps 6-11 not started and explicitly not claimed.
- **Toddito security backlog** (gm): SEC-01/02/04/05/06 closed earlier; **SEC-03 closed tonight** (`4f83b9f`), **SEC-08 partial landed** (`f7c3111`).

## 2. Open Loops
- [ ] **API server has not been restarted**, so `GET /api/messages/pair-counts` and `/pair/:a/:b` 404 against the running dashboard and the two new panels show nothing. Deliberate: the live process runs from this shared tree, so a restart deploys whatever branch is checked out at that moment. **Before any restart, confirm the checkout still contains `47a3314`.** Flagged to plan and review; not build's call.
- [ ] **One design decision awaiting plan's confirmation.** The pair endpoint returns `total_in_window` AND `total_all_time` because §6 wants a header total and unbounded "load older", and one number cannot be both. If plan wants a single number, either the line and the header disagree again or pagination has to stop at the window edge. Asked in `msg_8aba98d1_25657252`.
- [ ] **gm is holding a correction, not a deliverable.** `msg_b076d726_25616041`: the SEC-03/SEC-08 "real fix" I recommended and gm authorized **does not exist** for this app. Nothing was built. gm had planned a morning go/no-go for the operator built on my wrong premise; the correction reached gm before that. Do not resurrect the ElevenLabs initiation-webhook plan without re-reading it.
- [ ] **My two 2D commits land inside PR #133**, whose head branch is the checked-out `fix-arturo-mapfile-bash32`. That PR is now 85 files spanning a router P0 fix, API identity-spoofing fixes, org hardening and this feature. A review problem, not a build problem, but nobody should be surprised by it.

## 3. Decisions Made & Rationale
1. **Both new message endpoints read only `<data>/state/tasks.db`'s `messages` table.** Rationale: spec §16, and three other stores in this repo already disagree with each other. "49 vs 40" is what picking two of them looks like.
2. **`julianday()` for every time comparison, not string compare.** All 871 rows today are ISO-8601 with `+00:00`, but the column DEFAULT writes `'YYYY-MM-DD HH:MM:SS'`, which sorts before every ISO row (space < `'T'`) and would silently vanish from the window. The one remaining string compare (`last_at`) has its ceiling named in the code.
3. **Machine alias map in Overview.tsx.** `/api/system` keys cards `mac`/`vps`; `/api/agents` rows carry `'vps'` or `'local'` and none say `'mac'`. Matching the key directly would have given the Mac card a permanent silent 0 — the same bug class the change exists to remove. Checked live, not assumed.
4. **Line thickness is sqrt(count/busiest), not linear.** With a busiest line near 150, linear renders a real-but-quiet 3-message line at the same 1px as a dead one, erasing the distinction the view exists to show. Caps at 5px (§12), floors at 1px because an invisible line cannot be clicked.
5. **Shipped the agents-only half of §8 search rather than an inert input.** A control that does nothing is worse than one that does less than the spec. The rest is step 10 and is labelled as such in the code.
6. **SEC-03: stripped one field, not six.** All six PII fields are load-bearing — they travel page.tsx -> useElevenLabsSession -> the agent's system prompt, and ElevenLabs takes dynamic variables only from the client. Per gm's instruction, err toward keeping and flag. Only the `client_org` echo on the 503 branch was confirmed unused.
7. **SEC-08 guards `'scored'` only, deliberately not `'completed'`.** `'completed'` is an intermediate state the same webhook sets before scoring; refusing it would break legitimate EL retries and the cleanup-stuck-sessions cron.

## 4. Declared First Effect
`git log --oneline -1` must be `1cfdf9e`, and `grep -c total_in_window api/src/routes/messages.ts` must be `>= 2`. Then read `msg_b076d726_25616041` (the gm correction) before touching anything ElevenLabs-shaped.

## 5. Next 3 Immediate Actions
1. Read plan's answer on the two-count decision (open loop 2) before anyone builds step 9's window picker on top of it.
2. If 2D work continues: step 6 (selection highlight and fade) is the natural next one — `selectedAgentId` already reaches `TopologyDiagram` and drives a ring, so the fade-others half is what remains.
3. Do NOT restart the API server without first confirming the checkout contains `47a3314` (open loop 1).

## 6. Grounding Canary Questions (Questions Only — No Answers!)
1. **Q1:** What single property of the `created_at` column made a string comparison unsafe for the window filter, and which value writes it that way (jsonl:msg_8aba98d1_25657252 regarding the julianday decision)?
2. **Q2:** Which machine name does `/api/agents` never return, and what would the Mac card have shown if the card key had been matched straight against the agent field (jsonl:msg_8aba98d1_25657252 regarding the alias map)?
3. **Q3:** Which assertion in the line-maths test does linear scaling fail while passing every other assertion in the same file (jsonl regarding the five-way mutation run on topologyLines)?
4. **Q4:** Why is an ElevenLabs conversation-initiation endpoint dead code rather than merely disabled in this app, and what does the webhook's inbound body actually contain (jsonl:msg_b076d726_25616041)?
5. **Q5:** Why does a single-use token bound to the session fail to close SEC-08, given the attacker's precondition (jsonl:msg_b076d726_25616041 regarding the idea killed before proposing it)?
