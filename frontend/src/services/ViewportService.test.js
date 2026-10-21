import { fitBoardWidth, boardCalcWidth, fitXiangqiBoard, getAvailable } from './ViewportService';

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

describe('fitXiangqiBoard', () => {
  test('follows the width on a phone', () => {
    expect(fitXiangqiBoard(390, 844)).toBe(350);
    expect(fitXiangqiBoard(820, 1000)).toBe(450);
  });

  test('is limited by the height on a laptop so the whole board is visible', () => {
    expect(fitXiangqiBoard(1280, 800)).toBe(459); // 510px tall board
    expect(fitXiangqiBoard(1366, 768)).toBe(430);
  });

  test('has a floor and a ceiling', () => {
    expect(fitXiangqiBoard(1280, 500)).toBe(320);
    expect(fitXiangqiBoard(2560, 1600)).toBe(540);
  });
});

describe('available height', () => {
  const setViewport = (w, h) => { window.innerWidth = w; window.innerHeight = h; };

  test('counts the bottom tab bar on phones but not on wide screens, where the tabs are in the header', () => {
    setViewport(500, 800);
    const phone = getAvailable({}).height;
    setViewport(1280, 800);
    const wide = getAvailable({}).height;
    expect(wide - phone).toBe(56);
  });
});
