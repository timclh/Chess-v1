/**
 * CoachLayout: the pieces that keep the coach panel from shaking the page.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { SuggestionSkeleton, StableHeight } from './CoachLayout';

let container;
let heights; // the "natural" height jsdom cannot measure: set per test, read through offsetHeight

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  heights = { current: 100 };
  // jsdom has no layout: report the height of the content, but never less than min-height,
  // like a browser does for a box with min-height
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      const min = parseFloat(this.style.minHeight) || 0;
      return Math.max(heights.current, min);
    },
  });
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  container.remove();
  delete HTMLElement.prototype.offsetHeight;
});

const render = (ui) => act(async () => { ReactDOM.render(ui, container); });
const panel = () => container.firstChild;

describe('SuggestionSkeleton', () => {
  test('is the same shape as real suggestion cards, with invisible text, and announces itself', () => {
    act(() => { ReactDOM.render(<SuggestionSkeleton count={2} label="Analyzing" />, container); });

    const cards = container.querySelectorAll('.suggestion.skeleton');
    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      expect(card.querySelector('.suggestion-move .rank')).not.toBeNull();
      expect(card.querySelector('.suggestion-move .san')).not.toBeNull();
      expect(card.querySelector('.suggestion-move .win-prob')).not.toBeNull();
      expect(card.querySelector('.suggestion-reason')).not.toBeNull();
      expect(card.querySelectorAll('.skeleton-text').length).toBeGreaterThanOrEqual(3);
    });
    expect(container.querySelector('[role="status"]').getAttribute('aria-label')).toBe('Analyzing');
  });

  test('count sets how many cards', () => {
    act(() => { ReactDOM.render(<SuggestionSkeleton count={3} />, container); });
    expect(container.querySelectorAll('.suggestion.skeleton')).toHaveLength(3);
  });
});

describe('StableHeight', () => {
  test('never gets shorter while the same game goes on', async () => {
    heights.current = 400;
    await render(<StableHeight resetKey="g1" className="p">x</StableHeight>);
    expect(panel().style.minHeight).toBe('400px');

    heights.current = 250; // the content shrinks (the coach is thinking)
    await render(<StableHeight resetKey="g1" className="p">y</StableHeight>);
    expect(panel().style.minHeight).toBe('400px');

    heights.current = 520; // and grows past what it was: that becomes the new floor
    await render(<StableHeight resetKey="g1" className="p">z</StableHeight>);
    expect(panel().style.minHeight).toBe('520px');

    heights.current = 300;
    await render(<StableHeight resetKey="g1" className="p">w</StableHeight>);
    expect(panel().style.minHeight).toBe('520px');
  });

  test('starts from its natural height again for a new game', async () => {
    heights.current = 600;
    await render(<StableHeight resetKey="g1">x</StableHeight>);
    expect(panel().style.minHeight).toBe('600px');

    heights.current = 200;
    await render(<StableHeight resetKey="g2">x</StableHeight>);
    expect(panel().style.minHeight).toBe('200px');
  });

  test('does nothing for a sticky side panel, which scrolls on its own', async () => {
    heights.current = 300;
    await render(<StableHeight resetKey="g1" style={{ position: 'sticky' }}>x</StableHeight>);
    expect(panel().style.minHeight).toBe('');
  });

  test('never asks for more than the panel\'s own max-height', async () => {
    heights.current = 900;
    await render(<StableHeight resetKey="g1" style={{ maxHeight: '700px' }}>x</StableHeight>);
    expect(panel().style.minHeight).toBe('700px');
  });

  test('measures again when the window gets a different width, but not a different height', async () => {
    const width = window.innerWidth;
    heights.current = 500;
    await render(<StableHeight resetKey="g1">x</StableHeight>);
    expect(panel().style.minHeight).toBe('500px');

    // a phone's address bar hiding changes the height only
    window.innerHeight += 60;
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(panel().style.minHeight).toBe('500px');

    window.innerWidth = width + 200; // reflowed content
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(panel().style.minHeight).toBe('');

    heights.current = 320;
    await render(<StableHeight resetKey="g1">y</StableHeight>);
    expect(panel().style.minHeight).toBe('320px');
    window.innerWidth = width;
  });
});
