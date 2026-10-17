import assert from 'node:assert';
import { test } from 'node:test';
import { externalEndpoints, placeRim } from './rimNodes.ts';

// Transcribed verbatim from a live curl, 2026-09-30:
//   curl -s "http://localhost:8888/api/messages/pair-counts?hours=24"
// Real field names (a, b, count, last_at), real values, nothing invented. Counts differ
// slightly from build's brief (e.g. telegram 156 here vs 155 there) — that's live traffic
// drift in the ~30min between when the brief was written and when this was curled, not a
// transcription error.
const REAL_PAIRS_FIXTURE = [
  { a: 'build', b: 'gm', count: 175, last_at: '2026-09-30T09:51:09.465487+00:00' },
  { a: 'gm', b: 'telegram', count: 156, last_at: '2026-09-30T10:35:27.261891+00:00' },
  { a: 'gm', b: 'review', count: 130, last_at: '2026-09-30T08:45:53.266559+00:00' },
  { a: 'gm', b: 'plan', count: 118, last_at: '2026-09-30T10:37:09.552379+00:00' },
  { a: 'ea', b: 'gm', count: 88, last_at: '2026-09-30T10:22:53.128271+00:00' },
  { a: 'build', b: 'review', count: 76, last_at: '2026-09-30T10:10:25.284212+00:00' },
  { a: 'build', b: 'plan', count: 41, last_at: '2026-09-30T10:37:32.974750+00:00' },
  { a: 'gm', b: 'operator', count: 34, last_at: '2026-09-30T10:37:38.910972+00:00' },
  { a: 'bshr', b: 'gm', count: 26, last_at: '2026-09-30T09:39:12.560198+00:00' },
  { a: 'bshr', b: 'plan', count: 24, last_at: '2026-09-30T10:24:54.773801+00:00' },
  { a: 'ea', b: 'review', count: 23, last_at: '2026-09-30T01:07:08.547789+00:00' },
  { a: 'ea', b: 'plan', count: 22, last_at: '2026-09-30T10:32:55.834558+00:00' },
  { a: 'build', b: 'ea', count: 20, last_at: '2026-09-30T10:05:55.936721+00:00' },
  { a: 'build', b: 'builder-1', count: 18, last_at: '2026-09-30T10:36:24.214037+00:00' },
  { a: 'build', b: 'test', count: 15, last_at: '2026-09-30T10:12:21.873927+00:00' },
  { a: 'gm', b: 'ship', count: 15, last_at: '2026-09-30T09:04:27.987036+00:00' },
  { a: 'build', b: 'builder-2', count: 14, last_at: '2026-09-30T10:36:57.302835+00:00' },
  { a: 'ea', b: 'ship', count: 14, last_at: '2026-09-30T10:10:58.828696+00:00' },
  { a: 'review', b: 'test', count: 14, last_at: '2026-09-30T04:06:07.097371+00:00' },
  { a: 'build', b: 'ship', count: 12, last_at: '2026-09-30T10:12:31.810888+00:00' },
  { a: 'review', b: 'ship', count: 9, last_at: '2026-09-30T01:40:43.513392+00:00' },
  { a: 'gm-g2', b: 'operator', count: 6, last_at: '2026-09-30T09:46:45.701840+00:00' },
  { a: 'build', b: 'operator', count: 4, last_at: '2026-09-30T04:13:11.064009+00:00' },
  { a: 'operator', b: 'ship', count: 3, last_at: '2026-09-30T04:05:37.657276+00:00' },
  { a: 'plan', b: 'review', count: 3, last_at: '2026-09-30T00:16:59.587928+00:00' },
  { a: 'ship', b: 'test', count: 3, last_at: '2026-09-30T01:29:26.486561+00:00' },
  { a: 'approval-loop', b: 'gm', count: 2, last_at: '2026-09-29T21:10:17.049769+00:00' },
  { a: 'gm', b: 'message-router', count: 2, last_at: '2026-09-29T10:56:30.993304+00:00' },
  { a: 'reflect', b: 'review', count: 2, last_at: '2026-09-30T00:56:39.371025+00:00' },
  { a: 'build', b: 'message-router', count: 1, last_at: '2026-09-30T03:39:10.248005+00:00' },
  { a: 'operator', b: 'reflect', count: 1, last_at: '2026-09-30T00:56:08.369901+00:00' },
];

