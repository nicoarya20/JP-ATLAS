// Task card of a project's Tasks tab (prototype projects.tabs.jsx TaskCard): number and title, status, type · priority ·
// who · due, the note and one action. A Manager or Admin gets the action of the task's status; a Member gets View.
import { router } from 'expo-router';

import { useNotice } from '@/components/notice/use-notice';
import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskAction } from '@/data/projects.detail';
import type { TaskCard } from '@/data/tasks';

/** One task; its link and an "open" action open its detail. */
export function ProjectTaskCard({ t, action }: { t: TaskCard; action: TaskAction }) {
  const notice = useNotice();
  const open = () => router.push(`/tasks/${t.no}`);
  const who = t.people[0]?.name ?? '';
  const name = `#${t.no} ${t.title}`;
  // The action sits beside the card's link, not inside it: an accessible Pressable would hide a nested button.
  return (
    <VStack testID={`project-task-${t.no}`} className="gap-2 rounded-card bg-card p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
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
        <Text className="text-subhead">{[t.type, t.priority, who, t.due].join(' · ')}</Text>
      </Pressable>
      <HStack className="items-end justify-between gap-2">
        <VStack className="flex-1">
          <Text className="text-subhead font-semibold">{t.note}</Text>
        </VStack>
        <Button
          size="sm"
          variant="outline"
          accessibilityLabel={`${action.label} ${name}`}
          onPress={action.kind === 'open' ? open : () => notice(action.notice)}
        >
          <ButtonText>{action.label}</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}
