// All tasks card (prototype tasks.list.jsx TasksAll): the title, `#no · project · assignee` (the type, when a card has
// one, in place of the project), the badges, the status and the due date. The card opens the task. The prototype's
// Select tick is hidden: no bulk action reads it, here or on the server (docs/phase2-gap-disembunyikan.md).
import { StatusPill } from '@/components/status/status-pill';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskCard } from '@/data/tasks.card';

import { cardName, dueText } from './card-name';
import { CardTitle } from './card-title';

type AllCardProps = { card: TaskCard; onOpen: (no: number) => void };

/** One task of All tasks. */
export function AllCard({ card: t, onOpen }: AllCardProps) {
  const place = t.type ?? t.project;
  return (
    <Pressable
      testID={`task-card-${t.no}`}
      accessibilityRole="button"
      accessibilityLabel={cardName(t, { place, late: false, note: !!t.note })}
      onPress={() => onOpen(t.no)}
      className="rounded-card border border-border bg-card p-4 data-[active=true]:bg-muted"
    >
      <VStack className="gap-1">
        <CardTitle>{t.title}</CardTitle>
        <Text className="text-footnote text-muted-foreground">
          #{t.no} · {place} · {t.whoLabel}
        </Text>
        {!!t.note && <Text className="text-footnote font-semibold text-foreground">{t.note}</Text>}
        <HStack className="mt-1 items-center justify-between gap-2">
          <StatusPill status={t.status} />
          <Text className="text-footnote text-muted-foreground">{dueText(t.due)}</Text>
        </HStack>
      </VStack>
    </Pressable>
  );
}
