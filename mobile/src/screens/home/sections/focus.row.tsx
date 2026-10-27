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

/**
 * A task row of My Focus: opens the task. The right column holds only actions (Review, or Done when the task needs no
 * review); a row without one shows its status in the sub line instead of a pill, so buttons and pills never share the
 * column. Review rows say "Awaiting my review" already, so they skip the status.
 */
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
  ) : undefined;
  const sub =
    action || task.canMarkDone
      ? S.focus.taskSub(task.project, task.when)
      : S.focus.taskSubStatus(task.project, task.when, task.status);
  return (
    <ListRow
      soft
      title={S.focus.taskTitle(task.no, task.title)}
      sub={sub}
      right={right}
      onPress={onOpen}
    />
  );
}
