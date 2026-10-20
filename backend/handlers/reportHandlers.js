/**
 * Chat report handler — a player flags another player's chat message.
 *
 * The report is kept in a bounded in-memory list and logged as one line.
 * There is no persistence, dashboard or automated action; the sender gets
 * an acknowledgement ({ type: 'report_received', ok, message }).
 */

const WebSocket = require('ws');
const config = require('../config');

function send(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/** Trim and bound a client-supplied string; non-strings become '' */
function clip(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function handleReport(ws, message, _roomManager, reportStore) {
  const { minIntervalMs, maxNameLength, maxTextLength, maxReasonLength } = config.reports;
  const now = Date.now();

  if (ws.lastReportAt && now - ws.lastReportAt < minIntervalMs) {
    return send(ws, {
      type: 'report_received',
      ok: false,
      message: '举报过于频繁，请稍后再试 / Too many reports, please wait a moment',
    });
  }

  const reportedName = clip(message.reportedName, maxNameLength);
  const text = clip(message.text, maxTextLength);
  if (!reportedName || !text) {
    return send(ws, {
      type: 'report_received',
      ok: false,
      message: '举报内容无效 / Invalid report',
    });
  }

  ws.lastReportAt = now;
  const report = reportStore.add({
    at: new Date(now).toISOString(),
    reporter: ws.playerName || null,
    roomId: ws.roomId || null,
    reportedName,
    text,
    reason: clip(message.reason, maxReasonLength) || 'other',
  });

  // One line, JSON-encoded so user text cannot forge extra log lines
  console.log(`[report] ${JSON.stringify(report)}`);

  send(ws, {
    type: 'report_received',
    ok: true,
    message: '举报已收到，谢谢 / Report received, thank you',
  });
}

module.exports = { handleReport };
