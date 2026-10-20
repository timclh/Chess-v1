import { fitBoardWidth, boardCalcWidth } from './ViewportService';

describe('fitBoardWidth', () => {
  test('uses the desktop width when the screen is wide', () => {
    expect(fitBoardWidth(480, 72, 1440)).toBe(480);
  });

  test('shrinks to the screen minus the gutter on a phone', () => {
    expect(fitBoardWidth(480, 72, 390)).toBe(318);
  });

  test('never gets unusably small', () => {
    expect(fitBoardWidth(480, 72, 200)).toBe(240);
  });
});

describe('boardCalcWidth', () => {
  test('gives chessboardjsx a width that follows the screen', () => {
    const calc = boardCalcWidth(520, 76);
    expect(calc({ screenWidth: 1280, screenHeight: 800 })).toBe(520);
    expect(calc({ screenWidth: 390, screenHeight: 844 })).toBe(314);
  });
});
