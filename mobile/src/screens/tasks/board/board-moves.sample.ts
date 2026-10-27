// The board's moves against the sample store, for the callers that still read it (a project's Tasks
// tab). Exactly what `task-board.tsx` and `use-move-menu.ts` did inline before the Tasks tab moved
// to the API: the viewer's own rule about who may change a task, and one write to `tasks.store`.
//
// It goes with `src/data/tasks.store.ts`: when the project module moves to `/api/app/projects` this
// file goes with it, and `board-moves.server.ts` is the only one left.
import { me } from '@/data/people';
import type { Role } from '@/data/sample';
import { type BoardStatus, COLUMNS, sharedStatus } from '@/data/tasks.columns';
import { deniedNotice } from '@/data/tasks.shared';
import { getTask } from '@/data/tasks.state';
import { moveOnBoard } from '@/data/tasks.store';

import type { BoardCardData, BoardMoves } from './board-cards';

/** Every column but the one the card is in; the sample store accepts any of them. */
const otherColumns = (from: string | null) =>
  COLUMNS.filter((c) => c.status !== from).map((c) => c.status);

/** The board's moves for the sample store, as the viewer `role` may make them. */
export const sampleMoves = (role: Role): BoardMoves => ({
  sidesFor: (card) => (card.mayChange ? otherColumns(card.status) : []),
  sidesForAll: (cards) =>
    cards.every((c) => c.mayChange) ? otherColumns(sharedStatus(cards)) : [],
  move: (_cards: readonly BoardCardData[], nos: readonly number[], to: BoardStatus) =>
    moveOnBoard(me(role), [...nos], to).notice,
  denied: (card) => {
    const task = getTask(card.no);
    if (!task)
      throw new Error(`Cannot say why task #${card.no} may not move: it is not in the store`);
    return deniedNotice(task);
  },
});
