/**
 * Per-node/per-edge alert aggregation (build's v2 step 3).
 *   node --experimental-strip-types dashboard/src/lib/nodeAlerts.test.mjs
 */
import assert from 'node:assert';
import { nodeAlerts } from './nodeAlerts.ts';

const NOW = Date.parse('2026-09-30T15:00:00.000Z');
const HOUR = 3_600_000;

function msg(id, from_agent, to_agent, type, created_at) {
  return { id, from_agent, to_agent, type, created_at };
}

// ── FIXTURE RULE: at least one fixture transcribed from a real message row ────────────────
// Transcribed verbatim (field names and values) from `curl localhost:8888/api/messages/recent`
// on 2026-09-30 — the actual shape the store returns, not an assumption about it.
const REAL_ESCALATE_ROW = {
  id: 'msg_6dc4168f_77896029',
  conversation_id: 'conv_05efad7585ed',
  from_agent: 'ea',
  to_agent: 'gm',
  type: 'escalate',
  subject: 'third shared-resource collision today: build/review shared an ad hoc worktree, HEAD moved under each other, one bisect confounded',
  priority: 'medium',
  status: 'pending',
  created_at: '2026-09-30T14:18:16.067057+00:00',
  delivered_at: null,
  acknowledged_at: null,
};
// Precondition, not an assumption: fail loudly here if the store's row shape ever moves,
// rather than silently passing on a fixture that no longer matches what TrafficMessage expects.
for (const field of ['id', 'from_agent', 'to_agent', 'type', 'created_at']) {
  assert.ok(field in REAL_ESCALATE_ROW, `real-row precondition: missing "${field}" — TrafficMessage's shape has drifted`);
}
assert.equal(REAL_ESCALATE_ROW.type, 'escalate', 'real-row precondition: expected an escalate row');
{
  // The real row's created_at is 2026-09-30T14:18:16Z; NOW here is later the same day so it
  // falls inside a 24h window without needing to fabricate a timestamp.
  const result = nodeAlerts([REAL_ESCALATE_ROW], new Set(['ea', 'gm']), { now: NOW });
  assert.deepEqual(result.byNode.gm, { escalate: 1, held: 0 }, 'the real row counts on its recipient, gm');
  assert.deepEqual(result.byEdge['ea|gm'], { escalate: 1 }, 'and on its edge');
  assert.deepEqual(result.hidden, { escalate: 0, held: 0 });
}

// ── per-node and per-edge counts, realistic multi-message fixture ─────────────────────────
{
  const visible = new Set(['build', 'review', 'gm', 'ea', 'reflect']); // gm-g2 deliberately absent
  const messages = [
    msg('m1', 'review', 'build', 'escalate', new Date(NOW - 1 * HOUR).toISOString()),
    msg('m2', 'review', 'build', 'escalate', new Date(NOW - 2 * HOUR).toISOString()),
    msg('m3', 'review', 'build', 'escalate', new Date(NOW - 3 * HOUR).toISOString()),
    msg('m4', 'build', 'review', 'escalate', new Date(NOW - 4 * HOUR).toISOString()), // same PAIR, opposite direction
    msg('m5', 'ea', 'gm', 'escalate', new Date(NOW - 1 * HOUR).toISOString()),
    msg('m6', 'ea', 'gm', 'escalate', new Date(NOW - 2 * HOUR).toISOString()),
    msg('m7', 'ea', 'gm-g2', 'held_message', new Date(NOW - 1 * HOUR).toISOString()), // recipient hidden
    msg('m8', 'ea', 'gm-g2', 'held_message', new Date(NOW - 2 * HOUR).toISOString()), // recipient hidden
    msg('m9', 'build', 'reflect', 'held_message', new Date(NOW - 1 * HOUR).toISOString()),
    msg('m10', 'gm', 'build', 'reply', new Date(NOW - 1 * HOUR).toISOString()), // neither alert type
  ];
  const result = nodeAlerts(messages, visible, { now: NOW });

  assert.deepEqual(result.byNode.build, { escalate: 3, held: 0 }, 'build received 3 escalates (m1-3)');
  assert.deepEqual(result.byNode.review, { escalate: 1, held: 0 }, 'review received 1 escalate (m4)');
  assert.deepEqual(result.byNode.gm, { escalate: 2, held: 0 }, 'gm received 2 escalates (m5-6)');
  assert.deepEqual(result.byNode.reflect, { escalate: 0, held: 1 }, 'reflect received 1 held message (m9)');
  assert.equal(result.byNode['gm-g2'], undefined, 'the hidden recipient never gets a byNode entry at all');

  // Traffic in BOTH directions between the same pair shares ONE edge bucket (pairKey is
  // unordered) — 3 (review->build) + 1 (build->review) = 4, not two separate edges.
  assert.deepEqual(result.byEdge['build|review'], { escalate: 4 }, 'both directions between one pair share one edge bucket');
  assert.deepEqual(result.byEdge['ea|gm'], { escalate: 2 });
  assert.equal(Object.keys(result.byEdge).length, 2, 'held messages never create an edge entry (byEdge is escalate-only)');

  assert.deepEqual(result.hidden, { escalate: 0, held: 2 }, 'the 2 held messages to gm-g2 are counted, not dropped — never silently missing');
}

