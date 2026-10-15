import { Select, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import type { Role } from '@server/permissions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type AdminUser, approveUser, ROLE_LABEL, rejectUser } from '~/lib/admin-users-api';
import { notifyError } from '~/lib/notify';
import { type RejectHandle, RejectReasonForm } from './RejectReasonForm';

const roleLabel = (r: string) => ROLE_LABEL[r] ?? r;

/** Role picker inside the approve dialog; reports the choice through `onChange` (the dialog owns no state). */
function ApproveRoleSelect(props: {
  roles: Role[];
  initial: Role;
  onChange: (role: Role) => void;
}) {
  const [value, setValue] = useState<string>(props.initial);
  return (
    <Select
      label="Peran di aplikasi"
      description="Bisa diubah lagi nanti dari daftar pengguna."
      value={value}
      onChange={(v) => {
        if (!v) return;
        setValue(v);
        props.onChange(v as Role);
      }}
      data={props.roles.map((r) => ({ value: r, label: roleLabel(r) }))}
      allowDeselect={false}
    />
  );
}

/** Approve (choose a role) and reject (reason required) with confirm dialogs, loading state and feedback. */
export function useApprovalActions({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['admin-users'] }),
      qc.invalidateQueries({ queryKey: ['admin-users-stats'] }),
    ]);

  const approveMutation = useMutation({
    mutationFn: (a: { user: AdminUser; role: Role }) => approveUser(a.user.id, a.role),
    onMutate: (a) => setBusyId(a.user.id),
    onSettled: () => setBusyId(null),
    onSuccess: async (_r, a) => {
      await invalidate();
      notifications.show({
        color: 'teal',
        message: `${a.user.name} disetujui sebagai ${roleLabel(a.role)}. Orangnya bisa langsung masuk.`,
      });
      onDone();
    },
    onError: (e) => notifyError('Gagal menyetujui akun', e),
  });
  const rejectMutation = useMutation({
    mutationFn: (a: { user: AdminUser; reason: string }) => rejectUser(a.user.id, a.reason),
    onMutate: (a) => setBusyId(a.user.id),
    onSettled: () => setBusyId(null),
    onSuccess: async (_r, a) => {
      await invalidate();
      notifications.show({
        color: 'teal',
        message: `Pendaftaran ${a.user.name} ditolak. Alasannya ditampilkan kepada orangnya.`,
      });
      onDone();
    },
    onError: (e) => notifyError('Gagal menolak pendaftaran', e),
  });

  /** `roles` are the roles this actor may grant to the account (from `userAccess`). */
  const approve = (user: AdminUser, roles: Role[]) => {
    if (roles.length === 0) return;
    const current = roles.find((r) => r === user.role);
    const initial = current ?? roles[0];
    let chosen: Role = initial;
    modals.openConfirmModal({
      title: `Setujui ${user.name}?`,
      children: (
        <>
          <Text size="sm" mb="sm">
            <strong>{user.name}</strong> ({user.email}) akan bisa masuk dan memakai aplikasi
            sekarang juga.
          </Text>
          <ApproveRoleSelect roles={roles} initial={initial} onChange={(r) => (chosen = r)} />
        </>
      ),
      labels: { confirm: 'Setujui akun', cancel: 'Batal' },
      confirmProps: { color: 'teal' },
      onConfirm: () => approveMutation.mutate({ user, role: chosen }),
    });
  };

  const reject = (user: AdminUser) => {
    const handle: RejectHandle = { current: null };
    // Stays open on an unusable reason: the form shows the error and the person fixes it in place.
    const id = modals.openConfirmModal({
      title: `Tolak pendaftaran ${user.name}?`,
      children: <RejectReasonForm user={user} handle={handle} />,
      labels: { confirm: 'Tolak pendaftaran', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      closeOnConfirm: false,
      onConfirm: () => {
        const reason = handle.current?.();
        if (!reason) return;
        modals.close(id);
        rejectMutation.mutate({ user, reason });
      },
    });
  };

  return { approve, reject, busyId };
}
