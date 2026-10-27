// What the Kanban board reads of a card, and how it moves one.
//
// The board is shared: the Tasks tab hands it rows from `/api/app/tasks`, a project's Tasks tab
// still hands it rows from the sample store (its own module moves to the API in its own wave). Both
// cards carry these fields with these meanings, so the board takes the fields rather than either
// type — the same thing `list/card-name.ts` does for the screen-reader name.
//
// Moving is the part that cannot be shared, because it is a write: the server takes steps gated by
// `can{}`, the sample store takes a status. So it is a seam the caller fills (`BoardMoves`), with
// the sample one as the default so the project tab keeps working untouched.
import type { TaskCard } from '@/data/tasks.api.map';
import type { BoardStatus } from '@/data/tasks.columns';

/** A card as the board's columns, cards and chips read it. */
export type BoardCardData = Pick<
  TaskCard,
  | 'no'
  | 'title'
  | 'project'
  | 'type'
  | 'priority'
  | 'status'
  | 'note'
  | 'due'
  | 'lateOnBoard'
  | 'lateBy'
  | 'people'
  | 'whoLabel'
  | 'steps'
  | 'mayChange'
>;

/**
 * The line under a card's title: "#12 · Atlas Project".
 *
 * My tasks shows the project, the team board showed the type — but a list row has no kind (A3), so
 * when there is none the project is shown instead of a dangling separator. Listed in
 * `docs/phase2-gap-disembunyikan.md`.
 */
export const cardPlace = (card: BoardCardData, mine: boolean): string =>
  mine ? card.project : (card.type ?? card.project);

/** How one board moves its cards. */
export type BoardMoves = {
  /** The columns this card may be moved to; empty means it may not be moved at all. */
  sidesFor: (card: BoardCardData) => readonly BoardStatus[];
  /** The columns every card of a group may be moved to. */
  sidesForAll: (cards: readonly BoardCardData[]) => readonly BoardStatus[];
  /**
   * Move these tasks to `to`. Resolves with the line to show afterwards, or null when there is
   * nothing to say.
   */
  move: (
    cards: readonly BoardCardData[],
    nos: readonly number[],
    to: BoardStatus,
  ) => string | null | Promise<string | null>;
  /** What to say when a card that cannot be moved is held. */
  denied: (card: BoardCardData) => string;
};
