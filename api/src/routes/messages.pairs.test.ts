/**
 * 2D Agents View step 1 (spec §16): the connection-line count and the conversation
 * panel read ONE table — <data>/state/tasks.db `messages` — so the line and the panel
 * header cannot disagree the way "49 vs 40" did.
 *
 * What these tests bite on, specifically:
 *  - a pair is UNORDERED (A->B and B->A are one line);
 *  - the window is a real filter, computed with julianday() so a non-ISO created_at
 *    (the column DEFAULT writes 'YYYY-MM-DD HH:MM:SS') still lands in the window
 *    instead of silently sorting to the bottom;
 *  - `before` paginates strictly older, never re-sending the boundary row, and is NOT
 *    capped by the window;
 *  - has_more is observed (limit + 1), not inferred from a full page.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import Database from 'better-sqlite3';
import { pairCounts, deadPairs, pairMessages, parseAsof, oldestMessageAt, alertMessages } from './messages.js';

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

/** Fixture: gm<->build 3 rows in-window + 1 row 40 days old, gm<->plan 1, one self-send,
 *  one archived row, one row written in the column's DEFAULT format (no 'T', no offset),
 *  and gm<->ship with ONLY a 40-day-old row (a real pair, zero traffic in a 24h window —
 *  the dead-link case). gm<->build's in-window rows are deliberately mixed type (task,
 *  reply, task) so the same fixture also exercises the by_type breakdown without a second db.
 *  Direction fixtures: plan<->test is majority one-way (4 plan->test, 1 test->plan);
 *  brain<->think is exactly even (2 each way — a real "must not get a direction" case);
 *  bshr<->ship is a single message (one side 1, the other 0). */
/**
 * Alert fixture, deliberately SEPARATE from makeDb(). makeDb is shared and several
 * tests assert exact counts and sums against it — adding escalations there would
 * silently change other people's expected numbers, which is how a shared fixture
 * becomes a source of spooky failures. Cheaper to build a second one.
 */
function makeAlertDb(): string {
  const data = mkdtempSync(join(tmpdir(), 'orch-alerts-'));
  mkdirSync(join(data, 'state'));
  const db = new Database(join(data, 'state', 'tasks.db'));
  db.exec(`create table messages (id text primary key, conversation_id text, from_agent text,
           to_agent text, type text, subject text, body text, priority text, status text,
           created_at text, delivered_at text, acknowledged_at text, archived_at text)`);
  const ins = db.prepare(`insert into messages
    (id,from_agent,to_agent,type,subject,body,priority,status,created_at,archived_at)
    values (?,?,?,?,?,?,'high','pending',?,?)`);
  ins.run('a1', 'review', 'build', 'escalate', 's', 'b', hoursAgo(2), null);
  ins.run('a2', 'build', 'gm', 'escalate', 's', 'b', hoursAgo(3), null);
  ins.run('a3', 'gm', 'reflect', 'held_message', 's', 'b', hoursAgo(4), null);
  ins.run('a4', 'review', 'build', 'escalate', 's', 'b', hoursAgo(24 * 30), null); // outside 24h
  ins.run('a5', 'gm', 'build', 'reply', 's', 'b', hoursAgo(1), null);              // not an alert
  ins.run('a6', 'gm', 'gm', 'escalate', 'self', 'b', hoursAgo(1), null);           // self-send
  ins.run('a7', 'ea', 'gm', 'escalate', 's', 'b', hoursAgo(1), hoursAgo(0.5));     // archived
  db.close();
  return data;
}

