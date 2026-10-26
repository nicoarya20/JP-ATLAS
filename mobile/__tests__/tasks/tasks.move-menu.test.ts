// Measuring a group move's cards (board/move-menu.state): every card's place from the menu centre, or null with a
// warning that names the task and the reason when a card cannot be measured.
import type { HostInstance } from 'react-native';

import { measureGroup } from '../../src/screens/tasks/board/move-menu.state';

const SCREEN = { width: 390, height: 844 };
const CENTER = { x: 195, y: 400 };
const CARDS = [
  { no: 14, title: 'Write the API spec' },
  { no: 9, title: 'Client portal copy' },
];

/** A view measured at (x, y) as 100 × 40 (test-only). */
const at = (x: number, y: number) =>
  ({
    measureInWindow: (done: (x: number, y: number, w: number, h: number) => void) =>
      done(x, y, 100, 40),
  }) as unknown as HostInstance;

let warn: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

describe('measureGroup', () => {
  it('gives each card its offset from the centre, held card first', async () => {
    const views = new Map([
      [14, at(0, 0)],
      [9, at(200, 500)],
    ]);
    const stack = await measureGroup(14, views, CARDS, SCREEN, CENTER);
    expect(stack?.map((c) => c.no)).toEqual([14, 9]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('a card that is not on the board: null, and a warning with the task and the reason', async () => {
    const stack = await measureGroup(14, new Map([[14, at(0, 0)]]), CARDS, SCREEN, CENTER);
    expect(stack).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'Move menu of task #14 closed: measuring its group of 2 failed: Cannot measure a card of the group move: it is not on the board',
    );
  });

  it('a view whose measuring throws: null, with that reason', async () => {
    const broken = {
      measureInWindow: () => {
        throw new Error('view detached');
      },
    } as unknown as HostInstance;
    const stack = await measureGroup(
      9,
      new Map([
        [14, at(0, 0)],
        [9, broken],
      ]),
      CARDS,
      SCREEN,
      CENTER,
    );
    expect(stack).toBeNull();
    expect(warn.mock.calls[0]?.[0]).toMatch(/^Move menu of task #9 closed: .*view detached$/);
  });
});
