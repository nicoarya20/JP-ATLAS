import { Button } from '@mantine/core';
import { useState } from 'react';
import { FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { confirmAction } from '~/components/ui/confirmAction';
import { signOut } from '~/lib/auth-client';
import { notifyError } from '~/lib/notify';
import { SIGN_OUT_COPY } from './account.copy';

/** "Keluar dari akun" with the shared T2 confirm dialog; spins until the session is gone. */
export function SignOutButton() {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  const leave = async () => {
    setLeaving(true);
    try {
      const { error } = await signOut();
      if (error) throw new Error(error.message ?? 'Server menolak. Coba lagi.');
      navigate('/login');
    } catch (err) {
      // The session is still valid, so the user stays here and can try again.
      setLeaving(false);
      notifyError(SIGN_OUT_COPY.failed, err);
    }
  };

  return (
    <Button
      variant="light"
      color="red"
      leftSection={<FiLogOut size="1.25em" />}
      loading={leaving}
      onClick={() =>
        confirmAction({
          title: SIGN_OUT_COPY.title,
          body: SIGN_OUT_COPY.body,
          confirmLabel: SIGN_OUT_COPY.confirm,
          danger: true,
          onConfirm: leave,
        })
      }
    >
      {SIGN_OUT_COPY.button}
    </Button>
  );
}
