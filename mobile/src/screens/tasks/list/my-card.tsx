// My tasks card (prototype tasks.list.jsx MyCard): opens the task, whose actions (Start working, Mark done) live in the
// detail.
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskCard } from '@/data/tasks.card';

import { cardName, dueText } from './card-name';
import { CardTitle } from './card-title';

type MyCardProps = { card: TaskCard; onOpen: (no: number) => void };

/**
 * Title, `#no · project · priority`, the status (not To do) with its badges, and the due date: red, bold and "N days
 * late" once past.
 */
export function MyCard({ card: t, onOpen }: MyCardProps) {
  const state = [t.status !== 'To do' && t.status, t.note].filter(Boolean).join(' · ');
  return (
    <Pressable
      testID={`task-card-${t.no}`}
      accessibilityRole="button"
      accessibilityLabel={cardName(t, {
        place: t.project,
        late: t.late,
        note: !!t.note,
      })}
      onPress={() => onOpen(t.no)}
      className="rounded-card border border-border bg-card p-4 data-[active=true]:bg-muted"
    >
      <VStack className="gap-1">
        <CardTitle>{t.title}</CardTitle>
        <Text className="text-footnote text-muted-foreground">
          #{t.no} · {t.project} · {t.priority}
        </Text>
        {!!state && <Text className="text-footnote font-semibold text-foreground">{state}</Text>}
        <Text
          className={`mt-1 text-footnote ${t.late ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
        >
          {dueText(t.due)}
          {t.late && t.lateBy ? ` · ${t.lateBy}` : null}
        </Text>
      </VStack>
    </Pressable>
  );
}
