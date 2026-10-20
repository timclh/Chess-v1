/**
 * Chat (global chat) safety wiring: profanity filter on incoming and outgoing
 * text, per-user block with unblock, report -> `report` message, contact line.
 * The socket is a fake; nothing touches the network.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import Chat from './Chat';

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

function mount() {
  act(() => {
    ReactDOM.render(<Chat />, container);
  });
  socket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  socket.readyState = FakeWebSocket.OPEN;
  act(() => socket.onopen());
}

function receive(payload) {
  act(() => socket.onmessage({ data: JSON.stringify(payload) }));
}

const buttonByText = (text) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes(text));

describe('Chat safety', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
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
    receive({ name: 'Eve', message: 'you fuck' });
    receive({ name: 'shit', message: 'hello' });

    expect(container.textContent).toContain('you ****');
    expect(container.textContent).not.toContain('fuck');
    expect(container.textContent).not.toMatch(/shit/);
  });

  test('masks profanity in outgoing messages before they leave the client', () => {
    mount();
    const input = container.querySelector('form input[type="text"]');
    act(() => {
      Simulate.change(input, { target: { value: 'hello 傻逼 shit' } });
    });
    act(() => {
      Simulate.submit(container.querySelector('form'));
    });

    expect(socket.sent).toHaveLength(1);
    expect(socket.sent[0]).toEqual({ name: 'Bob', message: 'hello ** ****' });
  });

  test('block hides the user, persists, and unblock brings them back', () => {
    mount();
    receive({ name: 'Eve', message: 'first' });
    receive({ name: 'Mallory', message: 'second' });
    expect(container.textContent).toContain('first');

    act(() => {
      // Messages are newest-first; Eve's is the older one => its Block button is last
      const blocks = Array.from(container.querySelectorAll('button')).filter((b) => b.textContent.includes('屏蔽'));
      expect(blocks).toHaveLength(2);
      blocks[1].click();
    });

    expect(container.textContent).not.toContain('first');
    expect(container.textContent).toContain('second');
    expect(JSON.parse(localStorage.getItem('qi_arena_blocked_users'))).toEqual(['Eve']);
    expect(container.textContent).toContain('已屏蔽 / Blocked (1)');

    // Messages from the blocked user stay hidden as they arrive
    receive({ name: 'eve', message: 'third' });
    expect(container.textContent).not.toContain('third');

    act(() => {
      buttonByText('解除 Unblock').click();
    });
    expect(container.textContent).toContain('first');
    expect(container.textContent).toContain('third');
    expect(JSON.parse(localStorage.getItem('qi_arena_blocked_users'))).toEqual([]);
  });

  test('a block survives a remount (persisted)', () => {
    localStorage.setItem('qi_arena_blocked_users', JSON.stringify(['Eve']));
    mount();
    receive({ name: 'Eve', message: 'hidden from the start' });
    receive({ name: 'Bob2', message: 'visible' });
    expect(container.textContent).not.toContain('hidden from the start');
    expect(container.textContent).toContain('visible');
  });

  test('report sends the original text and chosen reason to the backend', () => {
    mount();
    receive({ name: 'Eve', message: 'you fuck' });

    act(() => {
      buttonByText('举报 Report').click();
    });
    const select = container.querySelector('.chat-report-form select');
    expect(select).not.toBeNull();
    act(() => {
      Simulate.change(select, { target: { value: 'spam' } });
    });
    act(() => {
      buttonByText('提交 Submit').click();
    });

    expect(socket.sent).toEqual([
      { type: 'report', reportedName: 'Eve', text: 'you fuck', reason: 'spam' },
    ]);
    expect(buttonByText('已举报 Reported')).toBeTruthy();
  });

  test('own messages and server acknowledgements have no block/report buttons', () => {
    mount();
    const input = container.querySelector('form input[type="text"]');
    act(() => {
      Simulate.change(input, { target: { value: 'my own message' } });
    });
    act(() => {
      Simulate.submit(container.querySelector('form'));
    });
    receive({ type: 'report_received', ok: true, message: '举报已收到，谢谢 / Report received, thank you' });

    expect(container.textContent).toContain('my own message');
    expect(container.textContent).toContain('Report received');
    expect(buttonByText('屏蔽 Block')).toBeUndefined();
    expect(buttonByText('举报 Report')).toBeUndefined();
  });

  test('shows a visible contact line with the support address', () => {
    mount();
    const link = container.querySelector('.chat-safety a');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('mailto:support@chessarena.app');
    expect(container.querySelector('.chat-safety-note').textContent).toMatch(/联系.*contact/);
  });
});
