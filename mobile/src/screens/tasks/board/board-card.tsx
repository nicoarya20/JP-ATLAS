// Kanban card (prototype tasks.board.jsx BoardCard): title, #number with the project (mine) or the type, then chips for
// the assignees, the due date (red once past, unless Done), the priority and the steps. A tap opens the task, or in
// select mode picks it; holding it opens the move menu. A card carried by a group move leaves its place empty.
import {
  Calendar,
  Circle,
  CircleCheck,
  Flag,
  ListChecks,
  type LucideIcon,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { AvatarStack } from '@/components/avatar/avatar-stack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskCard } from '@/data/tasks';
import { type BoardStatus, COLUMNS } from '@/data/tasks.columns';

import { S } from '../tasks.strings';
import { useMoveGesture } from './use-move-gesture';
import type { MoveMenu } from './use-move-menu';

const FLAG: Record<string, string> = {
  High: 'text-destructive',
  Medium: 'text-warning',
  Low: 'text-muted-foreground',
};

function Chip({
  icon,
  tint,
  danger,
  children,
}: {
  icon: LucideIcon;
  tint?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <HStack className="min-h-6 items-center gap-1 rounded-control border border-border px-2">
      <Icon
        as={icon}
        size="xs"
        className={tint ?? (danger ? 'text-destructive' : 'text-muted-foreground')}
      />
      <Text className={`text-footnote ${danger ? 'text-destructive' : 'text-muted-foreground'}`}>
        {children}
      </Text>
    </HStack>
  );
}

type BoardCardProps = {
  card: TaskCard;
  mine: boolean;
  menu: MoveMenu;
  /** Select mode: whether it is picked, and the tap that toggles it. */
  select?: { on: boolean; toggle: () => void };
  lifted: boolean;
  onOpen: (no: number) => void;
  /** Screen reader "Move to …". */
  onMove: (no: number, status: BoardStatus) => void;
};

/** One card of a column. */
export function BoardCard({ card: t, mine, menu, select, lifted, onOpen, onMove }: BoardCardProps) {
  const gesture = useMoveGesture(t.no, menu);
  const moves = t.mayChange ? COLUMNS.filter((c) => c.status !== t.status) : [];
  const press = () => {
    if (menu.takeTap()) return;
    if (select) select.toggle();
    else onOpen(t.no);
  };
  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={(el) => menu.register(t.no, el)}
        collapsable={false}
        style={{ opacity: lifted ? 0 : 1 }}
      >
        <Pressable
          testID={`board-card-${t.no}`}
          accessibilityRole="button"
          accessibilityLabel={`#${t.no} ${t.title}`}
          accessibilityState={select ? { selected: select.on } : undefined}
          accessibilityActions={moves.map((c) => ({
            name: c.status,
            label: S.board.moveTo(c.status),
          }))}
          onAccessibilityAction={(e) => {
            const to = moves.find((c) => c.status === e.nativeEvent.actionName);
            if (to) onMove(t.no, to.status);
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
              #{t.no} · {mine ? t.project : t.type}
            </Text>
            <HStack className="mt-1 flex-wrap items-center gap-1">
              <AvatarStack
                names={t.people.map((p) => p.name)}
                label={t.people.map((p) => p.full).join(', ')}
              />
              <Chip icon={Calendar} danger={t.lateOnBoard}>
                {t.due}
              </Chip>
              <Chip icon={Flag} tint={FLAG[t.priority]}>
                {t.priority}
              </Chip>
              {t.steps && <Chip icon={ListChecks}>{t.steps}</Chip>}
            </HStack>
          </VStack>
        </Pressable>
      </View>
    </GestureDetector>
  );
}
