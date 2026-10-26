import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import type { FocusTask, ReviewTask } from '@/data/home.types';

import { S } from '../home.strings';
import { ListRow } from '../parts/list-row';

/** The word on a row's button, from the step the server offered. */
const LABEL = { complete: S.focus.done, start: S.focus.start } as const;

type FocusRowProps = {
  task: FocusTask;
  onOpen: () => void;
  /** Runs the row's own step; the button is busy until it answers. */
  onAction: (task: FocusTask) => void;
  busy?: boolean;
};

/**
 * A task row of My Focus: the title opens the task, and on the right the one button the server
 * offered — Done, Start, or nothing at all. There is no client rule about which: the server's
 * policy decided it (`focus.items[].action`).
 */
export function FocusRow({ task, onOpen, onAction, busy = false }: FocusRowProps) {
  const label = task.action ? LABEL[task.action] : null;
  return (
    <ListRow
      soft
      title={S.focus.taskTitle(task.no, task.title)}
      sub={S.focus.taskSub(task.project, S.focus.when(task))}
      right={
        label ? (
          <Button
            size="sm"
            variant="outline"
            isDisabled={busy}
            accessibilityState={{ busy, disabled: busy }}
            accessibilityLabel={`${label}: ${task.title}`}
            onPress={() => onAction(task)}
          >
            {busy && <ButtonSpinner />}
            <ButtonText>{label}</ButtonText>
          </Button>
        ) : undefined
      }
      onPress={onOpen}
    />
  );
}

/** A task waiting for my review: the Review button opens it, as the prototype's did. */
export function ReviewRow({
  task,
  primary,
  onOpen,
}: {
  task: ReviewTask;
  primary: boolean;
  onOpen: () => void;
}) {
  return (
    <ListRow
      soft
      title={S.focus.taskTitle(task.no, task.title)}
      sub={task.project}
      right={
        <Button size="sm" variant={primary ? 'default' : 'outline'} onPress={onOpen}>
          <ButtonText>{S.focus.review}</ButtonText>
        </Button>
      }
      onPress={onOpen}
    />
  );
}