function makeDb(): string {
  const data = mkdtempSync(join(tmpdir(), 'orch-pairs-'));
  mkdirSync(join(data, 'state'));
  const db = new Database(join(data, 'state', 'tasks.db'));
  db.exec(`create table messages (id text primary key, conversation_id text, from_agent text,
           to_agent text, type text, subject text, body text, priority text, status text,
           created_at text, delivered_at text, acknowledged_at text, archived_at text)`);
  const ins = db.prepare(`insert into messages
    (id,from_agent,to_agent,type,subject,body,priority,status,created_at,archived_at)
    values (?,?,?,?,?,?,'medium','pending',?,?)`);
  ins.run('m1', 'gm', 'build', 'task', 's1', 'b1', hoursAgo(5), null);
  ins.run('m2', 'build', 'gm', 'reply', 's2', 'b2', hoursAgo(3), null);   // other direction, same line
  ins.run('m3', 'gm', 'build', 'task', 's3', 'b3', hoursAgo(1), null);    // newest
  ins.run('m4', 'gm', 'build', 'task', 'old', 'b4', hoursAgo(24 * 40), null); // outside a 24h window
  ins.run('m5', 'gm', 'plan', 'task', 's5', 'b5', hoursAgo(2), null);
  ins.run('m6', 'plan', 'plan', 'task', 'self', 'b6', hoursAgo(2), null); // self-send: not a line
  ins.run('m7', 'gm', 'build', 'task', 'gone', 'b7', hoursAgo(2), hoursAgo(1)); // archived
  // Written the way the column DEFAULT datetime('now') writes it: space separator, no offset.
  // Lexicographically this sorts BEFORE every ISO row; julianday() places it correctly.
  ins.run('m8', 'gm', 'review', 'task', 'default-fmt', 'b8',
    new Date(Date.now() - 2 * 3600_000).toISOString().replace('T', ' ').replace(/\..*$/, ''), null);
  ins.run('m9', 'gm', 'ship', 'task', 'long-dead', 'b9', hoursAgo(24 * 40), null); // dead: real pair, zero in-window traffic
  ins.run('m10', 'gm', 'test', 'task', 'archived-only', 'b10', hoursAgo(24 * 40), hoursAgo(24 * 39)); // archived AND outside the window — not a real pair at all
  // Direction fixtures.
  ins.run('m11', 'plan', 'test', 'task', 'd1', 'x', hoursAgo(4), null);
  ins.run('m12', 'plan', 'test', 'task', 'd2', 'x', hoursAgo(3.5), null);
  ins.run('m13', 'plan', 'test', 'task', 'd3', 'x', hoursAgo(3), null);
  ins.run('m14', 'plan', 'test', 'task', 'd4', 'x', hoursAgo(2.5), null);
  ins.run('m15', 'test', 'plan', 'reply', 'd5', 'x', hoursAgo(2), null); // 4 plan->test, 1 test->plan
  ins.run('m16', 'brain', 'think', 'task', 'e1', 'x', hoursAgo(4), null);
  ins.run('m17', 'brain', 'think', 'task', 'e2', 'x', hoursAgo(3), null);
  ins.run('m18', 'think', 'brain', 'reply', 'e3', 'x', hoursAgo(2), null);
  ins.run('m19', 'think', 'brain', 'reply', 'e4', 'x', hoursAgo(1), null); // exactly even: 2 and 2
  ins.run('m20', 'bshr', 'ship', 'task', 'single', 'x', hoursAgo(1), null); // single message: one side 1, other 0
  db.close();
  return data;
}

test('pairCounts collapses both directions, honours the window, drops self-sends and archived', () => {
  const data = makeDb();
  const rows = pairCounts(data, 24);
  const byPair = new Map(rows.map((r) => [`${r.a}|${r.b}`, r]));

  // m1 + m2 + m3 = 3. m4 is outside the window, m7 is archived — neither counts.
  assert.equal(byPair.get('build|gm')?.count, 3, JSON.stringify(rows));
  assert.equal(byPair.get('gm|plan')?.count, 1);
  assert.equal(byPair.get('plan|plan'), undefined, 'a self-send is not a connection line');
  assert.ok(!rows.some((r) => r.a === 'gm' && r.b === 'build'), 'pair keys are sorted, so only build|gm');

  // The DEFAULT-format row must be inside a 24h window. A lexicographic compare would drop it.
  assert.equal(byPair.get('gm|review')?.count, 1, 'non-ISO created_at must still land in the window');

  assert.ok(rows[0].count >= rows[rows.length - 1].count, 'busiest first');

  // last_at must be the newest row on that line. Cross-checked against the OTHER endpoint
  // rather than a hardcoded timestamp, so the line tooltip and the panel cannot drift.
  assert.equal(byPair.get('build|gm')?.last_at,
    pairMessages(data, 'gm', 'build', 1, null, 24).messages[0].created_at);

  // A wide window pulls the 40-day-old row back in — proof the filter is the window, not a fixture artefact.
  const wide = new Map(pairCounts(data, 24 * 90).map((r) => [`${r.a}|${r.b}`, r]));
  assert.equal(wide.get('build|gm')?.count, 4);

  assert.deepEqual(pairCounts(join(data, 'nowhere'), 24), []);  // no db = empty, never throws
});

