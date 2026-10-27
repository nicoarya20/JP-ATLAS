// What the detail offers under its title (prototype tasks.detail.jsx TaskDetail): the status buttons the server allows
// for this task, or, for a canceled one, why it was canceled with Restore beside it.
//
// Three buttons the prototype had are not here — Request review, Approve and Return. The server has the policy and
// sends the capabilities, but the routes answer 404 until the review feature ships (A6), so offering them would be a
// button that fails. The note that used to explain why someone may not change a task is gone too: who may do what is
// the server's answer now (can{}), and that note was this app's own rule talking.

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { RESTORE_LABEL, type TaskDetailTask } from '@/data/tasks.api.detail';
import type { TaskActionKey } from '@/data/tasks.detail';

import { Act, Soft } from '../parts/task-parts';

type DetailActionsProps = {
  task: TaskDetailTask;
  /** The step a request is out for, so its button shows the wait and takes no second press (UX §2). */
  busy: TaskActionKey | null;
  onAction: (key: TaskActionKey) => void;
};

/** The detail's actions, or a canceled task's note. */
export function DetailActions({ task, busy, onAction }: DetailActionsProps) {
  const note = task.stateNote;
  if (note) {
    return (
      <Soft testID="task-note">
        <Text className="text-footnote text-foreground">{note.text}</Text>
        {note.restore && (
          <HStack>
            <Act
              testID="task-action-restore"
              label={RESTORE_LABEL}
              loading={busy === 'restore'}
              onPress={() => onAction('restore')}
            />
          </HStack>
        )}
      </Soft>
    );
  }
  if (!task.actions.length) return null;
  const one = task.actions.length === 1;
  return (
    <VStack className="gap-2">
      <HStack className="gap-3">
        {task.actions.map((a) => (
          <Act
            key={a.key}
            testID={`task-action-${a.key}`}
            label={a.label}
            kind={a.primary ? 'primary' : 'outline'}
            grow={one}
            disabled={!a.enabled}
            hint={a.hint}
            loading={busy === a.key}
            onPress={() => onAction(a.key)}
          />
        ))}
      </HStack>
    </VStack>
  );
}