// Transcribed verbatim from a live curl, same session:
//   curl -s "http://localhost:8888/api/agents"
// Trimmed to id/alive (the only fields this module cares about), real ids, real alive values.
const REAL_AGENTS_FIXTURE = [
  { id: 'gm', alive: true },
  { id: 'gm-gen2', alive: true },
  { id: 'gm-g2', alive: false },
  { id: 'gm-g3', alive: false },
  { id: 'build', alive: true },
  { id: 'build-g2', alive: false },
  { id: 'ea', alive: true },
  { id: 'plan', alive: true },
  { id: 'review', alive: true },
  { id: 'brain', alive: true },
  { id: 'bshr', alive: true },
  { id: 'build-gen1', alive: true },
  { id: 'builder-1', alive: true },
  { id: 'builder-2', alive: true },
  { id: 'reflect', alive: true },
  { id: 'ship', alive: true },
  { id: 'test', alive: true },
  { id: 'think', alive: true },
];

// Precondition: fails loudly here, not silently downstream, if either payload shape moves.
for (const row of REAL_PAIRS_FIXTURE) {
  assert.ok(
    typeof row.a === 'string' && typeof row.b === 'string' &&
    typeof row.count === 'number' && ('last_at' in row),
    `pair-counts fixture row shape moved: ${JSON.stringify(row)}`,
  );
}
for (const row of REAL_AGENTS_FIXTURE) {
  assert.ok(
    typeof row.id === 'string' && typeof row.alive === 'boolean',
    `agents fixture row shape moved: ${JSON.stringify(row)}`,
  );
}

const ALL_AGENT_IDS = REAL_AGENTS_FIXTURE.map((a) => a.id);
// Per build's brief: the hidden set right now (retired + mid-rotation predecessors, which is
// broader than !alive — gm-gen2 and build-gen1 are alive:true but still hidden by
// TopologyDiagram.tsx). Transcribed from the brief, not re-derived — this module trusts the
// caller for exactly this reason.
const HIDDEN_AGENT_IDS = new Set(['gm-g2', 'build-g2', 'gm-g3', 'gm-gen2', 'build-gen1']);
const VISIBLE_AGENT_IDS = ALL_AGENT_IDS.filter((id) => !HIDDEN_AGENT_IDS.has(id));

test('the four real external endpoints are derived, and real agent ids are not', () => {
  const { endpoints } = externalEndpoints(REAL_PAIRS_FIXTURE, ALL_AGENT_IDS, VISIBLE_AGENT_IDS);
  const ids = endpoints.map((e) => e.id).sort();
  assert.deepStrictEqual(ids, ['approval-loop', 'message-router', 'operator', 'telegram']);
  for (const agentId of ALL_AGENT_IDS) {
    assert.ok(!ids.includes(agentId), `agent id "${agentId}" leaked into external endpoints`);
  }
});

test('endpoint totals and peers match the real fixture', () => {
  const { endpoints } = externalEndpoints(REAL_PAIRS_FIXTURE, ALL_AGENT_IDS, VISIBLE_AGENT_IDS);
  const byId = Object.fromEntries(endpoints.map((e) => [e.id, e]));
  assert.strictEqual(byId.telegram.count, 156);
  assert.deepStrictEqual(byId.telegram.peers, ['gm']);
  assert.strictEqual(byId['message-router'].count, 3);
  assert.deepStrictEqual(byId['message-router'].peers, ['build', 'gm']);
  assert.strictEqual(byId['approval-loop'].count, 2);
  assert.deepStrictEqual(byId['approval-loop'].peers, ['gm']);
  // operator: gm(34) + gm-g2(6) + build(4) + ship(3) + reflect(1) = 48, 5 peers (gm-g2 included
  // in the count/peer list even though it's hidden -- the endpoint itself is real and fully
  // countable; it's specifically the EDGE to gm-g2 that's undrawable, see the dropped test below).
  assert.strictEqual(byId.operator.count, 48);
  assert.deepStrictEqual(byId.operator.peers, ['build', 'gm', 'gm-g2', 'reflect', 'ship']);
});

test('an endpoint that IS an agent is never treated as external', () => {
  const pairs = [{ a: 'gm', b: 'build', count: 10, last_at: null }];
  const { endpoints } = externalEndpoints(pairs, ['gm', 'build'], ['gm', 'build']);
  assert.deepStrictEqual(endpoints, []);
});

