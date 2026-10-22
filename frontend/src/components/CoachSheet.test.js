/**
 * CoachSheet: three heights, changed by dragging or tapping the handle or with the
 * keyboard; Escape closes it.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import CoachSheet, { SNAPS, snapAfterDrag, snapAfterTap } from './CoachSheet';

describe('snap helpers', () => {
  test('dragging up goes taller, down goes shorter, a short drag changes nothing', () => {
    expect(snapAfterDrag('peek', -60)).toBe('half');
    expect(snapAfterDrag('half', -60)).toBe('full');
    expect(snapAfterDrag('full', -60)).toBe('full');
    expect(snapAfterDrag('full', 60)).toBe('half');
    expect(snapAfterDrag('half', 60)).toBe('peek');
    expect(snapAfterDrag('peek', 60)).toBe('peek');
    expect(snapAfterDrag('half', -10)).toBe('half');
    expect(snapAfterDrag('half', 39)).toBe('half');
  });

  test('tapping steps through the heights and wraps', () => {
    expect(SNAPS.map((s) => snapAfterTap(s))).toEqual(['half', 'full', 'peek']);
  });
});

describe('CoachSheet', () => {
  let container;
  const onClose = jest.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onClose.mockClear();
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  });

  const mount = (props = {}) => {
    act(() => {
      ReactDOM.render(
        <CoachSheet title="Coach" summary={<span className="chip">炮h2-e2 55%</span>} onClose={onClose} {...props}>
          <p className="body-text">details</p>
        </CoachSheet>,
        container,
      );
    });
    return container.querySelector('.coach-sheet');
  };
  const handle = () => container.querySelector('.coach-sheet-grab');
  const drag = (from, to) => {
    act(() => { Simulate.pointerDown(handle(), { clientY: from, pointerId: 1 }); });
    act(() => { Simulate.pointerMove(handle(), { clientY: (from + to) / 2 }); });
    act(() => { Simulate.pointerUp(handle(), { clientY: to }); });
  };

  test('opens collapsed with the summary visible and the details hidden from assistive tech', () => {
    const sheet = mount();
    expect(sheet.className).toContain('snap-peek');
    expect(sheet.querySelector('.coach-sheet-summary').textContent).toBe('炮h2-e2 55%');
    expect(sheet.querySelector('.coach-sheet-body').getAttribute('aria-hidden')).toBe('true');
    expect(handle().getAttribute('aria-expanded')).toBe('false');
    expect(sheet.getAttribute('role')).toBe('dialog');
  });

  test('can open at another height', () => {
    expect(mount({ initialSnap: 'half' }).className).toContain('snap-half');
  });

  test('tapping the handle steps through the heights', () => {
    const sheet = mount();
    const tap = () => act(() => {
      Simulate.pointerDown(handle(), { clientY: 500, pointerId: 1 });
      Simulate.pointerUp(handle(), { clientY: 500 });
    });
    tap();
    expect(sheet.className).toContain('snap-half');
    expect(handle().getAttribute('aria-expanded')).toBe('true');
    tap();
    expect(sheet.className).toContain('snap-full');
    tap();
    expect(sheet.className).toContain('snap-peek');
  });

  test('dragging the handle up and down changes the height', () => {
    const sheet = mount();
    drag(600, 480);
    expect(sheet.className).toContain('snap-half');
    drag(600, 480);
    expect(sheet.className).toContain('snap-full');
    drag(300, 420);
    expect(sheet.className).toContain('snap-half');
  });

  test('keyboard: arrows resize, Enter cycles, Escape closes', () => {
    const sheet = mount();
    act(() => { Simulate.keyDown(handle(), { key: 'ArrowUp' }); });
    expect(sheet.className).toContain('snap-half');
    act(() => { Simulate.keyDown(handle(), { key: 'ArrowDown' }); });
    expect(sheet.className).toContain('snap-peek');
    act(() => { Simulate.keyDown(handle(), { key: 'Enter' }); });
    expect(sheet.className).toContain('snap-half');

    expect(onClose).not.toHaveBeenCalled();
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('the close button closes', () => {
    mount();
    act(() => { Simulate.click(container.querySelector('.coach-close-btn')); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
