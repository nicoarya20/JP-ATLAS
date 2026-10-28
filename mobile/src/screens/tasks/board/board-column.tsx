// One Kanban column (prototype tasks.board.jsx Board, a .tk-col): the status badge with its count and the Select
// control, the cards, what the board puts under them (Load more), then Add task. Columns are 272 px wide and hug their
// cards.
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { TaskCard } from '@/data/tasks.card';
import type { BoardStatus, BoardColumn as Column } from '@/data/tasks.columns';

import { S } from '../tasks.strings';
import { SPOKEN } from '../tasks.strings.added';
import { STATUS_ICON, TONE_SOFT } from './board.tones';
import { BoardCard, type MoveSet } from './board-card';
import { SelectControl } from './select-control';
import type { ColumnExtra } from './task-board';
import type { MoveMenu } from './use-move-menu';

/** Prototype .tk-col flex-basis. */
export const COLUMN_PX = 272;

type BoardColumnProps = {
  column: Column;
  cards: readonly TaskCard[];
  extra?: ColumnExtra;
  canAdd: boolean;
  /** Cards whose move is still out: drawn faded and busy. */
  moving: readonly number[];
  mine: boolean;
  menu: MoveMenu;
  selecting: boolean;
  picked: readonly number[];
  onSelect: () => void;
  onToggle: (card: TaskCard) => void;
  /** Pick (or drop, when all are picked) the cards that may move. */
  onAll: (nos: number[], all: boolean) => void;
  onOpen: (no: number) => void;
  /** What a named move of card `no` carries. */
  moveSet: (no: number) => MoveSet;
  onMove: (no: number, status: BoardStatus) => void;
  onAdd: () => void;
};

/** A status column of the board. */
export function BoardColumn(p: BoardColumnProps) {
  const { column, cards, menu } = p;
  const tone = TONE_SOFT[column.tone];
  const mayPick = cards.filter((c) => c.moves.length).map((c) => c.no);
  const count = p.extra?.count ?? String(cards.length);
  const all = mayPick.length > 0 && mayPick.every((no) => p.picked.includes(no));
  return (
    <View
      testID={`column-${column.status}`}
      className="gap-2 rounded-card bg-muted p-2"
      style={{ width: COLUMN_PX }}
    >
      <HStack className="items-center justify-between gap-2">
        <HStack
          accessible
          accessibilityRole="header"
          accessibilityLabel={S.board.column(column.status, count)}
          className="items-center gap-2 p-1"
        >
          <HStack className={`items-center gap-1 rounded-control px-2 py-0.5 ${tone.bg}`}>
            <Icon as={STATUS_ICON[column.status]} size="xs" className={tone.text} />
            <Text className={`text-footnote font-semibold uppercase ${tone.text}`}>
              {column.status}
            </Text>
          </HStack>
          <Text className="text-footnote text-muted-foreground">{count}</Text>
        </HStack>
        <SelectControl
          on={p.selecting}
          status={column.status}
          all={all}
          canAll={mayPick.length > 0}
          onToggle={p.onSelect}
          onAll={() => p.onAll(mayPick, all)}
        />
      </HStack>
      {cards.map((c) => (
        <BoardCard
          key={c.no}
          card={c}
          mine={p.mine}
          menu={menu}
          lifted={menu.lifted.includes(c.no)}
          busy={p.moving.includes(c.no)}
          moveSet={p.moveSet(c.no)}
          select={
            p.selecting ? { on: p.picked.includes(c.no), toggle: () => p.onToggle(c) } : undefined
          }
          onOpen={p.onOpen}
          onMove={p.onMove}
        />
      ))}
      {p.extra?.footer}
      {p.canAdd && (
        <View className="items-start">
          <Button
            testID={`add-task-${column.status}`}
            variant="link"
            size="sm"
            accessibilityLabel={SPOKEN.addTo(column.status)}
            onPress={p.onAdd}
          >
            <ButtonIcon as={Plus} />
            <ButtonText>{S.board.addTask}</ButtonText>
          </Button>
        </View>
      )}
    </View>
  );
}