test('by_type breaks down per pair and always sums to the existing total', () => {
  const data = makeDb();
  const rows = pairCounts(data, 24);
  const byPair = new Map(rows.map((r) => [`${r.a}|${r.b}`, r]));

  // m1 (task) + m2 (reply) + m3 (task) = build|gm, mixed types.
  const buildGm = byPair.get('build|gm');
  assert.ok(buildGm, 'build|gm must be present, or this proves nothing');
  assert.deepEqual(buildGm.by_type, { task: 2, reply: 1 });
  assert.equal(buildGm.by_type.task + buildGm.by_type.reply,
    buildGm.count, 'the cheap invariant: breakdown sums to the total');

  // A single-type pair still gets a breakdown, just with one key.
  assert.deepEqual(byPair.get('gm|plan')?.by_type, { task: 1 });

  // The sum invariant holds for every row, not just the one hand-picked above.
  for (const r of rows) {
    const sum = Object.values(r.by_type).reduce((a, b) => a + b, 0);
    assert.equal(sum, r.count, `by_type for ${r.a}|${r.b} sums to ${sum}, not count ${r.count}`);
  }
});

test('a_to_b + b_to_a always sums to count, for every row', () => {
  const data = makeDb();
  const rows = pairCounts(data, 24);
  assert.ok(rows.length > 0, 'fixture must return rows, or this proves nothing');
  for (const r of rows) {
    assert.equal(r.a_to_b + r.b_to_a, r.count,
      `${r.a}|${r.b}: a_to_b ${r.a_to_b} + b_to_a ${r.b_to_a} != count ${r.count}`);
  }
});

test('a one-way pair reports the traffic on the CORRECT side, not just that they differ', () => {
  const data = makeDb();
  const rows = pairCounts(data, 24);
  const planTest = new Map(rows.map((r) => [`${r.a}|${r.b}`, r])).get('plan|test');
  assert.ok(planTest, 'plan|test must be present');
  // a='plan', b='test'. 4 rows plan->test (a_to_b), 1 row test->plan (b_to_a). Asserting the
  // SPECIFIC side, not just inequality — a/b inversion is the obvious bug here and a
  // differ-only assertion ("a_to_b !== b_to_a") cannot see the ends swapped.
  assert.equal(planTest.a_to_b, 4, 'a_to_b must be the plan->test count, not test->plan');
  assert.equal(planTest.b_to_a, 1, 'b_to_a must be the test->plan count, not plan->test');
});

test('an exactly even pair returns equal a_to_b/b_to_a — must not get a direction', () => {
  const data = makeDb();
  const rows = pairCounts(data, 24);
  const brainThink = new Map(rows.map((r) => [`${r.a}|${r.b}`, r])).get('brain|think');
  assert.ok(brainThink, 'brain|think must be present');
  assert.equal(brainThink.a_to_b, 2);
  assert.equal(brainThink.b_to_a, 2);
  assert.equal(brainThink.a_to_b, brainThink.b_to_a, 'a genuinely even split must report as equal, not a coin flip');
});

test('a single-message pair: one side is 1, the other is 0', () => {
  const data = makeDb();
  const rows = pairCounts(data, 24);
  const bshrShip = new Map(rows.map((r) => [`${r.a}|${r.b}`, r])).get('bshr|ship');
  assert.ok(bshrShip, 'bshr|ship must be present');
  // a='bshr', b='ship'; the single row is bshr->ship, i.e. a_to_b.
  assert.equal(bshrShip.a_to_b, 1);
  assert.equal(bshrShip.b_to_a, 0);
});

