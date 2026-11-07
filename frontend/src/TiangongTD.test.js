import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import TiangongTD, { isDeployableCell } from './TiangongTD';
import HomePage from './HomePage';
import { CELESTIAL_DECREES } from './data/tiangongAssets';

describe('TiangongTD (天宫弈 · 南天门守卫战)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
      container = null;
    }
  });

  test('renders initial celestial star-board, HUD stats, and starter towers', () => {
    act(() => {
      ReactDOM.render(<TiangongTD />, container);
    });
    expect(container.querySelector('[data-testid="tiangong-td"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tg-stones"]').textContent).toContain('140');
    expect(container.querySelector('[data-testid="tg-core-hp"]').textContent).toContain('20/20');
    expect(container.querySelector('[data-testid="tg-tower-count"]').textContent).toContain('2 尊');
    expect(container.textContent).toContain('南天门');
  });

  test('isDeployableCell forbids river row, spawn row, and Nantianmen core cell', () => {
    expect(isDeployableCell(0, 2)).toBe(false); // Abyssal Rift spawn row
    expect(isDeployableCell(3, 2)).toBe(false); // Celestial River row
    expect(isDeployableCell(7, 3)).toBe(false); // Nantianmen Core cell
    expect(isDeployableCell(2, 3)).toBe(true);
    expect(isDeployableCell(5, 4)).toBe(true);
  });

  test('summoning a tower spends Spirit Stones and increases tower count', () => {
    act(() => {
      ReactDOM.render(<TiangongTD />, container);
    });
    const summonBtn = container.querySelector('[data-testid="tg-summon-btn"]');
    act(() => {
      summonBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="tg-stones"]').textContent).toContain('100');
    expect(container.querySelector('[data-testid="tg-tower-count"]').textContent).toContain('3 尊');
  });

  test('merging two 2-star towers triggers 3-star 法天象地 Awakening Cut-in modal', () => {
    const ref = React.createRef();
    act(() => {
      ReactDOM.render(<TiangongTD ref={ref} />, container);
    });

    act(() => {
      ref.current.setState({
        towers: [
          { id: 't1', type: 'ma', star: 2, row: 4, col: 1, lastShotAt: 0 },
          { id: 't2', type: 'ma', star: 2, row: 4, col: 2, lastShotAt: 0 },
        ],
      });
    });

    const mergeBtn = container.querySelector('[data-testid="tg-merge-btn"]');
    expect(mergeBtn.disabled).toBe(false);
    act(() => {
      mergeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="tg-awakening-modal"]')).not.toBeNull();
    expect(container.textContent).toContain('二郎显圣真君');
    expect(container.querySelector('[data-testid="tg-tower-count"]').textContent).toContain('1 尊');
  });

  test('selecting a Roguelike Celestial Decree advances wave and applies bonuses', () => {
    const ref = React.createRef();
    act(() => {
      ReactDOM.render(<TiangongTD ref={ref} />, container);
    });

    const decree = CELESTIAL_DECREES.find((d) => d.id === 'sadou_chengbing');
    act(() => {
      ref.current.setState({
        decreeChoices: [decree],
      });
    });

    const decreeBtn = container.querySelector('[data-testid="tg-decree-sadou_chengbing"]');
    act(() => {
      decreeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="tg-decree-modal"]')).toBeNull();
    expect(ref.current.state.waveIndex).toBe(1);
    expect(ref.current.state.activeDecrees).toContain('sadou_chengbing');
    expect(container.querySelector('[data-testid="tg-stones"]').textContent).toContain('230');
  });

  test('HomePage features Tiangong TD hero card that navigates to tiangong mode', () => {
    const onNavigate = jest.fn();
    act(() => {
      ReactDOM.render(<HomePage onNavigate={onNavigate} />, container);
    });

    const hero = container.querySelector('[data-testid="home-tiangong-hero"]');
    act(() => {
      hero.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onNavigate).toHaveBeenCalledWith('tiangong');
  });
});
