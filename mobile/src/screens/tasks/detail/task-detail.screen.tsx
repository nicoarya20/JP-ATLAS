// Task detail (prototype tasks.detail.jsx TaskDetail, tasks.detail.screens.jsx ⑧–⑩): one screen for every status,
// its variant from getTaskDetail. The ⋯ menu has Edit task, Cancel task and Move to Archive; a status button changes
// the task in place (the screen re-renders from the store) and Return opens its sheet. Move to Archive needs no
// dialog (UX T1): the task goes to Archive, All tasks opens, and its snack offers Undo.
import { router, useLocalSearchParams } from 'expo-router';
import { ListX } from 'lucide-react-native';

import { ActionMenu } from '@/components/menu/action-menu';
import { useNotice } from '@/components/notice/use-notice';
import { showSnack } from '@/components/snack/use-snack';
import { EmptyState } from '@/components/state/empty-state';
import { StatusPill } from '@/components/status/status-pill';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getTaskDetail } from '@/data/tasks';
import { archiveFromDetail, runTaskAction, undoArchive } from '@/data/tasks.actions';
import type { TaskActionKey, TaskMenuKey } from '@/data/tasks.detail';
import { useTasks } from '@/data/tasks.state';
import { TaskPage } from '../parts/task-page';
import { Foot, Soft } from '../parts/task-parts';
import { S } from '../tasks.strings';
import { DetailActions } from './detail-actions';
import { DetailEvidence } from './detail-evidence';
import { DetailFacts } from './detail-facts';
import { DetailDescription, DetailHistory } from './detail-history';
import { DetailSteps } from './detail-steps';

/** Detail of the task in the route (`/tasks/<no>`) for `role`. */
export function TaskDetailScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const no = Number(id);
  const notice = useNotice();
  const view = getTaskDetail(
    role,
    no,
    useTasks((s) => s),
  );
  if (!view) {
    return (
      <TaskPage title={S.detail.title} testID="task-missing">
        <EmptyState icon={ListX} title={S.detail.missing} text={S.detail.missingText} />
      </TaskPage>
    );
  }
  const t = view.task;
  const review = view.variant === 'review';
  const act = (key: TaskActionKey) => notice(runTaskAction(role, no, key));
  const archive = () => {
    const message = archiveFromDetail(role, no);
    router.dismissTo({ pathname: '/tasks', params: { scope: 'all' } });
    showSnack({ message, action: S.detail.undo, onAction: () => notice(undoArchive(no)) });
  };
  const MENU: Record<TaskMenuKey, { label: string; onPress: () => void; danger?: boolean }> = {
    edit: { label: S.detail.menuItem.edit, onPress: () => router.push(`/tasks/${no}/edit`) },
    cancel: { label: S.detail.menuItem.cancel, onPress: () => router.push(`/tasks/${no}/cancel`) },
    archive: { label: S.detail.menuItem.archive, onPress: archive, danger: true },
  };
  const right = view.menu.length ? (
    <ActionMenu testID="task-menu" label={S.detail.menu} items={view.menu.map((k) => MENU[k])} />
  ) : undefined;
  const foot = (
    <Foot>
      <Input className="flex-1">
        <InputField aria-label={S.detail.commentLabel} placeholder={S.detail.comment} />
      </Input>
    </Foot>
  );
  return (
    <TaskPage testID="screen-task" title={S.detail.title} right={right} foot={foot}>
      {view.banner && (
        <Soft testID="task-banner">
          <Text className="text-headline font-semibold text-foreground">{view.banner.title}</Text>
          <Text className="text-footnote text-foreground">{view.banner.sub}</Text>
        </Soft>
      )}
      <VStack className="items-start gap-2">
        <VStack className="gap-1">
          <Text accessibilityRole="header" className="text-section font-bold text-foreground">
            {t.title}
          </Text>
          <Text className="text-footnote text-muted-foreground">{view.meta}</Text>
        </VStack>
        <Text className="text-footnote font-semibold text-foreground">{view.due}</Text>
        <StatusPill status={t.status} />
      </VStack>
      <DetailActions
        view={view}
        onAction={act}
        onReturn={() => router.push(`/tasks/${no}/return`)}
      />
      <DetailFacts facts={view.facts} />
      {view.leadNote && (
        <Soft>
          <Text className="text-footnote text-foreground">{view.leadNote}</Text>
        </Soft>
      )}
      <DetailDescription view={view} />
      {/* In review shows the evidence first (prototype TasksDetailReview). */}
      {review && <DetailEvidence evidence={view.evidence} review />}
      <DetailSteps steps={view.steps} />
      {!review && <DetailEvidence evidence={view.evidence} review={false} />}
      <DetailHistory history={view.history} />
    </TaskPage>
  );
}
