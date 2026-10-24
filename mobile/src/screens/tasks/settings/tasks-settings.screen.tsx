// Tasks ⑬ Project settings (Project detail ⋯ › Project settings, prototype tasks.settings.jsx). Managers and Admins see
// the review switch, task types and tags; a Member sees "Not available". The route is W4's (projects/[id]/settings).
import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import { useNotice } from '@/components/notice/use-notice';
import { EmptyState } from '@/components/state/empty-state';
import { HStack } from '@/components/ui/hstack';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getTaskSettings } from '@/data/tasks';
import { useTasks } from '@/data/tasks.state';
import { TaskPage } from '../parts/task-page';
import { Act, Sec, Soft } from '../parts/task-parts';
import { P } from '../tasks.strings.more';
import { TagRow, TypeCard } from './settings-parts';

/** Task settings of project `projectId` as `role`; counts follow the task store. */
export function TasksSettings({
  projectId,
  role = SESSION_ROLE,
}: {
  projectId: string;
  role?: Role;
}) {
  useTasks((s) => s.tasks);
  const notice = useNotice();
  const view = getTaskSettings(role, projectId);
  // Phase 1 keeps the switch on this screen only; the setting itself comes with the API.
  const [review, setReview] = useState(view.allowed && view.needsReview);
  if (!view.allowed) {
    return (
      <TaskPage title={P.title} testID="tasks-settings-locked">
        <EmptyState icon={Lock} iconLabel={P.lockedIcon} title={P.locked} text={P.lockedText} />
      </TaskPage>
    );
  }
  return (
    <TaskPage title={P.title} testID="tasks-settings">
      <VStack className="gap-1">
        <Text accessibilityRole="header" className="text-section font-semibold text-foreground">
          {view.project}
        </Text>
        <Text className="text-footnote text-muted-foreground">{P.opened}</Text>
      </VStack>
      <Soft>
        <HStack className="min-h-11 items-center justify-between gap-3">
          <Text className="min-w-0 flex-1 text-headline font-semibold text-foreground">
            {P.review}
          </Text>
          <HStack className="items-center gap-2">
            <Text className="text-footnote font-bold text-foreground">{review ? P.on : P.off}</Text>
            <Switch accessibilityLabel={P.review} value={review} onValueChange={setReview} />
          </HStack>
        </HStack>
        <Text className="text-footnote text-foreground">{P.reviewText}</Text>
        <Text className="text-footnote text-muted-foreground">{P.reviewNote}</Text>
      </Soft>
      <Sec title={P.types} right={<Act label={P.addType} onPress={() => notice(P.newType)} />}>
        <Text className="text-footnote text-muted-foreground">{view.typeLimit}</Text>
        {view.types.map((t) => (
          <TypeCard key={t.name} {...t} />
        ))}
        <Text className="text-footnote text-muted-foreground">{P.typesNote}</Text>
      </Sec>
      <Sec
        title={P.tags}
        right={
          <Text className="text-footnote text-muted-foreground">
            {P.tagCount(view.tags.length)}
          </Text>
        }
      >
        <VStack className="rounded-card bg-card px-4">
          {view.tags.map((t) => (
            <TagRow key={t.tag} {...t} />
          ))}
        </VStack>
      </Sec>
    </TaskPage>
  );
}