// ── a type that is neither escalate nor held_message contributes nothing ──────────────────
{
  const visible = new Set(['a', 'b']);
  const messages = [
    msg('t1', 'a', 'b', 'task', new Date(NOW - HOUR).toISOString()),
    msg('t2', 'a', 'b', 'task_request', new Date(NOW - HOUR).toISOString()),
    msg('t3', 'a', 'b', 'reply', new Date(NOW - HOUR).toISOString()),
    msg('t4', 'a', 'b', null, new Date(NOW - HOUR).toISOString()),
  ];
  const result = nodeAlerts(messages, visible, { now: NOW });
  assert.deepEqual(result.byNode, {}, 'no node entries from any non-alert type');
  assert.deepEqual(result.byEdge, {});
  assert.deepEqual(result.hidden, { escalate: 0, held: 0 });
}

// ── windowing: a message just outside the window is excluded, one just inside is not ──────
{
  const visible = new Set(['a', 'b']);
  const cutoff = NOW - 24 * HOUR; // default window
  const messages = [
    msg('w1', 'a', 'b', 'escalate', new Date(cutoff - 1).toISOString()),   // 1ms too old
    msg('w2', 'a', 'b', 'escalate', new Date(cutoff).toISOString()),      // exactly at the boundary — inclusive
  ];
  const result = nodeAlerts(messages, visible, { now: NOW }); // default windowHours: 24
  assert.deepEqual(result.byNode.b, { escalate: 1, held: 0 }, 'only the boundary message counts — the 1ms-older one is excluded');

  // A custom window is honoured, not just the default.
  const narrow = nodeAlerts(
    [msg('w3', 'a', 'b', 'escalate', new Date(NOW - 2 * HOUR).toISOString())],
    visible,
    { now: NOW, windowHours: 1 }
  );
  assert.deepEqual(narrow.byNode, {}, 'a 1h window excludes a message from 2h ago');
}

// ── empty input, unknown ids, a self-send — none throw ─────────────────────────────────────
{
  assert.deepEqual(nodeAlerts([], new Set(), { now: NOW }), { byNode: {}, byEdge: {}, hidden: { escalate: 0, held: 0 } });

  const unknownId = nodeAlerts(
    [msg('u1', 'ghost', 'also-ghost', 'escalate', new Date(NOW - HOUR).toISOString())],
    new Set(['build']), // neither id is in the visible set
    { now: NOW }
  );
  assert.deepEqual(unknownId.hidden, { escalate: 1, held: 0 }, 'an id nobody recognizes lands in hidden, not dropped');
  assert.deepEqual(unknownId.byNode, {});

  const selfSend = nodeAlerts(
    [msg('s1', 'solo', 'solo', 'escalate', new Date(NOW - HOUR).toISOString())],
    new Set(['solo']),
    { now: NOW }
  );
  assert.deepEqual(selfSend.byNode.solo, { escalate: 1, held: 0 });
  assert.deepEqual(selfSend.byEdge['solo|solo'], { escalate: 1 }, 'a self-send does not throw and lands on its own pairKey');

  // Malformed/missing created_at must not throw and must not be silently counted as "now".
  const badDate = nodeAlerts(
    [msg('b1', 'a', 'b', 'escalate', 'not-a-real-date'), msg('b2', 'a', 'b', 'escalate', null)],
    new Set(['a', 'b']),
    { now: NOW }
  );
  assert.deepEqual(badDate.byNode, {}, 'unparseable created_at is excluded rather than crashing or defaulting to in-window');
}

console.log('nodeAlerts: all assertions passed');
