// Shape of the open Kanban move menu, and where the cards of a group move sit when it opens (prototype tasks.radial.js
// offsetOf over the board's DOM): each card's window rect, measured from its registered view, from the menu centre.
import type { HostInstance } from 'react-native';

import type { BoardStatus } from '@/data/tasks.columns';
import { offsetOf } from '@/data/tasks.radial';
import type { TaskStatus } from '@/data/tasks.shared';

/** A card of a group move: where it sits from the menu centre, so it can fly in from there. */
export type StackCard = { no: number; title: string; dx: number; dy: number };

export type MoveMenuState = {
  /** The held card and every card the menu moves (held one first). */
  no: number;
  nos: number[];
  title: string;
  /** Status they share (marked Now), or null for a mixed group. */
  from: TaskStatus | null;
  /**
   * The columns this menu may move its tasks to, decided before it opened.
   *
   * The server takes steps, not statuses, and only twelve transitions exist; a side the task's own
   * `can{}` does not carry is drawn off rather than tried and refused with `409 WRONG_STATE`
   * (`phase2-map-tasks.md` §1.3).
   */
  allowed: readonly BoardStatus[];
  /** Menu centre in window px. */
  x: number;
  y: number;
  /** Let go without sliding: stays open for a tap. */
  sticky: boolean;
  group: boolean;
  /** The group's cards, once measured. */
  stack: StackCard[] | null;
};

type Rect = { x: number; y: number; width: number; height: number };

const measure = (el: HostInstance | undefined) =>
  new Promise<Rect>((done) => {
    if (!el) throw new Error('Cannot measure a card of the group move: it is not on the board');
    el.measureInWindow((x, y, width, height) => done({ x, y, width, height }));
  });

/** Offsets of the `cards` (held one first) from the centre (cx, cy) on a w × h window. */
export async function measureStack(
  views: ReadonlyMap<number, HostInstance>,
  cards: readonly { no: number; title: string }[],
  screen: { width: number; height: number },
  center: { x: number; y: number },
): Promise<StackCard[]> {
  const rects = await Promise.all(cards.map((c) => measure(views.get(c.no))));
  return rects.map((r, i) => ({
    ...cards[i],
    ...offsetOf(r, screen.width, screen.height, center.x, center.y),
  }));
}

/**
 * measureStack for the group menu of task #no, or null when a card could not be measured (it left the board, or the
 * view is gone); the reason is warned with the task and group size, and the caller cancels the menu.
 */
export async function measureGroup(
  no: number,
  ...args: Parameters<typeof measureStack>
): Promise<StackCard[] | null> {
  try {
    return await measureStack(...args);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    console.warn(
      `Move menu of task #${no} closed: measuring its group of ${args[1].length} failed: ${why}`,
    );
    return null;
  }
}