test('deadPairs rows: a_to_b and b_to_a are both 0, no divide-by-anything, no crash', () => {
  const data = makeDb();
  const dead = deadPairs(data, 24);
  assert.ok(dead.length > 0, 'fixture must return dead pairs, or this proves nothing');
  for (const r of dead) {
    assert.equal(r.a_to_b, 0, `${r.a}|${r.b}: a dead pair must report a_to_b 0`);
    assert.equal(r.b_to_a, 0, `${r.a}|${r.b}: a dead pair must report b_to_a 0`);
  }
});

test('deadPairs: a pair with traffic only outside the window comes back with count 0 and a real (all-time) last_at', () => {
  const data = makeDb();
  const dead = deadPairs(data, 24);
  const byPair = new Map(dead.map((r) => [`${r.a}|${r.b}`, r]));

  const ship = byPair.get('gm|ship');
  assert.ok(ship, 'gm<->ship has real (40-day-old) traffic and zero in-window traffic — must be reported dead');
  assert.equal(ship?.count, 0);
  // last_at is the row's actual timestamp (~40 days ago), NOT null and NOT a windowed value —
  // this is the field that lets the client render DEAD differently from QUIET.
  assert.ok(ship?.last_at, 'last_at must be a real timestamp, not null');
  assert.ok(Date.now() - new Date(String(ship?.last_at)).getTime() > 39 * 86_400_000,
    'last_at must be the ALL-TIME last message, not clipped to the window');

  // A pair whose ONLY row is archived is not a real pair at all — must not appear as "dead".
  assert.equal(byPair.get('gm|test'), undefined, 'archived-only traffic must not be reported as a dead pair');

  // A pair with in-window traffic is a live pair, not a dead one — must not appear here too.
  assert.equal(byPair.get('build|gm'), undefined, 'a pair with in-window traffic is not dead');
});

test('a pair with traffic inside the window is unaffected by the by_type/dead_pairs changes', () => {
  const data = makeDb();
  // Same assertion the original suite made before this change — count must be identical.
  const rows = pairCounts(data, 24);
  const byPair = new Map(rows.map((r) => [`${r.a}|${r.b}`, r]));
  assert.equal(byPair.get('build|gm')?.count, 3);
  assert.equal(byPair.get('gm|plan')?.count, 1);
});

test('activeConnections-style consumers do not see dead links as active', () => {
  const data = makeDb();
  const live = pairCounts(data, 24);
  const dead = deadPairs(data, 24);

  // The in-window row count/length — what an "N connections active" consumer reads — is
  // unaffected by dead_pairs existing at all: they are a SEPARATE array, never merged in.
  const liveIds = new Set(live.map((r) => `${r.a}|${r.b}`));
  const deadIds = new Set(dead.map((r) => `${r.a}|${r.b}`));
  for (const id of deadIds) {
    assert.ok(!liveIds.has(id), `${id} is in both pairCounts() and deadPairs() — it would double-count as active`);
  }
  // Concretely: gm<->ship is dead and must not inflate the live/active pair count.
  assert.ok(!live.some((r) => `${r.a}|${r.b}` === 'gm|ship'));
  assert.ok(dead.some((r) => `${r.a}|${r.b}` === 'gm|ship'));
});

test('archived_at is null is respected on both pairCounts and deadPairs', () => {
  const data = makeDb();
  // m7 (gm<->build, archived) must not inflate the live count above the 3 real in-window rows.
  const live = pairCounts(data, 24);
  assert.equal(new Map(live.map((r) => [`${r.a}|${r.b}`, r])).get('build|gm')?.count, 3);

  // m10 (gm<->test) is archived AND its only row is outside the window — archived_at excludes
  // it from consideration entirely, so it must not show up as a dead pair either.
  const dead = deadPairs(data, 24);
  assert.equal(new Map(dead.map((r) => [`${r.a}|${r.b}`, r])).get('gm|test'), undefined);
});

