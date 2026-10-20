/**
 * node --test handlers/reportHandlers.test.js   (or `npm test` in backend/)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');

const config = require('../config');
const ReportStore = require('../services/ReportStore');
const { handleReport } = require('./reportHandlers');

/** Minimal stand-in for a ws connection that records what was sent */
function fakeSocket(props = {}) {
  const sent = [];
  return {
    readyState: WebSocket.OPEN,
    send: (data) => sent.push(JSON.parse(data)),
    sent,
    ...props,
  };
}

function withQuietLog(fn) {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  try {
    return { result: fn(), lines };
  } finally {
    console.log = original;
  }
}

test('stores a valid report, logs one line and acknowledges', () => {
  const store = new ReportStore();
  const ws = fakeSocket({ playerName: 'Alice', roomId: 'ROOM1' });

  const { lines } = withQuietLog(() =>
    handleReport(ws, { type: 'report', reportedName: 'Bob', text: 'rude message', reason: 'abuse' }, null, store)
  );

  assert.equal(store.size, 1);
  const [report] = store.recent();
  assert.equal(report.reporter, 'Alice');
  assert.equal(report.roomId, 'ROOM1');
  assert.equal(report.reportedName, 'Bob');
  assert.equal(report.text, 'rude message');
  assert.equal(report.reason, 'abuse');
  assert.ok(!Number.isNaN(Date.parse(report.at)));

  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[report\] /);

  assert.equal(ws.sent.length, 1);
  assert.equal(ws.sent[0].type, 'report_received');
  assert.equal(ws.sent[0].ok, true);
});

test('works outside a room (global chat) and defaults the reason', () => {
  const store = new ReportStore();
  const ws = fakeSocket();
  withQuietLog(() => handleReport(ws, { reportedName: 'Bob', text: 'hi' }, null, store));

  const [report] = store.recent();
  assert.equal(report.roomId, null);
  assert.equal(report.reporter, null);
  assert.equal(report.reason, 'other');
});

test('rejects reports without a name or text and stores nothing', () => {
  const store = new ReportStore();
  const bad = [
    {},
    { reportedName: 'Bob' },
    { text: 'x' },
    { reportedName: '   ', text: 'x' },
    { reportedName: 42, text: { nested: true } },
  ];
  for (const message of bad) {
    const ws = fakeSocket();
    const { lines } = withQuietLog(() => handleReport(ws, message, null, store));
    assert.equal(ws.sent.length, 1);
    assert.equal(ws.sent[0].type, 'report_received');
    assert.equal(ws.sent[0].ok, false);
    assert.equal(lines.length, 0);
  }
  assert.equal(store.size, 0);
});

test('bounds name, text and reason length', () => {
  const store = new ReportStore();
  const ws = fakeSocket();
  const { maxNameLength, maxTextLength, maxReasonLength } = config.reports;

  withQuietLog(() =>
    handleReport(ws, {
      reportedName: 'n'.repeat(maxNameLength * 3),
      text: 't'.repeat(maxTextLength * 3),
      reason: 'r'.repeat(maxReasonLength * 3),
    }, null, store)
  );

  const [report] = store.recent();
  assert.equal(report.reportedName.length, maxNameLength);
  assert.equal(report.text.length, maxTextLength);
  assert.equal(report.reason.length, maxReasonLength);
});

test('user text cannot forge extra log lines', () => {
  const store = new ReportStore();
  const ws = fakeSocket();
  const { lines } = withQuietLog(() =>
    handleReport(ws, { reportedName: 'Bob', text: 'a\n[report] {"fake":true}' }, null, store)
  );
  assert.equal(lines.length, 1);
  assert.ok(!lines[0].includes('\n'));
});

test('rate-limits repeated reports from one connection', () => {
  const store = new ReportStore();
  const ws = fakeSocket();
  const message = { reportedName: 'Bob', text: 'spam spam' };

  withQuietLog(() => {
    handleReport(ws, message, null, store);
    handleReport(ws, message, null, store);
  });

  assert.equal(store.size, 1);
  assert.equal(ws.sent[0].ok, true);
  assert.equal(ws.sent[1].ok, false);

  // Another connection is not affected
  const other = fakeSocket();
  withQuietLog(() => handleReport(other, message, null, store));
  assert.equal(store.size, 2);

  // After the interval has passed the first connection may report again
  ws.lastReportAt -= config.reports.minIntervalMs + 1;
  withQuietLog(() => handleReport(ws, message, null, store));
  assert.equal(store.size, 3);
});

test('does not throw when the socket is already closed', () => {
  const store = new ReportStore();
  const ws = fakeSocket({ readyState: WebSocket.CLOSED });
  withQuietLog(() => handleReport(ws, { reportedName: 'Bob', text: 'hi' }, null, store));
  assert.equal(ws.sent.length, 0);
  assert.equal(store.size, 1);
});

test('ReportStore is bounded and keeps the newest reports', () => {
  const store = new ReportStore(3);
  for (let i = 1; i <= 5; i += 1) store.add({ n: i });
  assert.equal(store.size, 3);
  assert.deepEqual(store.recent().map((r) => r.n), [3, 4, 5]);
  assert.deepEqual(store.recent(2).map((r) => r.n), [4, 5]);
});
