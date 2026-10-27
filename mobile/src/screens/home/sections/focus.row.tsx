import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonText } from '@/components/ui/button';
import type { FocusTask } from '@/data/home.types';

import { S } from '../home.strings';
import { ListRow } from '../parts/list-row';

type FocusRowProps = {
  task: FocusTask;
  onOpen: () => void;
  /** Done marks the task done in place; only tasks without a review get it. */
  onDone: (no: number) => void;
  /** Replaces the right part (Review buttons). */
  action?: { label: string; primary: boolean };
};

/** A task row of My Focus: opens the task; on the right Done, the task's status, or the given action. */
export function FocusRow({ task, onOpen, onDone, action }: FocusRowProps) {
  const right = action ? (
    <Button size="sm" variant={action.primary ? 'default' : 'outline'} onPress={onOpen}>
      <ButtonText>{action.label}</ButtonText>
    </Button>
  ) : task.canMarkDone ? (
    <Button
      size="sm"
      variant="outline"
      accessibilityLabel={`${S.focus.done}: ${task.title}`}
      onPress={() => onDone(task.no)}
    >
      <ButtonText>{S.focus.done}</ButtonText>
    </Button>
  ) : (
    <StatusPill status={task.status} />
  );
  return (
    <ListRow
      soft
      title={S.focus.taskTitle(task.no, task.title)}
      sub={S.focus.taskSub(task.project, task.when)}
      right={right}
      onPress={onOpen}
    />
  );
}