test('pairMessages pages newest-first by a created_at cursor, past the window', () => {
  const data = makeDb();

  const first = pairMessages(data, 'gm', 'build', 2, null, 24);
  assert.equal(first.total_in_window, 3, 'matches the line label exactly');
  assert.equal(first.total_all_time, 4, 'what load-older can reach');
  assert.deepEqual(first.messages.map((m) => m.id), ['m3', 'm2'], 'newest first');
  assert.equal(first.has_more, true);
  assert.equal(first.next_before, first.messages[1].created_at);

  const second = pairMessages(data, 'gm', 'build', 2, first.next_before, 24);
  assert.deepEqual(second.messages.map((m) => m.id), ['m1', 'm4'],
    'strictly older than the cursor — m2 is not re-sent, and m4 is past the window');
  assert.equal(second.has_more, false, 'has_more is observed, not inferred from a full page');
  assert.equal(second.next_before, null);

  // Argument order must not matter: it is one line.
  assert.deepEqual(
    pairMessages(data, 'build', 'gm', 40, null, 24).messages.map((m) => m.id),
    pairMessages(data, 'gm', 'build', 40, null, 24).messages.map((m) => m.id));

  // Bodies are carried — the panel renders them without a second fetch.
  assert.equal(first.messages[0].body, 'b3');
  assert.equal(first.messages[0].subject, 's3');

  const none = pairMessages(data, 'gm', 'nobody', 40, null, 24);
  assert.deepEqual(none.messages, []);
  assert.equal(none.total_all_time, 0);
  assert.equal(pairMessages(join(data, 'nowhere'), 'gm', 'build', 40, null, 24).total_all_time, 0);
});

test('asof moves the window back in time and never silently empties it', () => {
  const data = makeDb();

  // Looking at "now": the 3 recent gm<->build rows, not the 40-day-old one.
  assert.equal(pairMessages(data, 'gm', 'build', 40, null, 24).total_in_window, 3);

  // Scrub back 4 hours: m3 (1h ago) and m2 (3h ago) are now in the FUTURE relative to the
  // moment being viewed, so only m1 (5h ago) is inside the 24h window ending there. Without
  // the upper bound this stays 3 and the scrubber is decorative.
  const fourHoursAgo = Date.now() - 4 * 3600_000;
  assert.equal(pairMessages(data, 'gm', 'build', 40, null, 24, fourHoursAgo).total_in_window, 1);

  // total_all_time ignores asof entirely — it is what "load older" can reach, not a window.
  assert.equal(pairMessages(data, 'gm', 'build', 40, null, 24, fourHoursAgo).total_all_time, 4);

  // Same for the line counts, so the line and the panel agree at the scrubbed moment too.
  const scrubbed = new Map(pairCounts(data, 24, fourHoursAgo).map((r) => [`${r.a}|${r.b}`, r]));
  assert.equal(scrubbed.get('build|gm')?.count, 1);
  assert.equal(scrubbed.get('gm|plan'), undefined, '2h-ago row is in the future at this moment');

  // Scrub to a moment 39.5 days back: the 24h window ending there spans 40.5..39.5 days ago,
  // so the 40-day-old row is inside it. (40.5 days back would put that row in the FUTURE
  // relative to the viewed moment — which is the whole point of the upper bound.)
  const longAgo = Date.now() - 24 * 39.5 * 3600_000;
  assert.equal(pairMessages(data, 'gm', 'build', 40, null, 24, longAgo).total_in_window, 1);

  // A null asof is live, not "epoch" — an unset scrubber must not collapse the window.
  assert.equal(pairMessages(data, 'gm', 'build', 40, null, 24, null).total_in_window, 3);
});

