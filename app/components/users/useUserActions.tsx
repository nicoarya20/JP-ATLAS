import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { normalizeRole, ROLES } from '@server/permissions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { notify } from '~/components/ui/notify';
import {
  type AdminUser,
  banUser,
  deleteUser,
  ROLE_LABEL,
  setUserRole,
  unbanUser,
} from '~/lib/admin-users-api';
import { authClient } from '~/lib/auth-client';
import { BanUserForm } from './BanUserForm';
import { useApprovalActions } from './useApprovalActions';

const roleLabel = (r: string) => ROLE_LABEL[r] ?? r;

/** Role / suspend / delete / impersonate / approve / reject with confirm dialogs, loading state and feedback. */
export function useUserActions({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const approvals = useApprovalActions({ onDone });
  const [busyId, setBusyId] = useState<string | null>(null);
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['admin-users'] }),
      qc.invalidateQueries({ queryKey: ['admin-users-stats'] }),
    ]);

  // Shared lifecycle for every mutation (hooks themselves stay at top level).
  const lifecycle = <TArgs,>(
    id: (a: TArgs) => string,
    success: (a: TArgs) => string,
    errTitle: string,
  ) => ({
    onMutate: (a: TArgs) => setBusyId(id(a)),
    onSettled: () => setBusyId(null),
    onSuccess: async (_r: unknown, a: TArgs) => {
      await invalidate();
      notifications.show({ color: 'teal', message: success(a) });
      onDone();
    },
    onError: (e: unknown) => notify.fail(errTitle, e),
  });

  const role = useMutation({
    mutationFn: (a: { user: AdminUser; role: string }) => setUserRole(a.user.id, a.role),
    ...lifecycle<{ user: AdminUser; role: string }>(
      (a) => a.user.id,
      (a) => `Peran ${a.user.name} diubah menjadi ${roleLabel(a.role)}.`,
      'Gagal mengubah peran',
    ),
  });
  const ban = useMutation({
    mutationFn: (a: { user: AdminUser; reason: string; expiresIn?: number }) =>
      banUser(a.user.id, a.reason, a.expiresIn),
    ...lifecycle<{ user: AdminUser; reason: string; expiresIn?: number }>(
      (a) => a.user.id,
      (a) =>
        `${a.user.name} diblokir${a.expiresIn ? ' sementara' : ' permanen'}. Semua sesinya sudah diakhiri.`,
      'Gagal memblokir user',
    ),
  });
  const unban = useMutation({
    mutationFn: (u: AdminUser) => unbanUser(u.id),
    ...lifecycle<AdminUser>(
      (u) => u.id,
      (u) => `Blokir ${u.name} dibuka.`,
      'Gagal membuka blokir',
    ),
  });
  const remove = useMutation({
    mutationFn: (u: AdminUser) => deleteUser(u.id),
    ...lifecycle<AdminUser>(
      (u) => u.id,
      (u) => `${u.name} dihapus permanen.`,
      'Gagal menghapus user',
    ),
  });

  const changeRole = (user: AdminUser, next: string) =>
    modals.openConfirmModal({
      title: `Ubah peran menjadi ${roleLabel(next)}?`,
      children: (
        <Text size="sm">
          <strong>{user.name}</strong> ({user.email}) akan menjadi{' '}
          <strong>{roleLabel(next)}</strong>.{' '}
          {next === 'admin'
            ? 'Admin bisa menyetujui pendaftar, mengundang orang, dan mengelola pengguna.'
            : normalizeRole(user.role) === ROLES.ADMIN
              ? 'Akses Admin dicabut segera.'
              : 'Hak aksesnya berubah segera.'}
        </Text>
      ),
      labels: { confirm: `Jadikan ${roleLabel(next)}`, cancel: 'Batal' },
      confirmProps: { color: next === 'admin' ? 'blue' : 'orange' },
      onConfirm: () => role.mutate({ user, role: next }),
    });

  const banWithForm = (user: AdminUser) => {
    const id = modals.open({
      title: `Blokir ${user.name}?`,
      children: (
        <BanUserForm
          user={user}
          onCancel={() => modals.close(id)}
          onSubmit={(reason, expiresIn) => {
            modals.close(id);
            ban.mutate({ user, reason, expiresIn });
          }}
        />
      ),
    });
  };

  const unbanConfirm = (user: AdminUser) =>
    modals.openConfirmModal({
      title: 'Buka blokir?',
      children: (
        <Text size="sm">
          <strong>{user.name}</strong> bisa masuk kembali segera setelah blokir dibuka.
        </Text>
      ),
      labels: { confirm: 'Buka blokir', cancel: 'Batal' },
      onConfirm: () => unban.mutate(user),
    });

  const removeConfirm = (user: AdminUser) =>
    modals.openConfirmModal({
      title: 'Hapus user permanen?',
      children: (
        <Text size="sm">
          <strong>{user.name}</strong> ({user.email}) beserta sesi dan akun tertautnya akan dihapus
          permanen. Tindakan ini tidak bisa dibatalkan. Pertimbangkan memblokir bila hanya ingin
          menutup akses.
        </Text>
      ),
      labels: { confirm: 'Hapus permanen', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: () => remove.mutate(user),
    });

  const impersonate = (user: AdminUser) =>
    modals.openConfirmModal({
      title: `Masuk sebagai ${user.name}?`,
      children: (
        <Text size="sm">
          Anda akan melihat aplikasi persis seperti user ini selama 1 jam. Tindakan tercatat di
          login log sebagai impersonasi. Gunakan tombol "Berhenti impersonasi" di sidebar untuk
          kembali.
        </Text>
      ),
      labels: { confirm: 'Masuk sebagai user', cancel: 'Batal' },
      onConfirm: async () => {
        setBusyId(user.id);
        const { error } = await authClient.admin.impersonateUser({ userId: user.id });
        setBusyId(null);
        if (error)
          return notify.fail('Impersonasi gagal', new Error(error.message ?? 'Ditolak server'));
        // Land on /go so the impersonated user's role decides their home.
        window.location.assign('/go');
      },
    });

  return {
    changeRole,
    banWithForm,
    unbanConfirm,
    removeConfirm,
    impersonate,
    approve: approvals.approve,
    reject: approvals.reject,
    busyId: busyId ?? approvals.busyId,
  };
}
