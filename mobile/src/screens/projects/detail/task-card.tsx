// Task card of a project's Tasks tab (prototype projects.tabs.jsx TaskCard), from a `GET /api/app/tasks` row: number
// and title, status, priority · who · due, the badges, and one button. The button takes the step the server highlights
// (`primary`, when `can{}` allows it: Start working, Mark done, Restore); any other card offers View, which opens it.
import { router } from 'expo-router';

import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskCard } from '@/data/tasks.card';
import { STEP_LABEL } from '@/data/tasks.detail';
import { runTaskStep } from '@/data/tasks.detail.write';
import { useDetailRun } from '@/screens/tasks';

import { NAMES } from '../projects.strings.added';

/** One task; the card opens its detail, its button takes the card's step. */
export function ProjectTaskCard({ t }: { t: TaskCard }) {
  const { busy, run } = useDetailRun();
  const open = () => router.push(`/tasks/${t.no}`);
  const name = `#${t.no} ${t.title}`;
  const line = [t.priority, t.whoLabel, t.due].filter(Boolean);
  // "#12 Login flow, In progress, High, Lea, Oct 5": the link reads what it shows, without the badges.
  const spoken = [name, t.status, ...line].join(', ');
  const step = t.step;
  const label = step ? STEP_LABEL[step] : NAMES.view;
  const press = step ? () => void run(step, () => runTaskStep(t.id, step)) : open;
  // The button sits beside the card's link, not inside it: an accessible Pressable would hide a nested button.
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
        <Text className={`text-subhead ${t.late ? 'font-semibold text-destructive' : ''}`}>
          {[...line, t.lateBy].filter(Boolean).join(' · ')}
        </Text>
      </Pressable>
      <HStack className="items-end justify-between gap-2">
        <VStack className="flex-1">
          {!!t.note && <Text className="text-subhead font-semibold">{t.note}</Text>}
        </VStack>
        <Button
          size="sm"
          variant="outline"
          isDisabled={!!busy}
          accessibilityLabel={`${label} ${name}`}
          accessibilityState={{ busy: !!busy, disabled: !!busy }}
          onPress={press}
          testID={`project-task-${t.no}-action`}
        >
          {busy && <ButtonSpinner />}
          <ButtonText>{label}</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}