test('parseAsof repairs the +-decodes-to-space case and refuses anything else', () => {
  // The bug this exists for, caught live: '+' in a query string decodes to a SPACE, so an
  // ISO offset arrives mangled from any hand-built or copied URL. Unrepaired it does not
  // parse, and an earlier version fell back to now — returning LIVE counts for a request
  // that asked for six hours ago, which looked perfectly healthy.
  const iso = '2026-09-29T18:04:04.742630+00:00';
  assert.equal(parseAsof(iso.replace('+', ' ')), Date.parse(iso), 'space-for-plus must be repaired');
  assert.equal(parseAsof(iso), Date.parse(iso));
  assert.equal(parseAsof('2026-09-29T18:04:04Z'), Date.parse('2026-09-29T18:04:04Z'));

  // Anything still unusable is null, so the route can REFUSE. Returning now instead would be
  // plausible numbers for the wrong moment — the failure mode this whole feature removes.
  assert.equal(parseAsof('banana'), null);
  assert.equal(parseAsof(''), null);
  assert.equal(parseAsof('2026-13-45T99:99:99Z'), null);
});

test('julianday, not string compare: a DEFAULT-format row lands in a SAME-DAY window', () => {
  // review (2026-09-30) proved the earlier assertion for this was vacuous, and it was right:
  // with a 24h window the cutoff falls on the PREVIOUS calendar day, so the day digit decides
  // a string compare before ' ' vs 'T' can matter — swapping julianday() for `>=` on raw text
  // left every test green. Re-derived independently in sqlite:
  //   '2026-09-29 21:55:03' >= '2026-09-28T23:55:03Z'  -> 1   (cross-day, accidentally passes)
  //   '2026-09-29 21:55:03' >= '2026-09-29T17:55:03Z'  -> 0   (same-day, the real failure)
  // So the window here must be small enough to stay inside one day. Timestamps are ABSOLUTE
  // and the moment is pinned with asof, so this does not quietly become cross-day again
  // depending on what time of day the suite happens to run — which is how the first version
  // of this test went wrong.
  const data = mkdtempSync(join(tmpdir(), 'orch-fmt-'));
  mkdirSync(join(data, 'state'));
  const db = new Database(join(data, 'state', 'tasks.db'));
  db.exec(`create table messages (id text primary key, conversation_id text, from_agent text,
           to_agent text, type text, subject text, body text, priority text, status text,
           created_at text, delivered_at text, acknowledged_at text, archived_at text)`);
  const ins = db.prepare(`insert into messages
    (id,from_agent,to_agent,type,subject,body,priority,status,created_at,archived_at)
    values (?,?,?,?,?,?,'medium','pending',?,null)`);
  // Exactly the format the column DEFAULT datetime('now') writes: space separator, no offset.
  ins.run('d1', 'gm', 'review', 'task', 'default-fmt', 'x', '2026-06-15 10:00:00');
  // An ISO control on the same day, so a failure points at the format and not at the window.
  ins.run('d2', 'gm', 'review', 'task', 'iso', 'x', '2026-06-15T10:30:00+00:00');
  db.close();

  const asof = Date.parse('2026-06-15T12:00:00Z');     // window 06:00..12:00, same day
  const rows = new Map(pairCounts(data, 6, asof).map((r) => [`${r.a}|${r.b}`, r]));
  assert.equal(rows.get('gm|review')?.count, 2,
    'both the DEFAULT-format row and the ISO row must be inside a same-day 6h window');

  assert.equal(pairMessages(data, 'gm', 'review', 40, null, 6, asof).total_in_window, 2);

  // And the upper bound must still exclude a same-day row that is in the future at that moment.
  const early = Date.parse('2026-06-15T10:15:00Z');    // window 04:15..10:15 — d2 is later
  assert.equal(pairMessages(data, 'gm', 'review', 40, null, 6, early).total_in_window, 1);
});

