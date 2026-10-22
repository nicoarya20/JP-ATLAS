import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { INVITATION_TTL_DAYS } from '@server/account/limits';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { notify } from '~/components/ui/notify';
import { ROLE_LABEL } from '~/lib/admin-users-api';
import { type AdminInvitation, createInvitation, revokeInvitation } from '~/lib/invitations-api';

/** Create (no dialog: it is easy to undo) and revoke (confirm dialog) invitations with loading state and feedback. */
export function useInvitationActions() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-invitations'] });

  const create = useMutation({
    mutationFn: (a: { email: string; role: string }) => createInvitation(a.email, a.role),
    onSuccess: async (_r, a) => {
      await invalidate();
      notifications.show({
        color: 'teal',
        title: 'Undangan dibuat',
        message: `Saat ${a.email} masuk dengan Google, akunnya langsung disetujui sebagai ${ROLE_LABEL[a.role] ?? a.role}. Undangan berlaku ${INVITATION_TTL_DAYS} hari.`,
      });
    },
    onError: (e) => notify.fail('Gagal membuat undangan', e),
  });

  const revokeMutation = useMutation({
    mutationFn: (inv: AdminInvitation) => revokeInvitation(inv.id),
    onMutate: (inv) => setBusyId(inv.id),
    onSettled: () => setBusyId(null),
    onSuccess: async (_r, inv) => {
      await invalidate();
      notifications.show({ color: 'teal', message: `Undangan untuk ${inv.email} dicabut.` });
    },
    onError: (e) => notify.fail('Gagal mencabut undangan', e),
  });

  const revoke = (inv: AdminInvitation) =>
    modals.openConfirmModal({
      title: 'Cabut undangan?',
      children: (
        <Text size="sm">
          Undangan untuk <strong>{inv.email}</strong> tidak akan berlaku lagi. Kalau orangnya
          mendaftar sesudah ini, akunnya akan menunggu persetujuan seperti biasa. Kamu bisa membuat
          undangan baru kapan saja.
        </Text>
      ),
      labels: { confirm: 'Cabut undangan', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: () => revokeMutation.mutate(inv),
    });

  const createInvite = (email: string, role: string, onCreated: () => void) =>
    create.mutate({ email, role }, { onSuccess: onCreated });

  return { create: createInvite, creating: create.isPending, revoke, busyId };
}
