# Handoff: builder-3 -> builder-3-g2
- **Lineage:** builder-3 (Gen 1 -> Gen 2)
- **Timestamp:** 2026-10-01T01:25:00Z
- **Working Directory:** /Users/flybyflow/orchestraos
- **Feature worktree:** /tmp/builder-3-consulting-communicator (branch `feat/consulting-communicator`, repo `brollistika/toddito`)
- **Last Commit SHA:** 7bb60a7 (feature work, rebased onto toddito/main d394cb3); bf265fa in orchestraos

## 1. Current Goal & Phase State
- **Goal:** Build the Client Relationship / Consulting Communicator facet on Toddito (dispatched by gm, `msg_4af7b758_14573282`).
- **Plan Reference:** `docs/PLAN_toddito-engineering.md` §7, §7a (this repo). Three verified corrections to it reported to `plan` in `msg_4a0235dc_16420681`.
- **Phase:** BUILD COMPLETE. PR brollistika/toddito#2 open and mergeable, awaiting review.
- **Current Step:** Nothing in flight. Both of gen1's blockers are now CLOSED (repo answered by gm, design shape answered by plan).

## 2. Open Loops & Active Callbacks
- [ ] **PR awaiting review** — https://github.com/brollistika/toddito/pull/2. Do NOT merge; the brief said no push to main without review.
- [x] **RESOLVED — repo identity.** gm ruled toddito (`msg_d2f5b495_15153018`) and I verified it: `toddito/main` = `d394cb3`, 2026-10-01 00:51 UTC, and `git merge-base --is-ancestor fed0b43 toddito/main` exits 0, i.e. toddito CONTAINS pulse's head `fed0b43` (2026-08-10). My original inference from PR counts and ahead/behind was wrong — the team pushes straight to main, so "0 PRs" measured workflow not activity. Rebased cleanly; `pulse#150` closed unmerged and the stray pulse branch deleted.
- [x] **RESOLVED — per-client vs standing profile.** plan confirmed per-engagement/per-client is correct (`msg_b5db21b8_16587772`); all 16 items reference a named `%2` contact and cannot be made context-free without exceeding OD4. Implementation already matched.
- [x] **NOTED — plan re-verified all three §7a corrections** independently and folded them into `§7a.7`, orchestraos commit `5f777b8`.
- [ ] **build's v2 task is PARKED, not cancelled** (`msg_f92f2187_17644091`, withdrawn by `msg_dbd33a6b_17746853`). Never read or started — nothing touched. Worth doing when it returns; the method section in it is good.
- [ ] **Voice path blocked on an external artifact.** Agent question sets live in the ElevenLabs dashboard, not the repo. Needs a self-check agent created there with the 16 items loaded, then an agent-ID lookup. Form path ships meanwhile so the facet works.
- [ ] **OD6 still gates wide deployment** of the voice path (biometric data about the consultant).
- [ ] **Per-person privacy is a named follow-up.** `self_check_reports` has no `user_id`, so it is workspace-private, not person-private. UI copy was corrected to match what is enforced. Making it per-person needs `user_id` + a filter at every read site.
- [ ] **5 known issues carried, not absorbed** — listed in the PR body under "Carried as known issues". The sharpest: `/api/sessions/[id]/score` has no auth and is not in the middleware matcher (pre-existing; that file is being edited on `report-redesign-alt-controlroom`).
- [ ] **One product decision needed:** the one-item `expectations` facet carries a sixth of the headline score, so a single click moves the overall 1.66 points. Weight by item count, or require >=2 items per facet.

## 3. Decisions Made & Rationale
1. **Decision:** `sessions.output_kind` column, NOT a new `tier` value — **Rationale:** `tier` selects one ElevenLabs agent per value and drives a binary lite/full prompt switch (`score.ts:22`); a new tier falls through to the ORG prompt and produces a confident report about the wrong instrument.
2. **Decision:** facet lives at `/dashboard/self-check`, not `/admin/self-check` as the brief said — **Rationale:** `ConsoleLayout`'s own comment makes `/admin` the operator back-of-house (ADR 003) and `/dashboard` the consultant console. The respondent is the consultant. §7a.6 had mapped the operator's `/dashboard/engagements` URL to the wrong file.
3. **Decision:** scoring prompt written from PLAN §9.4 + §2a, not from the current `prompt.ts` — **Rationale:** the brief said to inherit the post-tone-fix state, but the fix has NOT landed; `prompt.ts` still has `TONE: Clinical` at lines 171 and 326 on `origin/main` fed0b43.
4. **Decision:** shipped a form path alongside the voice path — **Rationale:** voice cannot run without an ElevenLabs agent that does not exist, so voice-only would ship a dead page. The 1987 instrument was a rated questionnaire anyway.
5. **Decision:** the org-pipeline guard lives in `scoreAndPersistSession`, not at its callers — **Rationale:** three dispatch sites reach it; one guard beats three, and it rides a lookup that was already there.
6. **Decision:** webhook fails CLOSED on an unreadable `output_kind` — **Rationale:** failing open writes a `reports` row and `/report/[id]` is unauthenticated, so "preserve old behaviour" would publish a private transcript. Not scoring is recoverable; publishing is not.
7. **Decision:** dropped the explicit `to anon, authenticated using (false)` RLS policy — **Rationale:** proven by running the migration on clean postgres 16 (`role "anon" does not exist`), and redundant against migration 017's RLS-with-no-policies convention.
8. **Decision:** ran /ship's verification and review gates but not its release-prep steps — **Rationale:** `gstack-version-bump classify` returns `DRIFT_UNEXPECTED` (no VERSION file) and this repo uses plain conventional-commit titles. Introducing a versioning scheme was not the ask.
9. **MISTAKE, recorded so it is not repeated:** I decided the repo question from PR counts and an ahead/behind count — derived metrics — and shipped a PR to the wrong repository. Commit dates and one `merge-base --is-ancestor` call were available the whole time and settled it immediately. When a primary signal is cheap, do not reason from a proxy.

## 4. Declared First Effect
`gh pr view 2 --repo brollistika/toddito --json state,reviewDecision,mergeable` — if review comments exist, address them in the worktree at `/tmp/builder-3-consulting-communicator` (already on the correct `toddito/main` base).

## 5. Next 3 Immediate Actions
1. `python3 msg_store.py inbox --agent builder-3` — both prior blockers are answered; check for review feedback or new work.
2. `gh pr view 2 --repo brollistika/toddito --comments`
3. If unblocked on the ElevenLabs agent: add the self-check agent-ID lookup so the voice path activates by config, not code.

## 6. Grounding Canary Questions (Questions Only — No Answers!)
1. **Q1:** Per msg_store `msg_df0f5952_14934695`, what byte offset and record geometry establish that the recovered instrument has 16 items, and which single detail about the longest record proves the boundaries are real rather than a chosen width?
2. **Q2:** Per msg_store `msg_4a0235dc_16420681`, which two ASF files did §7a.2 confuse, and which one actually holds the question items?
3. **Q3:** Per commit `146fb02`, what exact response set produced a "10 / 10 · On solid ground" headline before the fix, and which facet was silently excluded from that number?
4. **Q4:** Per commit `146fb02`, which error did applying migration 034 to a clean postgres 16 produce, and what did removing the offending statement rely on instead?
5. **Q5:** Per msg_store `msg_d2f5b495_15153018` and `msg_d9b3a8c5_18308766`, which single git command settled the repo-identity question, what did it prove about the relationship between the two remotes, and which proxy metric had misled gen1 into the wrong answer?
