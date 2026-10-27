// Task detail (prototype tasks.detail.jsx TaskDetail, tasks.detail.screens.jsx ⑧–⑩): one screen for every status, now
// served by GET /api/app/tasks/:ref and its timeline. A status button posts its step and the screen redraws from what
// the server answers; Reopen asks for a reason first, because the server requires one. The ⋯ menu offers Cancel task
// and Move to Archive, which sends the task to the Trash (30 days) and offers Undo in a snack — no dialog, as UX T1
// asks for an action that can be taken back.
//
// Edit task is not in the menu: the Edit form still writes to the sample store, so from a server-backed detail it
// would be a screen that cannot save what it shows. Recorded in docs/phase2-gap-disembunyikan.md.
import { router, useLocalSearchParams } from 'expo-router';
import { ListX } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { ActionMenu } from '@/components/menu/action-menu';
import { useNotice } from '@/components/notice/use-notice';
import { showSnack } from '@/components/snack/use-snack';
import { EmptyState } from '@/components/state/empty-state';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { StatusPill } from '@/components/status/status-pill';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import {
  ensureTaskDetailView,
  moreTaskHistory,
  reloadTaskDetailView,
  type TaskDetailTask,
  useTaskDetailView,
} from '@/data/tasks.api.detail';
import { actionStep } from '@/data/tasks.api.values';
import { addComment, restoreTrashedTask, runStep, trashTask } from '@/data/tasks.api.write';
import type { TaskActionKey, TaskMenuKey } from '@/data/tasks.detail';

import { TaskPage } from '../parts/task-page';
import { Act, Foot } from '../parts/task-parts';
import { whyFailed } from '../parts/write-failed';
import { S } from '../tasks.strings';
import { DetailActions } from './detail-actions';
import { DetailFacts } from './detail-facts';
import { DetailDescription, DetailHistory } from './detail-history';
import { DetailSteps } from './detail-steps';

/**
 * What to say after a step the server accepted. Only the steps this screen offers are here: the
 * three review ones have no route yet (A6), so a key without a notice is a bug, not a case to cover
 * with a vague sentence.
 */
const NOTICE: Partial<Record<TaskActionKey, string>> = {
  start: S.detail.done.start,
  markDone: S.detail.done.markDone,
  restore: S.detail.done.restore,
};

/** The comment box, when the server offers it (`can.comment`). */
function CommentFoot({ task }: { task: string }) {
  const notice = useNotice();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const body = text.trim();
  const send = async () => {
    setSending(true);
    try {
      await addComment(task, body);
      setText('');
      notice(S.detail.done.commented);
    } catch (cause) {
      notice(whyFailed(cause));
    } finally {
      setSending(false);
    }
  };
  return (
    <Foot>
      <Input className="flex-1">
        <InputField
          aria-label={S.detail.commentLabel}
          placeholder={S.detail.comment}
          value={text}
          onChangeText={setText}
        />
      </Input>
      <Act
        testID="task-comment-send"
        label={S.detail.send}
        kind="primary"
        disabled={!body}
        loading={sending}
        onPress={() => void send()}
      />
    </Foot>
  );
}

/** Detail of the task in the route (`/tasks/<no>`). */
export function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ref = id ?? '';
  const notice = useNotice();
  const view = useTaskDetailView(ref);
  const [busy, setBusy] = useState<TaskActionKey | null>(null);
  // Idempotent by rule 1: `ensure()` fetches only what is not fresh, so every mount may ask.
  useEffect(() => {
    void ensureTaskDetailView(ref);
  }, [ref]);

  if (view.missing) {
    return (
      <TaskPage title={S.detail.title} testID="task-missing">
        <EmptyState icon={ListX} title={S.detail.missing} text={S.detail.missingText} />
      </TaskPage>
    );
  }
  if (!view.task) {
    return (
      <TaskPage title={S.detail.title} testID="screen-task">
        {view.phase === 'failed' ? (
          // The server's own sentence, as it came (K5).
          <FailedState
            testID="task-failed"
            message={view.error?.message}
            onRetry={() => void reloadTaskDetailView(ref)}
          />
        ) : (
          <LoadingState testID="task-loading" />
        )}
      </TaskPage>
    );
  }
  const task: TaskDetailTask = view.task;

  const act = async (key: TaskActionKey) => {
    // The reason the server insists on (3–200 characters) is asked for in its own sheet first.
    if (key === 'reopen') {
      router.push(`/tasks/${task.no}/reopen`);
      return;
    }
    const said = NOTICE[key];
    if (!said) throw new Error(`Cannot ${key} task ${ref}: the detail does not offer that step`);
    setBusy(key);
    try {
      await runStep(ref, actionStep(key).path);
      notice(said);
    } catch (cause) {
      notice(whyFailed(cause));
    } finally {
      setBusy(null);
    }
  };

  const undo = async (trashId: string) => {
    try {
      await restoreTrashedTask(trashId);
      notice(S.detail.done.unarchived);
    } catch (cause) {
      notice(whyFailed(cause));
    }
  };

  const archive = async () => {
    try {
      const { trash } = await trashTask(ref);
      router.dismissTo({ pathname: '/tasks', params: { scope: 'all' } });
      showSnack({
        message: S.detail.done.archived,
        action: S.detail.undo,
        onAction: () => void undo(trash.id),
      });
    } catch (cause) {
      notice(whyFailed(cause));
    }
  };

  // A key with no entry here is hidden; `edit` has none on purpose (see the file's note).
  const MENU: Partial<
    Record<TaskMenuKey, { label: string; onPress: () => void; danger?: boolean }>
  > = {
    cancel: {
      label: S.detail.menuItem.cancel,
      onPress: () => router.push(`/tasks/${task.no}/cancel`),
    },
    archive: { label: S.detail.menuItem.archive, onPress: () => void archive(), danger: true },
  };
  const items = task.menu.flatMap((k) => MENU[k] ?? []);
  const right = items.length ? (
    <ActionMenu testID="task-menu" label={S.detail.menu} items={items} />
  ) : undefined;
  return (
    <TaskPage
      testID="screen-task"
      title={S.detail.title}
      right={right}
      foot={task.mayComment ? <CommentFoot task={ref} /> : undefined}
    >
      <VStack className="items-start gap-2">
        <VStack className="gap-1">
          <Text accessibilityRole="header" className="text-section font-bold text-foreground">
            {task.title}
          </Text>
          <Text className="text-footnote text-muted-foreground">{task.meta}</Text>
        </VStack>
        <Text className="text-footnote font-semibold text-foreground">{task.due}</Text>
        <StatusPill status={task.status} />
      </VStack>
      <DetailActions task={task} busy={busy} onAction={(key) => void act(key)} />
      <DetailFacts facts={task.facts} />
      <DetailDescription task={task} />
      <DetailSteps task={ref} steps={task.steps} />
      <DetailHistory
        history={task.history}
        hasMore={task.hasMoreHistory}
        onMore={() => void moreTaskHistory(ref)}
      />
    </TaskPage>
  );
}
