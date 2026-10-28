// What the detail offers under its title: the buttons the server's `can{}` shows (Start working, Mark done, Stop
// working, Reopen), the lime one being the server's `primary`; a disabled one says why (E-6, UX §5). A canceled task
// shows why in their place, with Restore when allowed; a task the viewer may only look at says so.
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { DetailAction, DetailActionKey, TaskDetailView } from '@/data/tasks.detail';

import { Act, Soft } from '../parts/task-parts';
import { S } from '../tasks.strings';

type DetailActionsProps = {
  view: TaskDetailView;
  /** The action running now (its button spins, the others wait). */
  busy: string | null;
  onAction: (key: DetailActionKey) => void;
};

function ActionButton({
  a,
  busy,
  grow,
  onAction,
}: {
  a: DetailAction;
  busy: string | null;
  grow: boolean;
  onAction: (key: DetailActionKey) => void;
}) {
  return (
    <Act
      testID={`task-action-${a.key}`}
      label={a.label}
      kind={a.primary ? 'primary' : 'outline'}
      grow={grow}
      disabled={!!a.off || (!!busy && busy !== a.key)}
      loading={busy === a.key}
      hint={a.off ?? undefined}
      onPress={() => onAction(a.key)}
    />
  );
}

/** The detail's actions, or its note. */
export function DetailActions({ view, busy, onAction }: DetailActionsProps) {
  if (view.canceled) {
    const restore = view.canceled.restore;
    return (
      <Soft testID="task-note">
        <Text className="text-footnote text-foreground">{view.canceled.text}</Text>
        {restore && (
          <HStack>
            <ActionButton a={restore} busy={busy} grow={false} onAction={onAction} />
          </HStack>
        )}
        {restore?.off && <Text className="text-footnote text-muted-foreground">{restore.off}</Text>}
      </Soft>
    );
  }
  if (view.viewOnly) {
    return (
      <Soft testID="task-note">
        <Text className="text-footnote text-foreground">{S.detail.viewOnly}</Text>
      </Soft>
    );
  }
  if (!view.actions.length) return null;
  const off = view.actions.find((a) => a.off)?.off;
  return (
    <VStack className="gap-2">
      <HStack className="gap-3">
        {view.actions.map((a) => (
          <ActionButton key={a.key} a={a} busy={busy} grow onAction={onAction} />
        ))}
      </HStack>
      {off && <Text className="text-footnote text-muted-foreground">{off}</Text>}
    </VStack>
  );
}
