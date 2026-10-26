// Pieces both task sheets share (prototype tasks.sheets.jsx `pair` and `sub`): the task line under the title and the
// two actions side by side, the main one wider.
import { router } from 'expo-router';

import { HStack } from '@/components/ui/hstack';
import type { TaskDetailView } from '@/data/tasks.detail';

import { Act } from '../parts/task-parts';

/** "#17 Fix login layout". */
export const taskLine = (view: TaskDetailView) => `#${view.task.no} ${view.task.title}`;

type PairProps = {
  cancel: string;
  primary: string;
  /** The main action is allowed (its required fields are filled). */
  ok: boolean;
  /** What is still missing while it is not allowed, read as the main action's hint. */
  hint?: string;
  onPress: () => void;
  kind?: 'primary' | 'danger';
  testID?: string;
};

export function SheetPair({
  cancel,
  primary,
  ok,
  hint,
  onPress,
  kind = 'primary',
  testID,
}: PairProps) {
  return (
    <HStack className="gap-3">
      <Act grow label={cancel} onPress={() => router.back()} />
      <Act
        wide
        kind={kind}
        label={primary}
        disabled={!ok}
        hint={ok ? undefined : hint}
        onPress={onPress}
        testID={testID}
      />
    </HStack>
  );
}