test('G1: the row list never contains a message sent after the moment being viewed', () => {
  // review, Gate 14: total_in_window was bounded by both ends of the window but the queries
  // that fetch the ROWS had no upper bound at all, so the header described the past while the
  // body showed the present — scrubbed 6h back on live data, 38 of 40 rows were newer than the
  // moment requested. This asserts the invariant directly rather than a row count, because a
  // count can be right while the contents are wrong, which is precisely what happened.
  const data = makeDb();
  const fourHoursAgo = Date.now() - 4 * 3600_000;

  const page = pairMessages(data, 'gm', 'build', 40, null, 24, fourHoursAgo);
  assert.ok(page.messages.length > 0, 'fixture must return something, or this proves nothing');
  for (const m of page.messages) {
    assert.ok(new Date(String(m.created_at)).getTime() <= fourHoursAgo,
      `row ${m.id} at ${m.created_at} is AFTER the viewed moment`);
  }
  // m1 (5h ago) is the only gm<->build row at or before that moment inside the window; m4 is
  // 40 days old and therefore also before it, so both are legitimately listed.
  assert.deepEqual(page.messages.map((m) => m.id), ['m1', 'm4']);

  // The lower end stays OPEN on purpose: load-older must still reach history from before the
  // window started. m4 is 40 days old and inside a 24h window ending 4h ago only because of
  // that, so its presence is the proof.
  assert.ok(page.messages.some((m) => m.id === 'm4'), 'load-older must not be capped at the window start');

  // Live (no asof) is unbounded above, so the newest row is present.
  assert.equal(pairMessages(data, 'gm', 'build', 40, null, 24).messages[0].id, 'm3');

  // The cursor path needs the bound too, and it has to be exercised DELIBERATELY. Paging
  // normally cannot hit it — a cursor always comes from an already-bounded page, so rows older
  // than it are automatically older than asof, and a mutation removing the clause survives a
  // natural paging test. The reachable case is a caller passing `before` directly with a value
  // NEWER than asof, which a hand-built request can do. Here `before` is now and asof is 4h
  // ago, so m2 (3h) and m3 (1h) are older than the cursor but newer than the viewed moment:
  // without the clause they come back.
  const handBuilt = pairMessages(
    data, 'gm', 'build', 40, new Date().toISOString(), 24, fourHoursAgo);
  for (const m of handBuilt.messages) {
    assert.ok(new Date(String(m.created_at)).getTime() <= fourHoursAgo,
      `paged row ${m.id} at ${m.created_at} is AFTER the viewed moment`);
  }
  assert.ok(!handBuilt.messages.some((m) => m.id === 'm2' || m.id === 'm3'),
    'rows between the viewed moment and the cursor must not be listed');

  // And normal paging still works and still respects it.
  const first = pairMessages(data, 'gm', 'build', 1, null, 24, fourHoursAgo);
  const second = pairMessages(data, 'gm', 'build', 40, first.next_before, 24, fourHoursAgo);
  for (const m of second.messages) {
    assert.ok(new Date(String(m.created_at)).getTime() <= fourHoursAgo,
      `paged row ${m.id} at ${m.created_at} is AFTER the viewed moment`);
  }
});

