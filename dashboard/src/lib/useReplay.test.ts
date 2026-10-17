// Fake-clock, fake-rAF harness for the ONE hook that owns real impurity in this feature
// (useReplay.ts: requestAnimationFrame, performance.now, fetch). Three fixes on this file
// have shipped on structural argument alone rather than a red-then-green repro -- the
// frozen-loop guard (c383418), the window-change resume (49f4505), and the tail flush
// (c2c5bd8, hook-level half). This harness makes all three actual tests.
//
// No testing-library in this repo and none added: jsdom (new, minimal, dev-only) plus
// React 19's own exported `act` is enough to render a hook and drive it deterministically.
// rAF and performance.now are replaced with a queue THIS FILE steps by hand -- nothing here
// ever waits on a real timer, so a test cannot flake on machine speed and cannot hang.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Untyped write access to globalThis for the polyfills below -- `unknown`, not `any`: every
// write here is of a known, specific type, so there is nothing `any` would buy that a plain
// index signature does not.
const g = globalThis as unknown as Record<string, unknown>;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
// `navigator` is a getter-only global as of modern Node (it ships its own) -- a plain
// assignment throws. defineProperty for all of them so one code path handles both cases.
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Node'] as const) {
  Object.defineProperty(globalThis, k, { value: (dom.window as unknown as Record<string, unknown>)[k], configurable: true, writable: true });
}
g.IS_REACT_ACT_ENVIRONMENT = true;

// Fake rAF: a manually-drained queue, not the real browser scheduler. `id` is the queue
// index + 1 (0 is falsy, so `cancelAnimationFrame(0)` could never look like "no-op" by
// accident). Cancelling nulls the slot rather than splicing, so an id captured before a
// cancel can never accidentally address a DIFFERENT callback that shifted into its place.
let rafQueue: Array<((t: number) => void) | null> = [];
let rafClock = 0;
g.requestAnimationFrame = (cb: (t: number) => void): number => {
  rafQueue.push(cb);
  return rafQueue.length;
};
g.cancelAnimationFrame = (id: number): void => {
  if (id >= 1 && id <= rafQueue.length) rafQueue[id - 1] = null;
};
g.performance = { now: () => rafClock };

/** Advances the fake clock by dtMs and fires whatever was queued BEFORE this call -- a
 *  callback that schedules a new frame during this flush runs on the NEXT flushFrame, same
 *  as a real rAF loop, not re-entrantly in this one. */
function flushFrame(dtMs: number): void {
  rafClock += dtMs;
  const due = rafQueue;
  rafQueue = [];
  const now = rafClock;
  for (const cb of due) if (cb) cb(now);
}

function pendingFrameCount(): number {
  return rafQueue.filter((cb) => cb !== null).length;
}

/** Node's test runner runs every `test()` in this file in ONE process, so the fake rAF
 *  queue/clock are module-level state that would otherwise leak between tests (a cancelled
 *  slot from test N is still sitting in the array, shifting every id test N+1 sees). Reset
 *  at the start of every test instead, same as a real browser gets a fresh scheduler per
 *  page load. */
function resetHarness(): void {
  rafQueue = [];
  rafClock = 0;
  fetchImpl = async () => { throw new Error('fetchImpl not set for this test'); };
}

type FetchImpl = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
let fetchImpl: FetchImpl = async () => { throw new Error('fetchImpl not set for this test'); };
g.fetch = (url: string) => fetchImpl(url);

function jsonOk(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => body });
}
function httpError(status: number) {
  return Promise.resolve({ ok: false, status, json: async () => ({}) });
}

// Imported AFTER the DOM/rAF/fetch globals above exist -- react-dom reads `window` at
// module load, and useReplay's module-level code has none of its own, but importing late
// keeps the ordering obviously correct rather than relying on hoisting.
const { act } = await import('react');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { useReplay } = await import('./useReplay');
type UseReplayResult = Awaited<ReturnType<typeof useReplay>>;

