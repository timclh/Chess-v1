/**
 * Multiplayer room chat safety wiring: profanity filter (incoming, outgoing,
 * sender names), block / unblock, report -> `report` message, server
 * acknowledgement, and the visible contact line. The socket is a fake.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import Multiplayer from './Multiplayer';

// chess.js 0.11 only sets `exports.Chess` under Node (webpack's AMD `define`
// makes it the default export in the real bundle), so mirror the bundle here.
jest.mock('chess.js', () => jest.requireActual('chess.js').Chess);

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }
  send(data) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
  }
}
FakeWebSocket.OPEN = 1;
FakeWebSocket.instances = [];

let container;
let socket;
const realWebSocket = global.WebSocket;
let idCounter;

function mount() {
  act(() => {
    ReactDOM.render(<Multiplayer onBack={() => {}} />, container);
  });
  socket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  socket.readyState = FakeWebSocket.OPEN;
  act(() => socket.onopen());
  // Put the player in a room with an opponent so the chat input is enabled
  receive({
    type: 'room_joined',
    roomId: 'ROOM1',
    playerColor: 'w',
    opponentName: 'Eve',
    gameState: { fen: 'start', history: [] },
  });
}

function receive(payload) {
  act(() => socket.onmessage({ data: JSON.stringify(payload) }));
}

// Date.now() is the message key in Multiplayer; keep it unique between messages
function receiveChat(name, message) {
  idCounter += 1;
  jest.setSystemTime(idCounter * 1000);
  receive({ type: 'chat', name, message });
}

const buttonByText = (text) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes(text));

const chatText = () => container.querySelector('.chat-messages').textContent;

describe('Multiplayer chat safety', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
    idCounter = 0;
    localStorage.clear();
    localStorage.setItem('chess_player_name', 'Me');
    FakeWebSocket.instances = [];
    global.WebSocket = FakeWebSocket;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    global.WebSocket = realWebSocket;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('masks profanity in incoming messages and sender names', () => {
    mount();
    receiveChat('Eve', 'you fuck');
    receiveChat('shit', 'hello');

    expect(chatText()).toContain('you ****');
    expect(chatText()).not.toMatch(/fuck/);
    expect(chatText()).not.toMatch(/shit/);
  });

  test('masks profanity before an outgoing message is sent, and echoes it masked', () => {
    mount();
    const input = container.querySelector('.chat-input');
    act(() => {
      Simulate.change(input, { target: { value: 'hello 傻逼 shit' } });
    });
    act(() => {
      buttonByText('Send').click();
    });

    const chats = socket.sent.filter((m) => m.type === 'chat');
    expect(chats).toEqual([{ type: 'chat', text: 'hello ** ****' }]);
    expect(chatText()).toContain('hello ** ****');
  });

  test('block hides the opponent, persists, and unblock restores them', () => {
    mount();
    receiveChat('Eve', 'first message');
    expect(chatText()).toContain('first message');

    act(() => {
      buttonByText('屏蔽 Block').click();
    });
    expect(chatText()).not.toContain('first message');
    expect(JSON.parse(localStorage.getItem('qi_arena_blocked_users'))).toEqual(['Eve']);
    expect(container.textContent).toContain('已屏蔽 / Blocked (1)');

    receiveChat('Eve', 'second message');
    expect(chatText()).not.toContain('second message');

    act(() => {
      buttonByText('解除 Unblock').click();
    });
    expect(chatText()).toContain('first message');
    expect(chatText()).toContain('second message');
  });

  test('a stored block is applied on load', () => {
    localStorage.setItem('qi_arena_blocked_users', JSON.stringify(['eve']));
    mount();
    receiveChat('Eve', 'should stay hidden');
    receiveChat('Other', 'visible');
    expect(chatText()).not.toContain('should stay hidden');
    expect(chatText()).toContain('visible');
  });

  test('report sends the original text and reason, then shows the acknowledgement', () => {
    mount();
    receiveChat('Eve', 'you fuck');
    expect(chatText()).toContain('you ****');

    act(() => {
      buttonByText('举报 Report').click();
    });
    const select = container.querySelector('.chat-report-form select');
    act(() => {
      Simulate.change(select, { target: { value: 'abuse' } });
    });
    act(() => {
      buttonByText('提交 Submit').click();
    });

    expect(socket.sent.filter((m) => m.type === 'report')).toEqual([
      { type: 'report', reportedName: 'Eve', text: 'you fuck', reason: 'abuse' },
    ]);

    jest.setSystemTime(99000);
    receive({ type: 'report_received', ok: true, message: '举报已收到，谢谢 / Report received, thank you' });
    expect(chatText()).toContain('Report received');
  });

  test('own messages (including the server echo) have no block/report buttons', () => {
    mount();
    receiveChat('Me', 'my own message');
    expect(chatText()).toContain('my own message');
    expect(buttonByText('屏蔽 Block')).toBeUndefined();
    expect(buttonByText('举报 Report')).toBeUndefined();
  });

  test('shows a visible contact line with the support address', () => {
    mount();
    const link = container.querySelector('.chat-panel .chat-safety a');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('mailto:support@chessarena.app');
  });
});
