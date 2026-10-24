// My tasks card (prototype tasks.list.jsx MyCard): opens the task, whose actions (Start working, Request review,
// Review) live in the detail.
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskCard } from '@/data/tasks';

import { S } from '../tasks.strings';
import { CardTitle } from './card-title';

type MyCardProps = { card: TaskCard; onOpen: (no: number) => void };

/** Title, `#no · project · priority`, the note (not on To do) and the due date, red and bold once past. */
export function MyCard({ card: t, onOpen }: MyCardProps) {
  return (
    <Pressable
      testID={`task-card-${t.no}`}
      accessibilityRole="button"
      accessibilityLabel={`#${t.no} ${t.title}`}
      onPress={() => onOpen(t.no)}
      className="rounded-card border border-border bg-card p-4 data-[active=true]:bg-muted"
    >
      <VStack className="gap-1">
        <CardTitle>{t.title}</CardTitle>
        <Text className="text-footnote text-muted-foreground">
          #{t.no} · {t.project} · {t.priority}
        </Text>
        {t.status !== 'To do' && (
          <Text className="text-footnote font-semibold text-foreground">{t.note}</Text>
        )}
        <Text
          className={`mt-1 text-footnote ${t.late ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
        >
          {S.due(t.due)}
        </Text>
      </VStack>
    </Pressable>
  );
}
