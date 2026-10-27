// Kanban card (prototype tasks.board.jsx BoardCard): title, #number with the project (mine) or the type, then the chip
// row. A tap opens the task, or in select mode picks it; holding it opens the move menu. A card carried by a group move
// leaves its place empty. A screen reader hears the card as one button naming all of that, and moves it with named
// actions that, like holding it, carry the whole picked group it belongs to.
import { Circle, CircleCheck } from 'lucide-react-native';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskStatus } from '@/data/sample';
import type { TaskCard } from '@/data/tasks';
import { type BoardStatus, COLUMNS } from '@/data/tasks.columns';

import { cardName } from '../list/card-name';
import { SPOKEN } from '../tasks.strings.added';
import { BoardCardChips } from './board-card-chips';
import { useMoveGesture } from './use-move-gesture';
import type { MoveMenu } from './use-move-menu';

/** The cards a move of one card carries (holdGroup) and the status they share, null when mixed. */
export type MoveSet = { n: number; from: TaskStatus | null };

type BoardCardProps = {
  card: TaskCard;
  mine: boolean;
  menu: MoveMenu;
  /** Select mode: whether it is picked, and the tap that toggles it. */
  select?: { on: boolean; toggle: () => void };
  lifted: boolean;
  /** What "Move to …" carries from this card. */
  moveSet: MoveSet;
  onOpen: (no: number) => void;
  /** Screen reader "Move to …" / "Move N tasks to …". */
  onMove: (no: number, status: BoardStatus) => void;
};

/** One card of a column. */
export function BoardCard(p: BoardCardProps) {
  const { card: t, menu, select, moveSet } = p;
  const gesture = useMoveGesture(t.no, menu);
  const moves = t.mayChange ? COLUMNS.filter((c) => c.status !== moveSet.from) : [];
  const press = () => {
    if (menu.takeTap()) return;
    if (select) select.toggle();
    else p.onOpen(t.no);
  };
  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={(el) => menu.register(t.no, el)}
        collapsable={false}
        style={{ opacity: p.lifted ? 0 : 1 }}
      >
        <Pressable
          testID={`board-card-${t.no}`}
          accessibilityRole="button"
          accessibilityLabel={cardName(t, {
            place: p.mine ? t.project : t.type,
            late: t.lateOnBoard,
            note: false,
          })}
          accessibilityState={select ? { selected: select.on } : undefined}
          accessibilityActions={moves.map((c) => ({
            name: c.status,
            label: SPOKEN.moveTo(moveSet.n, c.status),
          }))}
          onAccessibilityAction={(e) => {
            const to = moves.find((c) => c.status === e.nativeEvent.actionName);
            if (to) p.onMove(t.no, to.status);
          }}
          onPressIn={menu.resetTap}
          onPress={press}
          className={`rounded-card bg-card p-3 ${select?.on ? 'border-2 border-atlas' : 'border border-border'}`}
        >
          {select && (
            <View className="absolute right-2 top-2">
              <Icon
                as={select.on ? CircleCheck : Circle}
                size="lg"
                className={select.on ? 'text-atlas' : 'text-muted-foreground'}
              />
            </View>
          )}
          <VStack className="gap-1">
            <Text className={`text-subhead font-semibold text-foreground ${select ? 'pr-6' : ''}`}>
              {t.title}
            </Text>
            <Text className="text-footnote text-muted-foreground">
              #{t.no} · {p.mine ? t.project : t.type}
            </Text>
            <BoardCardChips card={t} />
          </VStack>
        </Pressable>
      </View>
    </GestureDetector>
  );
}
