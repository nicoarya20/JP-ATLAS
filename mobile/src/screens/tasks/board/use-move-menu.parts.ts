// Small state pieces of the move menu (use-move-menu): the closing menu kept on screen while it animates out, the
// card views a group move measures, and the guard that keeps the lift after a hold from opening the task.
import { useEffect, useRef, useState } from 'react';
import type { HostInstance } from 'react-native';

import type { BoardStatus } from '@/data/tasks.columns';
import { MOTION } from '@/data/tasks.radial';

import type { MoveMenuState } from './move-menu.state';

export type ClosingMenu = { menu: MoveMenuState; picked: BoardStatus | null };

/** The menu as it closes, with the status it moved its tasks to; gone after MOTION.closeMs. */
export function useClosingMenu() {
  const [closing, setClosing] = useState<ClosingMenu | null>(null);
  useEffect(() => {
    if (!closing) return undefined;
    const timer = setTimeout(() => setClosing(null), MOTION.closeMs);
    return () => clearTimeout(timer);
  }, [closing]);
  return [closing, setClosing] as const;
}

/** Each card's view by task number, for measuring where the cards of a group sit. */
export function useCardViews() {
  const views = useRef(new Map<number, HostInstance>());
  const register = (no: number, el: HostInstance | null) => {
    if (el) views.current.set(no, el);
    else views.current.delete(no);
  };
  return { views, register };
}

/** Set when a hold opens the menu; the press that ends that touch takes it and does not open the task. */
export function useTapGuard() {
  const taken = useRef(false);
  return {
    hold: () => {
      taken.current = true;
    },
    /** True once for the press that ends a hold. */
    takeTap: () => {
      const was = taken.current;
      taken.current = false;
      return was;
    },
    /** A new touch on a card. */
    resetTap: () => {
      taken.current = false;
    },
  };
}
