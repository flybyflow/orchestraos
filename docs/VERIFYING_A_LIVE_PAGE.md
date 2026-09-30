# Verifying a live page

**`chrome --headless` renders nothing on this install.** Every variant — `--dump-dom`,
`--screenshot`, `--headless=new`, `--headless=old`, a fresh `--user-data-dir` — returns
exit 124 and zero bytes, on any URL including `data:` and `file:`, across all three
installed chromium builds. `node_repl`/playwright produces no output either. The binary
itself is fine (`--version` works); it is the CLI rendering path that is broken.

This document is the method that does work, written up after PR #137's gates and the
`2d-view-v2` bisect, where a blank page shipped past `tsc`, twenty green test suites, a
clean `vite build` and a correct API — and only a rendered page caught it.

---

## Rule 0 — render a known-good control first, every time

**Before reporting anything about a page, render a page you know works, in the same browser,
in the same minute.** Without it, "the page is blank" and "my tooling is broken" are
indistinguishable, and you will report the wrong one.

This is not a formality. On 2026-09-30 a seat spent an hour fixing an overlay because the
render failure was attributed to headless Chrome and to an SSE stream. The control settled
it in one line:

```
control  450cd1a   root.childElementCount = 1     (renders)
target   794b0aa   root.childElementCount = 0     (blank)
```

Same driver, same proxy code, same minute, alternated twice. That pair turned an assumed
tooling problem into a reproducible product blocker. Either half alone proves nothing.

Keep a known-good commit built and serving on a spare port for the duration of a gate. The
cheapest mount check is:

```js
(document.getElementById('root') || {}).childElementCount
```

And when a page renders nothing, `performance.getEntriesByType('resource')` tells you
whether the app *executed* — a mounted-but-blank React app still fires all its queries.
"Bundle loaded, queries fired, root empty" is a render-phase failure, not a boot failure.

---

## The driver

```
~/.claude/skills/gstack/browse/dist/browse
```

CDP-based, not the Chrome CLI — which is the whole reason it works here. Reach it through
the gstack `/browse` skill, or run it directly. With no arguments it lists ~70 commands; the
ones that carry the work are `goto`, `js`, `screenshot`, `snapshot -i`, `console`, `text`,
`responsive`, `closetab`.

`js` is the workhorse: it evaluates an expression in page context and returns the result.

**Known limits, found the hard way:**

- **Settle before you read.** Polling 2 s after `goto` returned an empty page that rendered
  fine at 3 s. A premature read looks exactly like a broken page. This produced a false
  datapoint that was reported before being caught.
- **`console` is not reliable here.** It reported "no messages" on a page that had
  demonstrably executed. Treat empty console output as *unknown*, never as *clean*.
- **No pre-load hooks.** `Page.addScriptToEvaluateOnNewDocument` is denied by the tool's CDP
  allowlist (deny-default), so you cannot install an error handler before the bundle runs.
  Getting a stack trace out of a blank page is currently not possible from here — hand that
  to whoever has devtools.

---

## Standing up the branch you are gating

`:8891` serves `<repo>/dashboard/dist`, which **is** the deployed bundle. Never build into
it. Gate from a worktree, which has its own `dist`:

```bash
# inside the worktree, NOT the live repo
(cd api       && npm run build)          # -> worktree api/dist
(cd dashboard && npx tsc -b --force)     # --force: tsc -b silently skips on a warm cache
(cd dashboard && npx vite build)         # -> worktree dashboard/dist

(cd api && env -u TMUX -u TMUX_PANE PORT=8899 ORCHESTRA_API_PORT=8899 node dist/server.js) &

NODE_PATH=<live-repo>/node_modules \
  ORCHESTRA_DASHBOARD_PORT=8898 ORCHESTRA_API_PORT=8899 \
  node dashboard-proxy.js &              # serves __dirname/dashboard/dist
```

- **`env -u TMUX -u TMUX_PANE` is mandatory.** Otherwise `msg_store` derives the caller from
  the inherited pane, sees `caller=<seat>` against `--from operator`, and refuses every
  durable write as impersonation. The supervisor strips these for the live API (`df92625`);
  an isolated instance does not inherit that protection. This cost an hour and nearly
  produced a false CRITICAL bug report against a working change.
- **`NODE_PATH`** — `dashboard-proxy.js` requires `ws` from the live repo's root
  `node_modules`; a worktree has none.
- **Rebuild the API too**, not just the dashboard, when bisecting. Gating an old dashboard
  against a newer API tests a combination that does not exist.
- **Confirm what you are actually serving**: compare the bundle filename in the page's own
  `<script src>` against the one `vite build` just emitted. A stale cache is silent.

## Staging rows the fleet does not currently have

Copy the data dir and point the API at the copy — zero live state touched:

```bash
mkdir /tmp/orch-gate
cp ~/.orchestra/registry.json /tmp/orch-gate/
cp -R ~/.orchestra/state      /tmp/orch-gate/
# edit /tmp/orch-gate/registry.json, then:
ORCHESTRA_DIR=/tmp/orch-gate env -u TMUX -u TMUX_PANE PORT=8895 node dist/server.js
```

**Liveness is derived from the real tmux session, not the registry row.** A row with no
session reads as genuinely down — that is how you stage a down agent. A row whose session
exists **cannot be faked down**: the process table is not isolated by `ORCHESTRA_DIR`.

---

## Verifying structure rather than appearance

- **Order is not nesting.** A flat list in the right sequence is indistinguishable from a
  tree. Prove grouping by DOM containment — walk up from a child to the nearest ancestor
  containing exactly one candidate parent.
- **Enumerate; do not probe for the shape you expect.** A selector narrower than your claim
  reports absence for things that are present. This produced three false "not found"s in one
  night, twice within ten minutes of being corrected for it.
- **Test the consequence, not the proxy metric.** A connection count rose when a panel
  *closed* and never drained on idle — it was measuring keep-alive sockets, not streams. The
  usable test for a leak was whether a `fetch()` from the page still returned.
- **Check where a string appears before reporting it.** A bare substring match found a hidden
  agent's name on the page; it was in the message ticker, not the graph.
