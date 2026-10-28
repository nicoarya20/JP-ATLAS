// All tasks card (prototype tasks.list.jsx TasksAll): a Select tick (bulk actions are not in the prototype either),
// then the title, `#no · project · assignee` (the type, when a card has one, in place of the project), the badges,
// the status and the due date. The card opens the task.
import { Check } from 'lucide-react-native';
import { useState } from 'react';

import { StatusPill } from '@/components/status/status-pill';
import { Checkbox, CheckboxIcon, CheckboxIndicator } from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskCard } from '@/data/tasks.card';

import { SPOKEN } from '../tasks.strings.added';
import { cardName, dueText } from './card-name';
import { CardTitle } from './card-title';

type AllCardProps = { card: TaskCard; onOpen: (no: number) => void };

/** One task of All tasks. */
export function AllCard({ card: t, onOpen }: AllCardProps) {
  const [picked, setPicked] = useState(false);
  const place = t.type ?? t.project;
  return (
    <HStack className="items-start gap-3 rounded-card border border-border bg-card p-4">
      <Checkbox
        value={String(t.no)}
        // aria-label: gluestack names the checkbox itself and overrides accessibilityLabel
        aria-label={SPOKEN.selectTask(t.no, t.title)}
        isChecked={picked}
        onChange={setPicked}
        className="min-h-11 min-w-11 items-start"
      >
        <CheckboxIndicator>
          <CheckboxIcon as={Check} />
        </CheckboxIndicator>
      </Checkbox>
      <Pressable
        testID={`task-card-${t.no}`}
        accessibilityRole="button"
        accessibilityLabel={cardName(t, { place, late: false, note: !!t.note })}
        onPress={() => onOpen(t.no)}
        className="min-w-0 flex-1"
      >
        <VStack className="gap-1">
          <CardTitle>{t.title}</CardTitle>
          <Text className="text-footnote text-muted-foreground">
            #{t.no} · {place} · {t.whoLabel}
          </Text>
          {!!t.note && (
            <Text className="text-footnote font-semibold text-foreground">{t.note}</Text>
          )}
          <HStack className="mt-1 items-center justify-between gap-2">
            <StatusPill status={t.status} />
            <Text className="text-footnote text-muted-foreground">{dueText(t.due)}</Text>
          </HStack>
        </VStack>
      </Pressable>
    </HStack>
  );
}
