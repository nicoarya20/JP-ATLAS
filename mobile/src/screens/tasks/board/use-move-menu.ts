// Kanban move menu state (prototype tasks.radial.js useMoveMenu): a card held for HOLD_MS opens a ring of the four
// statuses at the finger; sliding toward one and letting go moves the task, sliding out and back cancels, letting go
// without sliding leaves the menu open (sticky) for a tap. Holding one card of a picked group moves the whole group,
// whose cards fly from their places to the finger (MoveStack). Each card's gesture (use-move-gesture) tracks the
// finger on the UI thread (`values`: the aim, to call aimTo only on a change, and the ring's angle) and calls open /
// aimTo / finish here on JS, where the aim and "slid out" are kept: release decisions never read UI-thread state.
import { useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { useNotice } from '@/components/notice/use-notice';
import { me } from '@/data/people';
import type { Role } from '@/data/sample';
import type { TaskCard } from '@/data/tasks';
import { type BoardStatus, holdGroup, sharedStatus } from '@/data/tasks.columns';
import { clampCenter } from '@/data/tasks.radial';
import { deniedNotice } from '@/data/tasks.shared';
import { getTask } from '@/data/tasks.state';
import { moveOnBoard } from '@/data/tasks.store';

import { type MoveMenuState, measureStack } from './move-menu.state';
import { useCardViews, useClosingMenu, useTapGuard } from './use-move-menu.parts';

type MoveMenuOptions = {
  role: Role;
  /** Cards on the board, and the picked ones still on it. */
  cards: readonly TaskCard[];
  picked: readonly number[];
  /** A group was moved: selecting ends. */
  onGroupMoved: () => void;
};

const taskOf = (no: number) => {
  const t = getTask(no);
  if (!t) throw new Error(`Cannot open the move menu: task #${no} is not on the board`);
  return t;
};

/** The move menu of one board. */
export function useMoveMenu({ role, cards, picked, onGroupMoved }: MoveMenuOptions) {
  const notice = useNotice();
  const reduced = useReducedMotion();
  const screen = useWindowDimensions();
  const [menu, setMenu] = useState<MoveMenuState | null>(null);
  const [closing, setClosing] = useClosingMenu();
  const [aim, setAim] = useState<BoardStatus | null>(null);
  const live = useRef<MoveMenuState | null>(null);
  const { views, register } = useCardViews();
  const tap = useTapGuard();
  // The status aimed at now, and whether the finger aimed at any during this hold.
  const aimed = useRef<BoardStatus | null>(null);
  const slid = useRef(false);
  const values = {
    aim: useSharedValue<BoardStatus | null>(null),
    angle: useSharedValue(0),
  };
  const show = (m: MoveMenuState | null) => {
    live.current = m;
    setMenu(m);
  };

  const close = (moved: BoardStatus | null = null) => {
    const m = live.current;
    if (!m) return;
    show(null);
    setAim(null);
    if (!reduced) setClosing({ menu: m, picked: moved });
  };

  const open = (no: number, x: number, y: number) => {
    const task = taskOf(no);
    tap.hold(); // letting go after the hold is not a tap that opens the task
    if (live.current) return;
    if (!cards.find((c) => c.no === no)?.mayChange) {
      notice(deniedNotice(task));
      return;
    }
    aimed.current = null;
    slid.current = false;
    setAim(null);
    const nos = holdGroup(no, picked);
    const tasks = nos.map(taskOf);
    const group = nos.length > 1;
    const center = clampCenter(x, y, screen.width, screen.height, group);
    const title = `#${no} ${task.title}`;
    show({
      no,
      nos,
      title,
      from: sharedStatus(tasks),
      ...center,
      sticky: false,
      group,
      stack: null,
    });
    if (!group) return;
    measureStack(views.current, tasks, screen, center).then((stack) => {
      if (live.current?.no === no) show({ ...live.current, stack });
    });
  };

  /** Move the menu's tasks to `status` and close; the status they share only closes. */
  const pick = (status: BoardStatus) => {
    const m = live.current;
    if (!m) return;
    close(status === m.from ? null : status);
    if (status === m.from) return;
    const { notice: text } = moveOnBoard(me(role), m.nos, status);
    if (text) notice(text);
    if (m.group) onGroupMoved();
  };

  /** The slide now points at `status` (null: back in the centre). */
  const aimTo = (status: BoardStatus | null) => {
    if (!live.current || live.current.sticky) return;
    aimed.current = status;
    if (status) slid.current = true;
    setAim(status);
  };

  /** The hold ended: aimed = move, slid out and back = cancel, never slid = stay open; a system cancel closes. */
  const finish = (canceled: boolean) => {
    const m = live.current;
    if (!m || m.sticky) return;
    if (canceled) close();
    else if (aimed.current) pick(aimed.current);
    else if (slid.current) close();
    else show({ ...m, sticky: true });
  };

  return {
    menu,
    closing,
    aim,
    values,
    reduced,
    open,
    aimTo,
    finish,
    pick,
    close: () => close(),
    /** Cards carried by the open group menu leave their places empty. */
    lifted: menu?.group ? menu.nos : [],
    register,
    takeTap: tap.takeTap,
    resetTap: tap.resetTap,
  };
}

export type MoveMenu = ReturnType<typeof useMoveMenu>;
