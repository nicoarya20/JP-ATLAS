/**
 * Moving a task between the board's columns, the way the server takes it.
 *
 * The board shows statuses; the server takes *steps*, and only the twelve transitions of
 * `TASK_TRANSITIONS` exist. So which sides of the move menu a card offers is `can{}`'s answer for
 * that card (`moveCapKey` in `tasks.api.values.ts`) — a side can be open on one card and shut on
 * the next, and nothing here asks who is signed in. The map doc is explicit about the order: shut
 * the side **before** the menu opens rather than letting the server answer `409 WRONG_STATE` to a
 * gesture the app should never have offered.
 *
 * There is no bulk route, so a group move is one request per task. They go out together and the
 * stores are named **once** afterwards: §2 of `docs/phase2-pola-data.md` asks that a successful
 * write name everything it could have changed, and a group of five naming them five times would
 * refetch every list five times over for one gesture.
 */
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { invalidateAll } from './resource';
import { capOn } from './tasks.api.map';
import type { WireCaps } from './tasks.api.types';
import { moveCapKey, moveStep } from './tasks.api.values';
import { everyTaskStore, postStep } from './tasks.api.write';
import { type BoardStatus, COLUMNS } from './tasks.columns';
import type { TaskStatus } from './tasks.shared';

/** What moving a card needs of it: which task, where it is now, and what the server allows. */
export type MovableCard = { no: number; status: TaskStatus; can: WireCaps };

/** The columns a card may be moved to, as `can{}` allows — never as a rule of this app's own. */
export const movableTo = (card: MovableCard): BoardStatus[] =>
  COLUMNS.map((c) => c.status).filter((to) => {
    const cap = moveCapKey(card.status, to);
    return cap !== null && capOn(card.can, cap);
  });

/** Whether the card may be moved at all, so holding it is worth a menu. */
export const isMovable = (card: MovableCard): boolean => movableTo(card).length > 0;

/** The columns every card of a group may be moved to; a side one card cannot take is not offered. */
export const movableToAll = (cards: readonly MovableCard[]): BoardStatus[] =>
  COLUMNS.map((c) => c.status).filter(
    (to) => cards.length > 0 && cards.every((card) => movableTo(card).includes(to)),
  );

export type BoardMoveOutcome = {
  /** How many tasks the server really moved. */
  moved: number;
  /** Cards the move was not offered for; nothing was sent for them. */
  skipped: number;
  /** The first refusal, for the caller to word with the server's own sentence (K5). */
  failure: unknown;
};

/**
 * Move `nos` to column `to`, one request per task.
 *
 * A card the server does not offer this move for is skipped rather than tried: the menu shut that
 * side already, and a card whose state changed under us is better left alone than sent a step its
 * own `can{}` says nothing about. A refusal is routed to the gate (§3) and handed back, not
 * swallowed — the caller shows it.
 */
export async function moveTasksOnBoard(
  cards: readonly MovableCard[],
  nos: readonly number[],
  to: BoardStatus,
): Promise<BoardMoveOutcome> {
  const steps: { no: number; path: string }[] = [];
  let skipped = 0;
  for (const no of nos) {
    const card = cards.find((c) => c.no === no);
    const path = card && movableTo(card).includes(to) ? moveStep(card.status, to) : null;
    if (path) steps.push({ no, path });
    else skipped += 1;
  }
  const answers = await Promise.allSettled(steps.map((s) => postStep(s.no, s.path)));
  let failure: unknown = null;
  for (const answer of answers) {
    if (answer.status !== 'rejected') continue;
    if (isApiError(answer.reason)) applyApiError(answer.reason);
    if (failure === null) failure = answer.reason;
  }
  const moved = answers.filter((a) => a.status === 'fulfilled').length;
  if (moved > 0) invalidateAll(everyTaskStore());
  return { moved, skipped, failure };
}
