// The board's moves against the server: which sides a card offers comes from its `can{}`, and a
// move is one `POST /api/app/tasks/:ref/<step>` per task (there is no bulk route).
//
// What a move says afterwards is the honest count: the server moved some of the group or all of it,
// and a refusal is shown with the server's own sentence (K5). A card the move was not offered for
// is not counted as moved — the menu had already shut that side, so this only happens when the
// task changed under us, and saying "moved 2" for one would be the quiet lie the whole wave is
// about.
import {
  isMovable,
  type MovableCard,
  movableTo,
  movableToAll,
  moveTasksOnBoard,
} from '@/data/tasks.api.board';
import type { TaskCard } from '@/data/tasks.api.map';
import { movedNotice } from '@/data/tasks.columns';

import { whyFailed } from '../parts/write-failed';
import { BOARD } from '../tasks.strings.added';
import type { BoardCardData, BoardMoves } from './board-cards';

/**
 * The server's board needs a card's `can{}`, which `BoardCardData` leaves out on purpose — the
 * sample card has none. The Tasks tab hands over server cards, so the capabilities are there; a
 * card without them is a caller that mixed the two up, which is worth failing loudly for.
 */
function movable(card: BoardCardData): MovableCard {
  const can = (card as Partial<TaskCard>).can;
  if (!can)
    throw new Error(
      `Task #${card.no} has no can{} from the server: the server board was given a sample card`,
    );
  return { no: card.no, status: card.status, can };
}

/** The board's moves for cards from `/api/app/tasks`. */
export const serverMoves: BoardMoves = {
  sidesFor: (card) => movableTo(movable(card)),
  sidesForAll: (cards) => movableToAll(cards.map(movable)),
  move: async (cards, nos, to) => {
    const { moved, failure } = await moveTasksOnBoard(cards.map(movable), nos, to);
    if (moved > 0) return movedNotice(nos.length > 1, moved, to);
    return failure ? whyFailed(failure) : BOARD.notMoved;
  },
  denied: () => BOARD.cannotMove,
};

export { isMovable };
