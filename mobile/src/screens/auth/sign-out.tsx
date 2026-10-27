// Sign out (T2): Settings, Profile and the pending sign-up open the same dialog; Phase 1 only goes to the login screen
// (no session to end yet, docs/phase1-screens.more.md §11).
import { router } from 'expo-router';

import { ConfirmDialog } from '@/components/confirm/confirm-dialog';

import { SIGN_OUT } from './auth.strings';

/** Back to the login screen, with nothing left to go back to. */
export function signOut() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/login');
}

/** The Sign out confirmation; confirming signs out. */
export function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={SIGN_OUT.title}
      message={SIGN_OUT.message}
      confirmLabel={SIGN_OUT.confirm}
      onConfirm={signOut}
      danger
      testID="sign-out-dialog"
    />
  );
}
