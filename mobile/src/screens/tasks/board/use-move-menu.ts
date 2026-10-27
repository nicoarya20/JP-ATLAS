// Kanban move menu state (prototype tasks.radial.js useMoveMenu): a card held for HOLD_MS opens a ring of the four
// statuses at the finger; sliding toward one and letting go moves the task, sliding out and back cancels, letting go
// without sliding leaves the menu open (sticky) for a tap. Holding one card of a picked group moves the whole group,
// whose cards fly from their places to the finger (MoveStack). Each card's gesture (use-move-gesture) tracks the
// finger on the UI thread (`values`: the aim, to call aimTo only on a change, and the ring's angle) and calls open /
// aimTo / finish here on JS, where the aim and "slid out" are kept: release decisions never read UI-thread state.
//
// Which sides are open, and what a release writes, are the caller's (`BoardMoves`): against the server a side is
// `can{}`'s answer for that card and a move is one request per task, against the sample store it is the store's own
// rule and one call. Either way a side that is shut is decided before the ring is drawn, never by a refusal after it.
import { useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { useNotice } from '@/components/notice/use-notice';
import { type BoardStatus, holdGroup, sharedStatus } from '@/data/tasks.columns';
import { clampCenter } from '@/data/tasks.radial';

import type { BoardCardData, BoardMoves } from './board-cards';
import { type MoveMenuState, measureGroup } from './move-menu.state';
import { useCardViews, useClosingMenu, useTapGuard } from './use-move-menu.parts';

type MoveMenuOptions = {
  /** Cards on the board, and the picked ones still on it. */
  cards: readonly BoardCardData[];
  picked: readonly number[];
  /** How this board moves its cards. */
  moves: BoardMoves;
  /** A group was moved: selecting ends. */
  onGroupMoved: () => void;
};

/** The move menu of one board. */
export function useMoveMenu({ cards, picked, moves, onGroupMoved }: MoveMenuOptions) {
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

  /** The card #no on the board; the menu and its moves only ever name cards that are on it. */
  const cardOrThrow = (no: number) => {
    const card = cards.find((c) => c.no === no);
    if (!card) throw new Error(`Cannot open the move menu: task #${no} is not on the board`);
    return card;
  };

  const close = (moved: BoardStatus | null = null) => {
    const m = live.current;
    if (!m) return;
    show(null);
    setAim(null);
    if (!reduced) setClosing({ menu: m, picked: moved });
  };

  const open = (no: number, x: number, y: number) => {
    const card = cardOrThrow(no);
    tap.hold(); // letting go after the hold is not a tap that opens the task
    if (live.current) return;
    const nos = holdGroup(no, picked);
    const held = nos.map(cardOrThrow);
    const allowed = moves.sidesForAll(held);
    // Nowhere to move it to is not a menu: say why instead of opening a ring of dead options.
    if (!allowed.length) {
      notice(moves.denied(card));
      return;
    }
    aimed.current = null;
    slid.current = false;
    setAim(null);
    const group = nos.length > 1;
    const center = clampCenter(x, y, screen.width, screen.height, group);
    show({
      no,
      nos,
      title: `#${no} ${card.title}`,
      from: sharedStatus(held),
      allowed,
      ...center,
      sticky: false,
      group,
      stack: null,
    });
    if (!group) return;
    measureGroup(no, views.current, held, screen, center).then((stack) => {
      if (live.current?.no !== no) return;
      // Without the cards' places the group cannot fly in: cancel the move (nothing moves, the picks stay).
      if (stack) show({ ...live.current, stack });
      else close();
    });
  };

  /** Move the menu's tasks to `status` and close; a status they share, or a shut side, only closes. */
  const pick = (status: BoardStatus) => {
    const m = live.current;
    if (!m) return;
    const taking = status !== m.from && m.allowed.includes(status);
    close(taking ? status : null);
    if (!taking) return;
    const held = m.nos.map(cardOrThrow);
    void (async () => {
      const said = await moves.move(held, m.nos, status);
      if (said) notice(said);
    })();
    if (m.group) onGroupMoved();
  };

  /** The slide now points at `status` (null: back in the centre). A shut side is not an aim. */
  const aimTo = (status: BoardStatus | null) => {
    const m = live.current;
    if (!m || m.sticky) return;
    const at = status && m.allowed.includes(status) ? status : null;
    aimed.current = at;
    if (status) slid.current = true;
    setAim(at);
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
    /** The columns one card may be moved to, for the screen-reader actions on it. */
    sidesFor: moves.sidesFor,
  };
}

export type MoveMenu = ReturnType<typeof useMoveMenu>;
