// Task detail (prototype tasks.detail.jsx TaskDetail, tasks.detail.screens.jsx ⑧–⑩), read from GET /api/app/tasks/:ref
// and its timeline: one screen for every status. The buttons, the ⋯ menu (Edit task, Cancel task), the steps and the comment box
// are what the task's `can{}` shows; a step runs on the server and the screen redraws from the refreshed task. Reopen
// asks for a reason in its sheet, Cancel task for a category in its own. A task the viewer cannot see, or that is not
// there (in the Trash, or never was), reads as not found: the server answers both with 404 and does not say which.
import { router, useLocalSearchParams } from 'expo-router';
import { ListX } from 'lucide-react-native';
import { useEffect } from 'react';

import { ActionMenu } from '@/components/menu/action-menu';
import { useNotice } from '@/components/notice/use-notice';
import { EmptyState } from '@/components/state/empty-state';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { StatusPill } from '@/components/status/status-pill';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { buildTaskDetail, type DetailActionKey } from '@/data/tasks.detail';
import { taskDetailResource, taskTimelineResource } from '@/data/tasks.detail.api';
import { runTaskStep } from '@/data/tasks.detail.write';

import { TaskPage } from '../parts/task-page';
import { S } from '../tasks.strings';
import { DetailActions } from './detail-actions';
import { CommentFoot } from './detail-comment';
import { DetailFacts } from './detail-facts';
import { DetailDescription, DetailHistory } from './detail-history';
import { DetailSteps } from './detail-steps';
import { useDetailRun } from './use-detail-run';

const NOT_FOUND = 404;

function Missing() {
  return (
    <TaskPage title={S.detail.title} testID="task-missing">
      <EmptyState icon={ListX} title={S.detail.missing} text={S.detail.missingText} />
    </TaskPage>
  );
}

/** Detail of the task in the route (`/tasks/<no>`); a route that is not a task number is not found. */
export function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const no = Number(id);
  return Number.isInteger(no) && no > 0 ? <Detail no={no} /> : <Missing />;
}

function Detail({ no }: { no: number }) {
  const res = taskDetailResource(no);
  const state = res.use();
  const { busy, run } = useDetailRun();
  const notice = useNotice();
  useEffect(() => {
    void taskDetailResource(no).ensure();
    void taskTimelineResource(no).ensure();
  }, [no]);
  const task = state.data;
  if (!task) {
    if (state.phase === 'failed' && state.error?.status === NOT_FOUND) return <Missing />;
    return (
      <TaskPage title={S.detail.title} testID="task-loading">
        {state.phase === 'failed' ? (
          <FailedState
            testID="task-failed"
            message={state.error?.message}
            onRetry={() => void res.reload()}
          />
        ) : (
          <LoadingState />
        )}
      </TaskPage>
    );
  }
  const view = buildTaskDetail(task);
  const act = (key: DetailActionKey) => {
    if (key === 'reopen') {
      router.push(`/tasks/${no}/reopen`);
      return;
    }
    void run(key, () => runTaskStep(view.id, key));
  };
  // Edit task and Cancel task, each where `can{}` shows it; Move to Archive waits for the Trash. The menu has no
  // disabled item, so one the server greys out says why when picked (E-6).
  const item = (
    allowed: { off: string | null },
    label: string,
    href: `/tasks/${number}/${string}`,
  ) => ({
    label,
    onPress: () => (allowed.off ? notice(allowed.off) : router.push(href)),
  });
  const items = [
    view.edit && item(view.edit, S.detail.menuItem.edit, `/tasks/${no}/edit`),
    view.cancel && {
      ...item(view.cancel, S.detail.menuItem.cancel, `/tasks/${no}/cancel`),
      danger: true,
    },
  ].filter((x) => !!x);
  const right = items.length ? (
    <ActionMenu testID="task-menu" label={S.detail.menu} items={items} />
  ) : undefined;
  const foot = view.comment && <CommentFoot allowed={view.comment} no={no} id={view.id} />;
  return (
    <TaskPage testID="screen-task" title={S.detail.title} right={right} foot={foot || undefined}>
      <VStack className="items-start gap-2">
        <VStack className="gap-1">
          <Text accessibilityRole="header" className="text-section font-bold text-foreground">
            {view.title}
          </Text>
          <Text className="text-footnote text-muted-foreground">{view.meta}</Text>
        </VStack>
        <Text className="text-footnote font-semibold text-foreground">{view.due}</Text>
        <StatusPill status={view.status} />
      </VStack>
      <DetailActions view={view} busy={busy} onAction={act} />
      <DetailFacts facts={view.facts} />
      <DetailDescription text={view.description} />
      <DetailSteps view={view} />
      <DetailHistory task={task} />
    </TaskPage>
  );
}
