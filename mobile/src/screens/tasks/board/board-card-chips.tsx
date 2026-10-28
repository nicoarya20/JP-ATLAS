// Chip row of a Kanban card (prototype tasks.board.jsx BoardCard): the assignee's avatar, the due date (red with
// "N days late" once past, unless Done, so lateness is not told by colour alone), the priority and the steps.
import { Calendar, Flag, ListChecks, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { AvatarStack } from '@/components/avatar/avatar-stack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { TaskCard } from '@/data/tasks.card';

import { S } from '../tasks.strings';

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

/** The chips under a card's title. */
export function BoardCardChips({ card: t }: { card: TaskCard }) {
  return (
    <HStack className="mt-1 flex-wrap items-center gap-1">
      <AvatarStack
        names={t.people.map((p) => p.name)}
        label={t.people.map((p) => p.full).join(', ')}
      />
      <Chip icon={Calendar} danger={t.lateOnBoard}>
        {t.lateOnBoard && t.lateBy ? `${t.due} · ${t.lateBy}` : t.due || S.noDue}
      </Chip>
      <Chip icon={Flag} tint={FLAG[t.priority]}>
        {t.priority}
      </Chip>
      {t.steps && <Chip icon={ListChecks}>{t.steps}</Chip>}
    </HStack>
  );
}
