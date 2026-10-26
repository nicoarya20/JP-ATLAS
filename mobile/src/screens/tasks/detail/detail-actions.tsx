// What the detail offers under its title (prototype tasks.detail.jsx TaskDetail, tasks.detail.screens.jsx): the status
// buttons for the variant (Start working / Mark done, Request review / Mark done / Reopen, Approve + Return), or in
// their place a note: in Archive, canceled (with Restore), someone else's task, or waiting for a review.

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskActionKey, TaskDetailView } from '@/data/tasks.detail';

import { Act, Soft } from '../parts/task-parts';
import { S } from '../tasks.strings';

type DetailActionsProps = {
  view: TaskDetailView;
  onAction: (key: TaskActionKey) => void;
  onReturn: () => void;
};

/** The detail's actions or its state note. */
export function DetailActions({ view, onAction, onReturn }: DetailActionsProps) {
  const note = view.stateNote;
  if (note?.kind === 'archived')
    return <Text className="text-footnote text-muted-foreground">{note.text}</Text>;
  if (note) {
    return (
      <Soft testID="task-note">
        <Text className="text-footnote text-foreground">{note.text}</Text>
        {note.kind === 'canceled' && note.restore && (
          <HStack>
            <Act label={S.detail.restore} onPress={() => onAction('restore')} />
          </HStack>
        )}
      </Soft>
    );
  }
  const one = view.actions.length === 1 && !view.canReturn;
  return (
    <VStack className="gap-2">
      <HStack className="gap-3">
        {view.actions.map((a) => (
          <Act
            key={a.key}
            testID={`task-action-${a.key}`}
            label={a.label}
            kind={a.primary ? 'primary' : 'outline'}
            grow={one || view.canReturn}
            onPress={() => onAction(a.key)}
          />
        ))}
        {view.canReturn && (
          <Act testID="task-return" label={S.detail.returnTask} grow onPress={onReturn} />
        )}
      </HStack>
      {view.approveHint && (
        <Text className="text-footnote text-muted-foreground">{view.approveHint}</Text>
      )}
    </VStack>
  );
}
