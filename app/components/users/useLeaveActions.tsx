/**
 * Availability actions of `/dashboard/users` (P14 CU-04): record a leave period, or end the one
 * under way. Composed into `useUserActions`, the way `useApprovalActions` is, so the row menu and
 * the detail drawer call the same two functions.
 *
 * Ending a leave deletes the row and does not put it in Sampah, so it is a T2 confirm dialog and
 * not a T1 undo toast (`CLAUDE.md`). Recording opens a dialog that owns its own write, because a
 * refusal (409 `LEAVE_OVERLAP`, 422) has to be fixed in the open form.
 */
import { Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { notify } from '~/components/ui/notify';
import { type AdminLeavePeriod, clearUserLeave, userLeaveKeyPrefix } from '~/lib/admin-leave-api';
import { formatLeaveRange } from '~/lib/leave-view';
import { type LeaveTarget, SetLeaveModalBody } from './SetLeaveForm';
import { END_LEAVE_COPY, SET_LEAVE_COPY } from './user-leave.copy';

/** `setLeave` opens the dialog; `endLeave` asks first, then deletes the period under way. */
export function useLeaveActions({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const clear = useMutation({
    mutationFn: (a: { user: LeaveTarget; running: AdminLeavePeriod }) => clearUserLeave(a.user.id),
    onMutate: (a) => setBusyId(a.user.id),
    onSettled: () => setBusyId(null),
    onSuccess: async (res, a) => {
      await qc.invalidateQueries({ queryKey: userLeaveKeyPrefix(a.user.id) });
      notify.success(
        END_LEAVE_COPY.done(
          a.user.name,
          formatLeaveRange(res.cleared.startDate, res.cleared.endDate),
        ),
      );
      onDone();
    },
    onError: (e) => notify.fail(END_LEAVE_COPY.failed, e),
  });

  /** Opens "Setel cuti"; the dialog reads the period under way itself and warns before replacing it. */
  const setLeave = (user: LeaveTarget) => {
    const id = modals.open({
      title: SET_LEAVE_COPY.title(user.name),
      children: <SetLeaveModalBody user={user} onClose={() => modals.close(id)} />,
    });
    return id;
  };

  const endLeave = (user: LeaveTarget, running: AdminLeavePeriod) =>
    modals.openConfirmModal({
      title: END_LEAVE_COPY.title(user.name),
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {END_LEAVE_COPY.impact(formatLeaveRange(running.startDate, running.endDate))}
          </Text>
          <Text size="sm" c="dimmed">
            {END_LEAVE_COPY.hint}
          </Text>
        </Stack>
      ),
      labels: { confirm: END_LEAVE_COPY.confirm, cancel: END_LEAVE_COPY.cancel },
      confirmProps: { color: 'danger' },
      onConfirm: () => clear.mutate({ user, running }),
    });

  return { setLeave, endLeave, busyId };
}
