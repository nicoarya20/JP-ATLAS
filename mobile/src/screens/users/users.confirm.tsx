// One T2 dialog for every Users action (approve, reject, change role, deactivate): the tab asks with the copy and what
// to do once confirmed.
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm/confirm-dialog';

export type UserAsk = {
  title: string;
  message: string;
  label: string;
  danger?: boolean;
  /** Runs once confirmed. */
  run: () => void;
};

/** [dialog element, ask]: `ask` opens the dialog for one action. */
export function useUserConfirm() {
  const [ask, setAsk] = useState<UserAsk | null>(null);
  const dialog = (
    <ConfirmDialog
      testID="users-confirm"
      open={!!ask}
      onClose={() => setAsk(null)}
      title={ask?.title ?? ''}
      message={ask?.message ?? ''}
      confirmLabel={ask?.label ?? ''}
      danger={ask?.danger}
      onConfirm={() => ask?.run()}
    />
  );
  return [dialog, setAsk] as const;
}
