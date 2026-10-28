// Pieces both task sheets share (prototype tasks.sheets.jsx `pair` and `sub`): the task line under the title, the two
// actions side by side with the main one wider, and the task a sheet acts on.
import { router } from 'expo-router';
import { useState } from 'react';

import { HStack } from '@/components/ui/hstack';
import { taskDetailResource } from '@/data/tasks.detail.api';
import type { TaskDetailWire } from '@/data/tasks.detail.wire';

import { Act } from '../parts/task-parts';

/** "#17 Fix login layout". */
export const taskLine = (task: Pick<TaskDetailWire, 'number' | 'title'>) =>
  `#${task.number} ${task.title}`;

/**
 * Task #no as its detail last loaded it, read once: the sheet opens over that detail, and a step that worked takes
 * its own button away (Cancel task from a canceled task), which must not turn the sheet away while it closes. Null
 * when the detail was never opened (a link straight to the sheet).
 */
export function useSheetTask(no: number): TaskDetailWire | null {
  const [task] = useState(() => taskDetailResource(no).current());
  return task;
}

type PairProps = {
  cancel: string;
  primary: string;
  /** The main action is allowed (its required fields are filled). */
  ok: boolean;
  /** What is still missing while it is not allowed, read as the main action's hint. */
  hint?: string;
  /** The request is out: the main action spins. */
  loading?: boolean;
  onPress: () => void;
  kind?: 'primary' | 'danger';
  testID?: string;
};

export function SheetPair({
  cancel,
  primary,
  ok,
  hint,
  loading,
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
        loading={loading}
        hint={ok ? undefined : hint}
        onPress={onPress}
        testID={testID}
      />
    </HStack>
  );
}
