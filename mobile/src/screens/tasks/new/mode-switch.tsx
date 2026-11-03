// The Just write ✦ / Fill form switch at the top of New task: the other mode replaces the screen, on the same project.
// What was written here does not go along, so with `unsaved` the switch asks first (UX §1 T2: text and drafts are lost).
import { router } from 'expo-router';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm/confirm-dialog';
import { Seg } from '@/components/form/seg';

import { F } from '../tasks.strings';
import { LEAVE_MODE, MODE_NAMES } from '../tasks.strings.added';

type ModeSwitchProps = {
  /** 0 on Just write, 1 on Fill form. */
  value: 0 | 1;
  /** The project picked, carried to the other mode. */
  project?: string;
  /** Something written here would be lost by switching: confirm first. */
  unsaved?: boolean;
};

export function ModeSwitch({ value, project, unsaved }: ModeSwitchProps) {
  const [asking, setAsking] = useState<0 | 1 | null>(null);
  const go = (i: 0 | 1) => {
    const params = project ? { project } : {};
    router.replace(
      i ? { pathname: '/tasks/new/form', params } : { pathname: '/tasks/new', params },
    );
  };
  return (
    <>
      <Seg
        items={F.modes}
        names={MODE_NAMES}
        value={value}
        onChange={(n) => {
          const i = n ? 1 : 0;
          if (i === value) return;
          if (unsaved) setAsking(i);
          else go(i);
        }}
        testID="new-mode"
      />
      <ConfirmDialog
        open={asking !== null}
        onClose={() => setAsking(null)}
        title={LEAVE_MODE.title(MODE_NAMES[asking ?? 1])}
        message={LEAVE_MODE.message}
        confirmLabel={LEAVE_MODE.confirm}
        onConfirm={() => go(asking ?? 1)}
        danger
        testID="new-mode-confirm"
      />
    </>
  );
}
