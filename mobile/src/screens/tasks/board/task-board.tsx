// The Kanban board (prototype tasks.board.jsx Board): a column per status, scrolled sideways freely with the next
// column peeking; hold a card to move it with the radial menu. Select turns taps into picking cards, and holding a
// picked card moves them all. Each card says where it may go (`moves`: the server's `can{}`, or the sample's role rule).
// Shared with a project's Tasks tab (W4), which passes no `onMove` and so still moves the sample tasks; the Tasks tab
// moves on the server and passes each column's count and Load more.
import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { useNotice } from '@/components/notice/use-notice';
import { me } from '@/data/people';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { CARD_TEXT, type TaskCard } from '@/data/tasks.card';
import {
  type BoardStatus,
  COLUMNS,
  holdGroup,
  selectionHint,
  sharedStatus,
} from '@/data/tasks.columns';
import { moveOnBoard } from '@/data/tasks.store';
import { SPACING } from '@/theme/tokens';

import { S } from '../tasks.strings';
import { BoardColumn } from './board-column';
import { RadialMenu } from './radial-menu';
import { allowedOf, cardsOf, useMoveMenu } from './use-move-menu';

/** Moves cards to a status; answers the notice to show (or null), now or once the server answered. */
export type BoardMove = (
  cards: readonly TaskCard[],
  to: BoardStatus,
) => Promise<string | null> | string | null;

/** What a column shows beyond its cards: the count to put by its name, and what goes under its cards. */
export type ColumnExtra = { count?: string; footer?: ReactNode };

type TaskBoardProps = {
  /** The board's cards, in the query's order. */
  tasks: readonly TaskCard[];
  role?: Role;
  /** Cards show their project instead of their type (My tasks). */
  mine: boolean;
  /** Default: the sample store (a project's Tasks tab). */
  onMove?: BoardMove;
  columns?: Partial<Record<BoardStatus, ColumnExtra>>;
  /** Add task under each column; default shown. */
  canAdd?: boolean;
};

/** Kanban columns of `tasks` with select mode and the move menu. */
export function TaskBoard({
  tasks,
  role = SESSION_ROLE,
  mine,
  onMove,
  columns = {},
  canAdd = true,
}: TaskBoardProps) {
  const notice = useNotice();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [moving, setMoving] = useState<number[]>([]);
  const chosen = picked.filter((no) => tasks.some((t) => t.no === no));
  const endSelect = () => {
    setSelecting(false);
    setPicked([]);
  };
  const runMove = (cards: readonly TaskCard[], to: BoardStatus) => {
    const nos = cards.map((c) => c.no);
    const move: BoardMove =
      onMove ??
      ((cs, status) =>
        moveOnBoard(
          me(role),
          cs.map((c) => c.no),
          status,
        ).notice);
    setMoving((old) => [...old, ...nos]);
    Promise.resolve()
      .then(() => move(cards, to))
      .then(
        (text) => {
          if (text) notice(text);
        },
        (e: unknown) => {
          const why = e instanceof Error ? e.message : String(e);
          console.warn(`Moving ${nos.length} task(s) to ${to} failed: ${why}`);
          notice(S.board.moveFailed);
        },
      )
      .finally(() => setMoving((old) => old.filter((n) => !nos.includes(n))));
  };
  const menu = useMoveMenu({
    cards: tasks,
    picked: chosen,
    onMove: runMove,
    onGroupMoved: endSelect,
  });

  const hint = selecting ? selectionHint(chosen.length) : '';
  useEffect(() => {
    if (hint) AccessibilityInfo.announceForAccessibility(hint);
  }, [hint]);

  const toggle = (card: TaskCard) => {
    if (card.moves.length) {
      setPicked((old) =>
        old.includes(card.no) ? old.filter((n) => n !== card.no) : [...old, card.no],
      );
      return;
    }
    notice(card.denied ?? CARD_TEXT.noMove);
  };
  const pickAll = (nos: number[], all: boolean) =>
    setPicked((old) =>
      all ? old.filter((n) => !nos.includes(n)) : [...new Set([...old, ...nos])],
    );
  const groupOf = (no: number) => holdGroup(no, chosen);
  const moveSet = (no: number) => {
    const cards = cardsOf(tasks, groupOf(no));
    return { n: cards.length, from: sharedStatus(cards), allowed: allowedOf(cards) };
  };
  /** A named "Move to …": the same group and move as releasing the move menu (useMoveMenu.pick). */
  const move = (no: number, status: BoardStatus) => {
    const nos = groupOf(no);
    runMove(cardsOf(tasks, nos), status);
    if (nos.length > 1) endSelect();
  };
  return (
    <>
      <ScrollView
        testID="task-board"
        horizontal
        accessibilityLabel={S.board.label}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SPACING.md }}
        contentContainerStyle={{
          gap: SPACING.sm,
          paddingHorizontal: SPACING.md,
          alignItems: 'flex-start',
        }}
      >
        {COLUMNS.map((c) => (
          <BoardColumn
            key={c.status}
            column={c}
            cards={tasks.filter((t) => t.status === c.status)}
            extra={columns[c.status]}
            canAdd={canAdd}
            moving={moving}
            mine={mine}
            menu={menu}
            selecting={selecting}
            picked={chosen}
            onSelect={selecting ? endSelect : () => setSelecting(true)}
            onToggle={toggle}
            onAll={pickAll}
            onOpen={(no) => router.push(`/tasks/${no}`)}
            moveSet={moveSet}
            onMove={move}
            onAdd={() => router.push('/tasks/new/form')}
          />
        ))}
      </ScrollView>
      <RadialMenu menu={menu} />
    </>
  );
}