function renderUseReplay(hours = 1) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  // A property mutation on a box the test owns, not a reassignment of an outer binding --
  // the lint rule against "reassigning a variable declared outside the component" is really
  // about hooks depending on render-external mutable state; this box exists ONLY so the test
  // can read what the hook returned, and nothing inside Harness ever reads `box` back.
  const box: { current: UseReplayResult | undefined } = { current: undefined };
  function Harness() {
    // react-hooks/immutability flags this as "modifying a variable defined outside a
    // component/hook" -- correct in production code, but the entire point of this test
    // harness IS to read the hook's return value from outside React. There is no app-code
    // equivalent of this pattern to protect against; disabling narrowly rather than
    // reshaping a test-only file around a lint rule written for shipped components.
    // eslint-disable-next-line react-hooks/immutability
    box.current = useReplay(hours);
    return null;
  }
  act(() => { root.render(React.createElement(Harness)); });
  return {
    get: (): UseReplayResult => box.current!,
    unmount: () => { act(() => root.unmount()); container.remove(); },
  };
}

/** Lets pending microtasks (an awaited fetch, its .then) run inside `act`, without a real
 *  timer -- a promise resolution is a microtask, not a macrotask, so this needs no clock. */
async function drain(): Promise<void> {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

const FIXTURE = [
  { t: '2026-01-01T00:00:00.000Z', from: 'a', to: 'b', type: 'task' },
  { t: '2026-01-01T00:00:10.000Z', from: 'b', to: 'a', type: 'reply' },
  { t: '2026-01-01T00:00:20.000Z', from: 'a', to: 'b', type: 'progress' },
];

test('harness sanity: play() schedules a frame, flushFrame() advances the cursor', async () => {
  resetHarness();
  fetchImpl = async () => jsonOk({ events: FIXTURE });
  const h = renderUseReplay(1);
  await drain();
  assert.equal(h.get().state.events.length, 3, 'fixture must actually load before the real assertions mean anything');
  act(() => { h.get().play(); });
  assert.equal(h.get().state.playing, true);
  assert.equal(pendingFrameCount(), 1, 'play() must schedule exactly one frame');
  const cursorBefore = h.get().state.cursor;
  act(() => { flushFrame(1000); });
  assert.ok(h.get().state.cursor > cursorBefore, 'a flushed frame must advance the cursor');
  h.unmount();
});

test('frozen-loop guard (c383418): a stale frame that fires anyway does not advance the paused state', async () => {
  resetHarness();
  fetchImpl = async () => jsonOk({ events: FIXTURE });
  const h = renderUseReplay(1);
  await drain();
  act(() => { h.get().play(); });
  assert.equal(h.get().state.playing, true);
  assert.equal(pendingFrameCount(), 1);
  // Capture the ACTUAL scheduled callback (the real `loop`, via requestAnimationFrame)
  // before anything cancels it -- this is what "a stop that races a play" means: in a real
  // browser, cancelAnimationFrame and an in-flight callback are not atomic, so the callback
  // can still be invoked after the state says stop. Grabbing the reference here and firing
  // it manually below reproduces that race deterministically instead of hoping for it.
  const staleFrame = rafQueue[rafQueue.length - 1];
  assert.ok(staleFrame, 'must have actually captured the scheduled loop callback');

  // The hazard c383418 closed: a frame is already scheduled, then the window changes.
  // stopLoop() cancels it in the non-raced case -- assert that too, so a regression in
  // cancellation itself is caught here rather than masked by the guard below.
  act(() => { h.get().setWindow(6); });
  assert.equal(pendingFrameCount(), 0, 'setWindow must cancel the in-flight frame in the non-raced case');
  assert.equal(h.get().state.playing, false, 'setWindow must pause the STATE, not just cancel the frame (c383418\'s second half)');

  const cursorAfterPause = h.get().state.cursor;
  const firedAfterPause = h.get().fired;
  // Fire the STALE callback directly, bypassing cancellation entirely -- the race
  // cancelAnimationFrame is meant to prevent, happening anyway. Without the guard in
  // loop() (`if (!stateRef.current.playing) return`), this would call advance() on a
  // state nobody asked to advance and schedule ANOTHER frame, the exact zombie-loop bug.
  act(() => { staleFrame!(rafClock + 16); });
  assert.equal(h.get().state.cursor, cursorAfterPause, 'a raced stale frame must not advance the cursor of a paused state');
  assert.equal(h.get().fired, firedAfterPause, 'a raced stale frame must not publish a new fired batch');
  assert.equal(pendingFrameCount(), 0, 'a raced stale frame must not reschedule itself');
  h.unmount();
});

test('window-change resume (49f4505): playing + change restarts in the new window and keeps playing', async () => {
  resetHarness();
  fetchImpl = async (url) => jsonOk({ events: url.includes('hours=24') ? FIXTURE : FIXTURE.slice(0, 2) });
  const h = renderUseReplay(24);
  await drain();
  act(() => { h.get().play(); });
  assert.equal(h.get().state.playing, true);

  act(() => { h.get().setWindow(6); });
  assert.equal(h.get().state.playing, false, 'must pause immediately, before the new window has even loaded');
  await drain();
  assert.equal(h.get().state.events.length, 2, 'the new window\'s (smaller) fixture must actually be the one that loaded');
  assert.equal(h.get().state.playing, true, 'a window change that was PLAYING must resume playing once the new window lands');
  assert.equal(h.get().state.cursor, h.get().state.t0, 'must restart from the BEGINNING of the new window, not the old cursor position');
  assert.equal(pendingFrameCount(), 1, 'resuming must actually schedule a frame, not just flip the playing flag');
  h.unmount();
});

test('window-change resume (49f4505): paused + change lands live and stays stopped', async () => {
  resetHarness();
  fetchImpl = async () => jsonOk({ events: FIXTURE });
  const h = renderUseReplay(24);
  await drain();
  // Never called play() -- starts live/not-playing by construction (initReplay's default).
  assert.equal(h.get().state.playing, false);

  act(() => { h.get().setWindow(6); });
  await drain();
  assert.equal(h.get().state.playing, false, 'a window change that was NOT playing must not start playing');
  assert.equal(h.get().state.live, true, 'must land live, matching a fresh load');
  assert.equal(pendingFrameCount(), 0, 'must not schedule a frame it has no intention of running');
  h.unmount();
});

test('window-change resume (49f4505): API down + change while playing does not auto-play into an error state', async () => {
  resetHarness();
  fetchImpl = async () => jsonOk({ events: FIXTURE });
  const h = renderUseReplay(24);
  await drain();
  act(() => { h.get().play(); });
  assert.equal(h.get().state.playing, true);

  // The window change's fetch fails this time -- the resume-after-load flag was recorded
  // at the click (while still playing), so the only thing standing between this and an
  // auto-play-into-error is loadHistory()'s "success path only" guard.
  fetchImpl = async () => httpError(502);
  act(() => { h.get().setWindow(6); });
  await drain();
  assert.ok(h.get().error, 'a failed load must surface the error');
  assert.equal(h.get().state.playing, false, 'must NOT auto-play into the error state');
  assert.equal(pendingFrameCount(), 0, 'must not leave a frame scheduled against an empty/error state');
  h.unmount();
});

test('tail flush (c2c5bd8, hook level): the final frame\'s fired events publish before going live, not after being discarded', async () => {
  resetHarness();
  fetchImpl = async () => jsonOk({ events: FIXTURE });
  const h = renderUseReplay(1);
  await drain();
  act(() => { h.get().play(); });
  // Advance PAST every event and past the window's own end in one giant frame -- exactly
  // the "last frame is also the ending frame" case c2c5bd8 fixed. REPLAY_MS is 45_000 at
  // speed 1, so a dt bigger than that guarantees ended=true on this single flush.
  act(() => { flushFrame(60_000); });
  assert.equal(h.get().state.playing, false, 'must have gone live by now');
  assert.equal(h.get().state.live, true);
  assert.ok(h.get().fired.length > 0, 'the ending frame\'s batch must have been published, not discarded, when it is ALSO the frame that fires the tail events');
  // FIXTURE's `t` is an ISO string; toReplayEvents() parses it to epoch ms exactly once at
  // load, so the published event's `.t` is the number, not the original string.
  assert.equal(h.get().fired[h.get().fired.length - 1].t, Date.parse(FIXTURE[FIXTURE.length - 1].t), 'the actual last event must be in that published batch');
  h.unmount();
});
