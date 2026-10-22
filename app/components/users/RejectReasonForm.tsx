import { Stack, Text, Textarea } from '@mantine/core';
import {
  isValidRejectReason,
  REJECT_REASON_MAX,
  REJECT_REASON_MIN,
} from '@server/access/account-status.rules';
import { useEffect, useState } from 'react';
import type { AdminUser } from '~/lib/admin-users-api';

/** Lets the confirm dialog ask the form to validate; returns the trimmed reason, or null when it is unusable. */
export type RejectHandle = { current: (() => string | null) | null };

type Props = { user: Pick<AdminUser, 'name' | 'email'>; handle: RejectHandle };

/**
 * Rejection dialog body. The confirm button lives in the surrounding confirm modal, so the
 * form exposes `submit` through `handle`: the reason is mandatory because the rejected person reads it.
 */
export function RejectReasonForm({ user, handle }: Props) {
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const valid = isValidRejectReason(reason);
  const length = Array.from(reason.trim()).length;
  useEffect(() => {
    handle.current = () => {
      setTried(true);
      return valid ? reason.trim() : null;
    };
    return () => {
      handle.current = null;
    };
  });
  return (
    <Stack gap="sm">
      <Text size="sm">
        Pendaftaran <strong>{user.name}</strong> ({user.email}) akan ditolak dan orangnya tidak bisa
        memakai aplikasi. Kamu bisa menyetujuinya lagi nanti.
      </Text>
      <Textarea
        label="Alasan penolakan"
        description={`Alasan ini dibaca oleh orang yang ditolak. Tulis singkat dan sopan (${REJECT_REASON_MIN}–${REJECT_REASON_MAX} karakter).`}
        placeholder="Misal: Email ini bukan milik anggota tim kami."
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
        error={
          tried && !valid
            ? `Alasan wajib diisi, ${REJECT_REASON_MIN}–${REJECT_REASON_MAX} karakter (sekarang ${length}).`
            : undefined
        }
        maxLength={REJECT_REASON_MAX}
        autosize
        minRows={3}
        data-autofocus
      />
    </Stack>
  );
}
