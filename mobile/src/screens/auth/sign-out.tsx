// Sign out (T2): Settings, Profile, the pending screen and the denied screen all open this dialog.
// Phase 2 really ends the session — the server revokes it, then the phone's stored copy is emptied —
// and the session gate (app/_layout.tsx) swaps the app for the sign-in screen as soon as the
// session store says so, so nothing here navigates.
import { isApiError } from '@/api';
import { ConfirmDialog } from '@/components/confirm/confirm-dialog';
import { signOutEverywhere } from '@/session';

import { SIGN_OUT } from './auth.strings';

/**
 * What the dialog shows when signing out failed: the server's own message when it answered, ours
 * when the request never arrived. The dialog stays open, so the person can try again or cancel —
 * a session the server still honours must not be reported as ended.
 */
export const signOutError = (thrown: unknown): string =>
  isApiError(thrown) && thrown.message ? thrown.message : SIGN_OUT.failed;

/** The Sign out confirmation; confirming ends the session for real. */
export function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={SIGN_OUT.title}
      message={SIGN_OUT.message}
      confirmLabel={SIGN_OUT.confirm}
      onConfirm={signOutEverywhere}
      errorText={signOutError}
      danger
      testID="sign-out-dialog"
    />
  );
}
