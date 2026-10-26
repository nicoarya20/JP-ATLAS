// The Kanban board (prototype tasks.board.jsx Board): a column per status, scrolled sideways freely with the next
// column peeking; hold a card to move it with the radial menu. Select turns taps into picking cards, and holding a
// picked card moves them all. A Member moves and picks only their own tasks; a Manager or Admin any. Shared with a
// project's Tasks tab (W4), so the caller keeps its own header and re-renders it on store changes.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { useNotice } from '@/components/notice/use-notice';
import { me } from '@/data/people';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import type { TaskCard } from '@/data/tasks';
import {
  type BoardStatus,
  COLUMNS,
  holdGroup,
  selectionHint,
  sharedStatus,
} from '@/data/tasks.columns';
import { deniedNotice } from '@/data/tasks.shared';
import { getTask } from '@/data/tasks.state';
import { moveOnBoard } from '@/data/tasks.store';
import { SPACING } from '@/theme/tokens';

import { S } from '../tasks.strings';
import { BoardColumn } from './board-column';
import { RadialMenu } from './radial-menu';
import { useMoveMenu } from './use-move-menu';

type TaskBoardProps = {
  /** The board's cards (getTasksList view 'board'), in the query's order. */
  tasks: readonly TaskCard[];
  role?: Role;
  /** Cards show their project instead of their type (My tasks). */
  mine: boolean;
};

/** Kanban columns of `tasks` with select mode and the move menu. */
export function TaskBoard({ tasks, role = SESSION_ROLE, mine }: TaskBoardProps) {
  const notice = useNotice();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const chosen = picked.filter((no) => tasks.some((t) => t.no === no));
  const endSelect = () => {
    setSelecting(false);
    setPicked([]);
  };
  const menu = useMoveMenu({ role, cards: tasks, picked: chosen, onGroupMoved: endSelect });

  const hint = selecting ? selectionHint(chosen.length) : '';
  useEffect(() => {
    if (hint) AccessibilityInfo.announceForAccessibility(hint);
  }, [hint]);

  const toggle = (card: TaskCard) => {
    if (card.mayChange) {
      setPicked((old) =>
        old.includes(card.no) ? old.filter((n) => n !== card.no) : [...old, card.no],
      );
      return;
    }
    const task = getTask(card.no);
    if (!task) throw new Error(`Cannot pick task #${card.no}: it is not in the store`);
    notice(deniedNotice(task));
  };
  const pickAll = (nos: number[], all: boolean) =>
    setPicked((old) =>
      all ? old.filter((n) => !nos.includes(n)) : [...new Set([...old, ...nos])],
    );
  const groupOf = (no: number) => holdGroup(no, chosen);
  const moveSet = (no: number) => {
    const nos = groupOf(no);
    return { n: nos.length, from: sharedStatus(tasks.filter((t) => nos.includes(t.no))) };
  };
  /** A named "Move to …": the same group and store call as releasing the move menu (useMoveMenu.pick). */
  const move = (no: number, status: BoardStatus) => {
    const nos = groupOf(no);
    const { notice: text } = moveOnBoard(me(role), nos, status);
    if (text) notice(text);
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
