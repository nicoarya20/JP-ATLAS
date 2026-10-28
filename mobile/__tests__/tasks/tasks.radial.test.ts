import {
  COLUMNS,
  holdGroup,
  movedNotice,
  SIDE_OF_STATUS,
  STATUS_OF_SIDE,
  selectionHint,
  sharedStatus,
} from '../../src/data/tasks.columns';
import {
  aimOf,
  angleOf,
  clampCenter,
  EDGE,
  GROUP_EDGE,
  HOLD_MS,
  MOTION,
  offsetOf,
  PICK_PX,
  SLOP_PX,
  stackPose,
} from '../../src/data/tasks.radial';

describe('Kanban columns', () => {
  test('workflow order with fixed menu sides: To do up, In progress right, In review down, Done left', () => {
    expect(COLUMNS.map((c) => [c.status, c.side])).toEqual([
      ['To do', 'up'],
      ['In progress', 'right'],
      ['In review', 'down'],
      ['Done', 'left'],
    ]);
    expect(STATUS_OF_SIDE.right).toBe('In progress');
    expect(SIDE_OF_STATUS.Done).toBe('left');
  });

  test('a hold moves the selection only when the held card is one of several picks, held one first', () => {
    expect(holdGroup(12, [14, 12, 17])).toEqual([12, 14, 17]);
    expect(holdGroup(12, [12])).toEqual([12]);
    expect(holdGroup(9, [14, 12])).toEqual([9]);
  });

  test('shared status of a group, notices and the live region', () => {
    expect(sharedStatus([{ status: 'To do' }, { status: 'To do' }])).toBe('To do');
    expect(sharedStatus([{ status: 'To do' }, { status: 'Done' }])).toBeNull();
    expect(movedNotice(false, 1, 'In progress')).toBe('Moved to In progress');
    expect(movedNotice(true, 2, 'Done')).toBe('Moved 2 tasks to Done');
    expect(movedNotice(true, 1, 'Done')).toBe('Moved 1 task to Done');
    expect(selectionHint(0)).toBe('Tap tasks to select them');
    expect(selectionHint(2)).toBe('2 selected, hold one to move them');
  });
});

describe('move menu maths', () => {
  test('constants are the prototype ones', () => {
    expect([HOLD_MS, SLOP_PX, PICK_PX]).toEqual([350, 8, 28]);
    expect(EDGE).toEqual({ x: 164, top: 140, bottom: 200 });
    expect(GROUP_EDGE).toEqual({ x: 172, top: 164, bottom: 250 });
    expect(MOTION).toMatchObject({
      optionMs: 200,
      optionStaggerMs: 25,
      aimScale: 1.12,
      closeMs: 240,
    });
  });

  test('aims at nothing while the slide is shorter than 28 px', () => {
    expect(aimOf(0, 0)).toBeNull();
    expect(aimOf(27, 0)).toBeNull();
    expect(aimOf(19, 19)).toBeNull();
    expect(aimOf(28, 0)).toBe('In progress');
  });

  test('aims by the longer axis; a tie goes vertical', () => {
    expect(aimOf(40, 10)).toBe('In progress');
    expect(aimOf(-40, 30)).toBe('Done');
    expect(aimOf(10, 40)).toBe('In review');
    expect(aimOf(-30, -40)).toBe('To do');
    expect(aimOf(30, 30)).toBe('In review');
    expect(aimOf(30, -30)).toBe('To do');
  });

  test('angle of a slide in degrees', () => {
    expect(angleOf(10, 0)).toBe(0);
    expect(angleOf(0, 10)).toBe(90);
  });

  test('keeps the menu centre away from the edges, wider for a group', () => {
    expect(clampCenter(10, 10, 390, 844, false)).toEqual({ x: 164, y: 140 });
    expect(clampCenter(380, 840, 390, 844, false)).toEqual({ x: 226, y: 644 });
    expect(clampCenter(200, 400, 390, 844, false)).toEqual({ x: 200, y: 400 });
    expect(clampCenter(10, 840, 390, 844, true)).toEqual({ x: 172, y: 594 });
    // A screen narrower than two edges keeps the left edge, like the prototype's clamp.
    expect(clampCenter(100, 300, 300, 844, false).x).toBe(164);
  });

  test('a card offset is measured from its centre, pulled inside the screen', () => {
    const card = { x: 20, y: 100, width: 100, height: 60 };
    expect(offsetOf(card, 390, 844, 200, 400)).toEqual({ dx: -130, dy: -270 });
    expect(offsetOf({ ...card, x: 500 }, 390, 844, 200, 400)).toEqual({ dx: 190, dy: -270 });
  });

  test('stacked cards lean on alternating sides and rise', () => {
    expect([0, 1, 2, 3].map(stackPose)).toEqual([
      { tilt: -0, lift: -0 },
      { tilt: 4, lift: -3 },
      { tilt: -4, lift: -6 },
      { tilt: 8, lift: -9 },
    ]);
  });
});
