/**
 * GET /api/messages/history — the PLAY/GROW/LIVE replay timeline (ported from
 * /Users/flybyflow/second-brain-3d). Covers the four rules from the brief: julianday-safe
 * window, archived_at is null + to_agent is not null, ascending order, subject truncated to 80.
 * Plus spawnEvents' filesystem-birthtime fallback, since this install's agent-sessions.json has
 * no spawned_at field at all (verified directly, not assumed) and that fallback is real code,
 * not a hypothetical branch.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import Database from 'better-sqlite3';
import { historyEvents, spawnEvents } from './messages.js';

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function makeDb(): string {
  const data = mkdtempSync(join(tmpdir(), 'orch-history-'));
  mkdirSync(join(data, 'state'));
  const db = new Database(join(data, 'state', 'tasks.db'));
  db.exec(`create table messages (id text primary key, conversation_id text, from_agent text,
           to_agent text, type text, subject text, body text, priority text, status text,
           created_at text, delivered_at text, acknowledged_at text, archived_at text)`);
  const ins = db.prepare(`insert into messages
    (id,from_agent,to_agent,type,subject,body,priority,status,created_at,archived_at)
    values (?,?,?,?,?,?,'medium','pending',?,?)`);
  ins.run('h1', 'gm', 'build', 'task', 's1', 'b1', hoursAgo(5), null);
  ins.run('h2', 'gm', 'build', 'reply', 's2', 'b2', hoursAgo(3), null);
  ins.run('h3', 'gm', 'build', 'task', 's3', 'b3', hoursAgo(1), null); // newest
  ins.run('h4', 'gm', 'build', 'task', 'old', 'b4', hoursAgo(24 * 40), null); // outside a 24h window
  ins.run('h5', 'gm', 'build', 'task', 'gone', 'b5', hoursAgo(2), hoursAgo(1)); // archived
  ins.run('h6', 'gm', null, 'task', 'no-recipient', 'b6', hoursAgo(2), null); // to_agent null
  // DEFAULT-format row (space separator, no offset) — same julianday trap every other test
  // in this file exists to catch.
  ins.run('h7', 'gm', 'review', 'task', 'default-fmt', 'b7',
    new Date(Date.now() - 2 * 3600_000).toISOString().replace('T', ' ').replace(/\..*$/, ''), null);
  ins.run('h8', 'gm', 'build', 'task', 'x'.repeat(200), 'b8', hoursAgo(0.5), null); // long subject
  db.close();
  return data;
}

test('historyEvents: window, archived, to_agent-null, and ordering', () => {
  const data = makeDb();
  const events = historyEvents(data, 24);
  const ids = new Set(events.map((e) => e.subject)); // subjects are unique enough as ids here

  assert.ok(ids.has('s1') && ids.has('s2') && ids.has('s3'), 'the 3 real in-window rows must be present');
  assert.ok(!ids.has('old'), 'a row 40 days outside the window must not appear');
  assert.ok(!ids.has('gone'), 'an archived row must not appear');
  assert.ok(!ids.has('no-recipient'), 'a row with to_agent null must not appear');

  // Ascending order: every event's t must be <= the next one's.
  for (let i = 1; i < events.length; i++) {
    assert.ok(Date.parse(events[i - 1].t) <= Date.parse(events[i].t),
      `events out of order at index ${i}: ${events[i - 1].t} then ${events[i].t}`);
  }
});

test('historyEvents: every event carries the real message id, distinct per row', () => {
  // build's find: the UI keys pulses on `${from}>${to}@${t}:${id}`, and without id two
  // messages on the same pair in the same millisecond collide -- React drops one silently,
  // which reads as "that message never happened" on a replay that exists to show what did.
  const data = makeDb();
  const events = historyEvents(data, 24);
  assert.ok(events.every((e) => typeof e.id === 'string' && e.id.length > 0),
    'every event must carry a non-empty id');
  const ids = new Set(events.map((e) => e.id));
  assert.strictEqual(ids.size, events.length, 'ids must be distinct per row, or the key collision is not actually fixed');
});

test('historyEvents: julianday, not string compare — a DEFAULT-format row still lands in the window', () => {
  const data = makeDb();
  const events = historyEvents(data, 24);
  assert.ok(events.some((e) => e.subject === 'default-fmt'),
    'a non-ISO created_at (space separator, no offset) must still land inside a 24h window');
});

test('historyEvents: subject truncated to 80 chars, not dropped', () => {
  const data = makeDb();
  const events = historyEvents(data, 24);
  const long = events.find((e) => e.subject.startsWith('x'));
  assert.ok(long, 'the long-subject row must still appear');
  assert.equal(long!.subject.length, 80);
});

test('historyEvents: missing db returns [], never throws', () => {
  const data = makeDb();
  assert.deepEqual(historyEvents(join(data, 'nowhere'), 24), []);
});

test('spawnEvents: falls back to conversation_path filesystem birthtime when no spawned_at/created_at/launched_at field exists', () => {
  const data = mkdtempSync(join(tmpdir(), 'orch-spawns-'));
  mkdirSync(join(data, 'state'));
  const transcriptDir = mkdtempSync(join(tmpdir(), 'orch-transcript-'));
  const transcriptPath = join(transcriptDir, 'fake.jsonl');
  writeFileSync(transcriptPath, '{}\n');
  writeFileSync(join(data, 'state', 'agent-sessions.json'), JSON.stringify({
    fallback_agent: { conversation_path: transcriptPath, name: 'Fallback Agent' },
    explicit_agent: { spawned_at: hoursAgo(2), name: 'Explicit Agent' },
    no_signal_agent: { name: 'No Signal' }, // neither field nor a conversation_path
    too_old_agent: { spawned_at: hoursAgo(24 * 40) }, // real signal, outside the window
  }));

  const events = spawnEvents(data, 24);
  const byId = new Map(events.map((e) => [e.id, e]));

  assert.ok(byId.has('fallback_agent'), 'must fall back to the transcript file\'s birthtime');
  assert.ok(byId.has('explicit_agent'), 'an explicit spawned_at must be used directly');
  assert.equal(byId.get('explicit_agent')!.name, 'Explicit Agent');
  assert.ok(!byId.has('no_signal_agent'), 'no field and no conversation_path -> no event, not a crash');
  assert.ok(!byId.has('too_old_agent'), 'a real spawn time outside the window must not appear');

  for (let i = 1; i < events.length; i++) {
    assert.ok(Date.parse(events[i - 1].t) <= Date.parse(events[i].t), 'spawn events must be ascending');
  }
});

test('spawnEvents: missing agent-sessions.json returns [], never throws', () => {
  const data = mkdtempSync(join(tmpdir(), 'orch-nospawns-'));
  mkdirSync(join(data, 'state'));
  assert.deepEqual(spawnEvents(data, 24), []);
});
