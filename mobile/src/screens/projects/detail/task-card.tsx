// Task card of a project's Tasks tab (prototype projects.tabs.jsx TaskCard): number and title, status,
// type · priority · who · due, and the note the server wrote for this viewer.
//
// The prototype's one action button ("Start working", "Request review", "Review", or "View" for a Member) is gone.
// The row carries both halves of it — `can` and `primary` — but the writes behind them belong to the Tasks module and
// are not wired to this screen, so the whole card opens the task instead of offering work it would not do. Listed in
// docs/phase2-gap-disembunyikan.md.
import { router } from 'expo-router';

import { StatusPill } from '@/components/status/status-pill';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskCard } from '@/data/tasks.api.map';

/** One task; the card opens its detail. */
export function ProjectTaskCard({ t }: { t: TaskCard }) {
  const open = () => router.push(`/tasks/${t.no}`);
  const name = `#${t.no} ${t.title}`;
  // A list row carries no kind (GAP A-3), so the line leaves it out rather than showing a gap.
  const line = [t.type, t.priority, t.whoLabel, t.due].filter(Boolean).join(' · ');
  // "#12 Login flow, In progress, Bug, High, Lea, Oct 5": the link reads what it shows, without the note.
  const spoken = [name, t.status, t.type, t.priority, t.whoLabel, t.due].filter(Boolean).join(', ');
  return (
    <VStack testID={`project-task-${t.no}`} className="gap-2 rounded-card bg-card p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        onPress={open}
        className="gap-2 rounded-control data-[active=true]:bg-muted"
      >
        <HStack className="items-baseline gap-2">
          <Text className="text-subhead text-muted-foreground">#{t.no}</Text>
          <Text className="flex-1 text-headline font-semibold">{t.title}</Text>
        </HStack>
        <HStack>
          <StatusPill status={t.status} />
        </HStack>
        <Text className="text-subhead">{line}</Text>
      </Pressable>
      {/* The server's own note for this viewer ("2 days overdue", "Waiting for my review"). */}
      {!!t.note && <Text className="text-subhead font-semibold">{t.note}</Text>}
    </VStack>
  );
}