test('oldestMessageAt finds the true oldest, not the lexicographic one', () => {
  // The scrubber clamps its range to this. On the real install the oldest message is 254h old
  // while the largest window option was 72h, so the control was concealing 182h of real
  // traffic — that is the operator's complaint this exists to fix.
  const data = mkdtempSync(join(tmpdir(), 'orch-oldest-'));
  mkdirSync(join(data, 'state'));
  const db = new Database(join(data, 'state', 'tasks.db'));
  db.exec(`create table messages (id text primary key, conversation_id text, from_agent text,
           to_agent text, type text, subject text, body text, priority text, status text,
           created_at text, delivered_at text, acknowledged_at text, archived_at text)`);
  const ins = db.prepare(`insert into messages
    (id,from_agent,to_agent,type,subject,body,priority,status,created_at,archived_at)
    values (?,?,?,?,'s','b','medium','pending',?,?)`);
  ins.run('m2', 'gm', 'build', 'task', '2026-06-10T12:00:00+00:00', null);   // the true oldest
  ins.run('m3', 'gm', 'build', 'task', '2026-06-15T12:00:00+00:00', null);
  // A DEFAULT-format row (space separator, no offset) that must be on the SAME DATE as the
  // true oldest for this to bite. My first version of this fixture put it on 06-20: the date
  // digits then decide the comparison before the separator is ever consulted, so a plain
  // min(created_at) returned the right answer anyway and the mutation survived. Third time
  // this exact trap has appeared tonight. Same day, later in real time, sorts EARLIER because
  // ' ' (0x20) < 'T' (0x54) — so a string min returns THIS row, which is not the oldest.
  ins.run('m4', 'gm', 'build', 'task', '2026-06-10 23:00:00', null);
  db.close();

  assert.equal(oldestMessageAt(data), '2026-06-10T12:00:00+00:00',
    'must be the true oldest by time; a string min() returns the same-day 23:00 DEFAULT-format row');

  // Archived rows are not history the scrubber should reach for.
  const d2 = mkdtempSync(join(tmpdir(), 'orch-oldest2-'));
  mkdirSync(join(d2, 'state'));
  const db2 = new Database(join(d2, 'state', 'tasks.db'));
  db2.exec(`create table messages (id text primary key, created_at text, archived_at text,
            from_agent text, to_agent text, type text, subject text, body text, priority text,
            status text, conversation_id text, delivered_at text, acknowledged_at text)`);
  db2.prepare(`insert into messages (id,created_at,archived_at) values (?,?,?)`)
     .run('a1', '2026-01-01T00:00:00+00:00', '2026-02-01T00:00:00+00:00');
  db2.prepare(`insert into messages (id,created_at,archived_at) values (?,?,?)`)
     .run('a2', '2026-05-05T00:00:00+00:00', null);
  db2.close();
  assert.equal(oldestMessageAt(d2), '2026-05-05T00:00:00+00:00', 'archived rows are excluded');

  // Empty store and missing db are null, NOT a fabricated date — null means "no history",
  // which the UI must render differently from a real old timestamp.
  const d3 = mkdtempSync(join(tmpdir(), 'orch-oldest3-'));
  mkdirSync(join(d3, 'state'));
  new Database(join(d3, 'state', 'tasks.db')).exec(`create table messages (id text primary key, created_at text, archived_at text)`);
  assert.equal(oldestMessageAt(d3), null, 'empty store -> null');
  assert.equal(oldestMessageAt(join(d3, 'nowhere')), null, 'missing db -> null, never throws');
});

// ── /messages/alerts — the badge data source ────────────────────────────────
// THE BUG THIS PREVENTS: feeding the alert badges from /recent. Measured on the live
// store, the most recent 40 messages contain ONE escalation while the last 24h contain
// thirty-five, so a /recent-fed badge is wrong by a factor of 35 AND flickers as
// ordinary traffic pushes escalations off the end. Same paginated-undercount shape as
// by_type. These assert the filter is real, not that a function exists.
test('alertMessages returns ONLY escalate and held_message, and nothing else', () => {
  const dir = makeAlertDb();
  const rows = alertMessages(dir, 24);
  assert.ok(rows.length > 0, 'fixture must contain at least one alert or this proves nothing');
  const types = [...new Set(rows.map((r) => r.type))].sort();
  assert.deepEqual(types.filter((t) => t !== 'escalate' && t !== 'held_message'), [],
    'a non-alert type leaking in means the badge would count ordinary traffic');
});

test('alertMessages respects the window — an older alert is excluded', () => {
  const dir = makeAlertDb();
  const inWindow = alertMessages(dir, 24).map((r) => r.id).sort();
  // a4 is 30 days old and a7 is archived; a5 is a reply and a6 is a self-send.
  assert.deepEqual(inWindow, ['a1', 'a2', 'a3'],
    'exactly the in-window, unarchived, non-self alerts — nothing else');
  assert.ok(alertMessages(dir, 24 * 365).some((r) => r.id === 'a4'),
    'and the old one IS returned once the window reaches it, so it was filtered not lost');
});

test('alertMessages excludes self-sends, same as every other pair query', () => {
  const dir = makeAlertDb();
  assert.deepEqual(alertMessages(dir, 24 * 365).filter((r) => r.from_agent === r.to_agent), []);
});

test('alertMessages carries to_agent — the badge hangs on the RECIPIENT', () => {
  const dir = makeAlertDb();
  const rows = alertMessages(dir, 24 * 365);
  for (const r of rows) {
    assert.ok(typeof r.to_agent === 'string' && r.to_agent.length > 0,
      'without to_agent there is no node to put the badge on');
    assert.ok(typeof r.id === 'string' && r.id.length > 0, 'id is needed to dedupe across polls');
  }
});