test('deterministic ordering: shuffling the input rows gives the identical rim order', () => {
  const forward = externalEndpoints(REAL_PAIRS_FIXTURE, ALL_AGENT_IDS, VISIBLE_AGENT_IDS).endpoints;
  const shuffled = [...REAL_PAIRS_FIXTURE].reverse();
  // A second, differently-scrambled order (not just reversed) so a mutation that merely
  // survives reversal (e.g. a stable sort quirk) doesn't slip through.
  const scrambled = REAL_PAIRS_FIXTURE.filter((_, i) => i % 2 === 0)
    .concat(REAL_PAIRS_FIXTURE.filter((_, i) => i % 2 === 1));
  const reversedResult = externalEndpoints(shuffled, ALL_AGENT_IDS, VISIBLE_AGENT_IDS).endpoints;
  const scrambledResult = externalEndpoints(scrambled, ALL_AGENT_IDS, VISIBLE_AGENT_IDS).endpoints;
  assert.deepStrictEqual(reversedResult, forward);
  assert.deepStrictEqual(scrambledResult, forward);
});

test('a pair whose endpoint is hidden is reported as dropped-because-hidden, distinct from no traffic', () => {
  const { dropped } = externalEndpoints(REAL_PAIRS_FIXTURE, ALL_AGENT_IDS, VISIBLE_AGENT_IDS);
  assert.strictEqual(dropped.length, 1);
  assert.deepStrictEqual(dropped[0], { a: 'gm-g2', b: 'operator', count: 6, hiddenId: 'gm-g2' });
  // A pair with zero rows in the fixture (e.g. "telegram"<->"think") is simply absent from
  // both `endpoints` and `dropped` -- "no traffic" leaves no trace, it doesn't get flagged.
  const noTrafficPair = REAL_PAIRS_FIXTURE.find((p) =>
    (p.a === 'telegram' && p.b === 'think') || (p.a === 'think' && p.b === 'telegram'));
  assert.strictEqual(noTrafficPair, undefined);
});

test('empty pairs, empty agents, and a zero-count row do not throw', () => {
  assert.deepStrictEqual(externalEndpoints([], [], []), { endpoints: [], dropped: [] });
  assert.deepStrictEqual(externalEndpoints([], ALL_AGENT_IDS, VISIBLE_AGENT_IDS), { endpoints: [], dropped: [] });
  const zeroCount = externalEndpoints(
    [{ a: 'telegram', b: 'gm', count: 0, last_at: null }], ALL_AGENT_IDS, VISIBLE_AGENT_IDS,
  );
  assert.strictEqual(zeroCount.endpoints[0].count, 0);
  assert.doesNotThrow(() => placeRim([], 800));
  assert.doesNotThrow(() => placeRim([{ id: 'telegram' }], 0));
});

// --- placeRim -----------------------------------------------------------------

function boxesOverlap(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function assertNoOverlaps(boxes) {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      assert.ok(!boxesOverlap(boxes[i], boxes[j]), `boxes ${boxes[i].id} and ${boxes[j].id} overlap`);
    }
  }
}

test('placeRim: a normal-width container fits all boxes in one row, no overlap, within width', () => {
  const endpoints = ['telegram', 'operator', 'message-router', 'approval-loop'].map((id) => ({ id }));
  const boxes = placeRim(endpoints, 800);
  assert.strictEqual(boxes.length, 4);
  assertNoOverlaps(boxes);
  for (const b of boxes) {
    assert.ok(b.x >= 0 && b.x + b.width <= 800, `box ${b.id} out of bounds: x=${b.x} w=${b.width}`);
  }
});

test('placeRim: a crowded container (many endpoints, narrow width) wraps instead of overlapping', () => {
  const endpoints = Array.from({ length: 20 }, (_, i) => ({ id: `ext-${i}` }));
  const containerWidth = 300;
  const boxes = placeRim(endpoints, containerWidth);
  assert.strictEqual(boxes.length, 20);
  assertNoOverlaps(boxes);
  for (const b of boxes) {
    assert.ok(b.x >= 0 && b.x + b.width <= containerWidth, `box ${b.id} out of bounds: x=${b.x} w=${b.width}`);
  }
  // Confirms it actually wrapped (more than one row) rather than silently compressing.
  const distinctYs = new Set(boxes.map((b) => b.y));
  assert.ok(distinctYs.size > 1, 'expected the crowded case to wrap into more than one row');
});

test('placeRim is deterministic: same input, same output', () => {
  const endpoints = ['telegram', 'operator', 'message-router'].map((id) => ({ id }));
  assert.deepStrictEqual(placeRim(endpoints, 500), placeRim(endpoints, 500));
});
