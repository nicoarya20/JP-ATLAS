// One T2 dialog for every Users action (approve, reject, change role, deactivate, reactivate): the tab asks with the
// copy and what to do once confirmed. The write runs inside the dialog (spinner, closes on success); a refusal stays
// in it, in the server's own words (a 403 included, as it came).
import { useState } from 'react';

import { isApiError } from '@/api/errors';
import { ConfirmDialog } from '@/components/confirm/confirm-dialog';

import { USERS } from './users.strings';

export type UserAsk = {
  title: string;
  message: string;
  label: string;
  danger?: boolean;
  /** Runs once confirmed; a rejection keeps the dialog open with the reason. */
  run: () => Promise<void>;
};

/** The server's sentence for a refused write, as it came. */
export const serverSaid = (e: unknown): string =>
  isApiError(e) && e.message ? e.message : USERS.failed;

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
      errorText={serverSaid}
    />
  );
  return [dialog, setAsk] as const;
}
