import Xiangqi from './xiangqi';
import LESSONS from './xiangqiLessons';

describe('xiangqi tutorial lessons', () => {
  LESSONS.forEach((lesson) => {
    describe(`lesson ${lesson.id} ${lesson.titleEn}`, () => {
      const make = () => {
        const g = new Xiangqi(lesson.fen);
        g.turn = 'r';
        return g;
      };

      it('uses only valid piece letters and has both generals', () => {
        expect(lesson.fen.replace(/[0-9/]/g, '')).toMatch(/^[kaehrcsKAEHRCS]+$/);
        const g = make();
        expect(g.findGeneral('r')).not.toBeNull();
        expect(g.findGeneral('b')).not.toBeNull();
      });

      it('starts with red to move and red can move', () => {
        expect(make().moves().length).toBeGreaterThan(0);
      });

      it('has no facing generals unless the lesson is about them', () => {
        const g = make();
        const r = g.findGeneral('r');
        const b = g.findGeneral('b');
        if (r.col === b.col) {
          let between = 0;
          for (let row = b.row + 1; row < r.row; row++) if (g.board[row][r.col]) between++;
          expect(between).toBeGreaterThan(0);
        }
      });

      it('every correct move is legal and achieves the goal', () => {
        expect(lesson.correctMoves.length).toBeGreaterThan(0);
        lesson.correctMoves.forEach((mv) => {
          const g = make();
          const [from, to] = mv.split('-');
          expect(g.moves().some((m) => m.from === from && m.to === to)).toBe(true);
          expect(g.move({ from, to })).toBeTruthy();
          if (lesson.expect === 'check') expect(g.in_check()).toBe(true);
          if (lesson.expect === 'mate') expect(g.in_checkmate()).toBe(true);
        });
      });

      it('has bilingual text and a hint', () => {
        ['title', 'titleEn', 'description', 'descriptionEn', 'objective', 'objectiveEn', 'hint', 'hintEn']
          .forEach((k) => expect(lesson[k]).toBeTruthy());
      });
    });
  });

  it('lesson 8 starts with red in check', () => {
    const lesson = LESSONS.find((l) => l.id === 8);
    const g = new Xiangqi(lesson.fen);
    g.turn = 'r';
    expect(g.in_check()).toBe(true);
  });
});
