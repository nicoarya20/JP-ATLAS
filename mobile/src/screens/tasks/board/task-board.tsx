// The Kanban board (prototype tasks.board.jsx Board): a column per status, scrolled sideways freely with the next
// column peeking; hold a card to move it with the radial menu. Select turns taps into picking cards, and holding a
// picked card moves them all.
//
// Who may move what is no longer this screen's guess. The Tasks tab hands over rows from /api/app/tasks together with
// `serverMoves`, where a side of the move menu is that card's own `can{}` and a move is one request per task; a
// project's Tasks tab still hands over sample rows and gets `sampleMoves` by default, until its own module moves to
// the API. Both are the same component with the same cards (board-cards.ts).
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { useNotice } from '@/components/notice/use-notice';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import {
  type BoardStatus,
  COLUMNS,
  holdGroup,
  selectionHint,
  sharedStatus,
} from '@/data/tasks.columns';
import { SPACING } from '@/theme/tokens';

import { S } from '../tasks.strings';
import type { BoardCardData, BoardMoves } from './board-cards';
import { BoardColumn } from './board-column';
import { sampleMoves } from './board-moves.sample';
import { RadialMenu } from './radial-menu';
import { useMoveMenu } from './use-move-menu';

type TaskBoardProps = {
  /** The board's cards, in the query's order. */
  tasks: readonly BoardCardData[];
  role?: Role;
  /** Cards show their project instead of their type (My tasks). */
  mine: boolean;
  /** How this board moves its cards; the sample store's way by default. */
  moves?: BoardMoves;
};

/** Kanban columns of `tasks` with select mode and the move menu. */
export function TaskBoard({ tasks, role = SESSION_ROLE, mine, moves }: TaskBoardProps) {
  const notice = useNotice();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const how = moves ?? sampleMoves(role);
  const chosen = picked.filter((no) => tasks.some((t) => t.no === no));
  const endSelect = () => {
    setSelecting(false);
    setPicked([]);
  };
  const menu = useMoveMenu({ cards: tasks, picked: chosen, moves: how, onGroupMoved: endSelect });

  const hint = selecting ? selectionHint(chosen.length) : '';
  useEffect(() => {
    if (hint) AccessibilityInfo.announceForAccessibility(hint);
  }, [hint]);

  const toggle = (card: BoardCardData) => {
    if (how.sidesFor(card).length) {
      setPicked((old) =>
        old.includes(card.no) ? old.filter((n) => n !== card.no) : [...old, card.no],
      );
      return;
    }
    notice(how.denied(card));
  };
  const pickAll = (nos: number[], all: boolean) =>
    setPicked((old) =>
      all ? old.filter((n) => !nos.includes(n)) : [...new Set([...old, ...nos])],
    );
  const groupOf = (no: number) => holdGroup(no, chosen);
  const cardsOf = (nos: readonly number[]) => tasks.filter((t) => nos.includes(t.no));
  const moveSet = (no: number) => {
    const nos = groupOf(no);
    return { n: nos.length, from: sharedStatus(cardsOf(nos)) };
  };
  /** A named "Move to …": the same group and the same write as releasing the move menu (useMoveMenu.pick). */
  const move = (no: number, status: BoardStatus) => {
    const nos = groupOf(no);
    void (async () => {
      const said = await how.move(cardsOf(nos), nos, status);
      if (said) notice(said);
    })();
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
