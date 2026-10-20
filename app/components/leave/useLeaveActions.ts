/** The one-click leave writes of the settings page (cancel, approve) with their dialog, toast and refresh. */
import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { confirmAction } from '~/components/ui/confirmAction';
import {
  approveLeave,
  cancelLeave,
  type LeavePendingDto,
  type LeaveRequestDto,
} from '~/lib/leave-api';
import { formatLeaveRange } from '~/lib/leave-view';
import { useApiMutation } from '~/lib/use-api-mutation';
import { LEAVE_APPROVAL_COPY, LEAVE_CANCEL_COPY } from './leave.copy';

/** Cancelling asks first (T2): the dialog says what changes for colleagues; approving is a direct click. */
export function useLeaveActions() {
  const { revalidate } = useRevalidator();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const cancelMut = useApiMutation({
    mutationFn: (id: string) => cancelLeave(id),
    successMessage: LEAVE_CANCEL_COPY.done,
    errorTitle: LEAVE_CANCEL_COPY.failed,
    onSuccess: () => revalidate(),
    // A 409 means it was already decided or ended: the fresh state explains it better than the toast alone.
    onError: () => void revalidate(),
  });

  const approveMut = useApiMutation({
    mutationFn: (item: LeavePendingDto) => approveLeave(item.id),
    successMessage: (_d, item) => LEAVE_APPROVAL_COPY.approved(item.requester.name),
    errorTitle: LEAVE_APPROVAL_COPY.approveFailed,
    onSuccess: () => revalidate(),
    // Someone else may have decided first; reload so the card leaves the list.
    onError: () => void revalidate(),
  });

  return {
    cancelling: cancelMut.loading,
    approvingId,
    /** Asks for confirmation, then withdraws the request (pending) or the leave (approved). */
    askCancel(request: LeaveRequestDto) {
      const range = formatLeaveRange(request.startDate, request.endDate);
      const pending = request.status === 'pending';
      confirmAction({
        title: pending ? LEAVE_CANCEL_COPY.requestTitle : LEAVE_CANCEL_COPY.leaveTitle,
        body: pending ? LEAVE_CANCEL_COPY.requestBody(range) : LEAVE_CANCEL_COPY.leaveBody(range),
        confirmLabel: pending ? LEAVE_CANCEL_COPY.requestConfirm : LEAVE_CANCEL_COPY.leaveConfirm,
        danger: true,
        onConfirm: () => void cancelMut.run(request.id),
      });
    },
    async approve(item: LeavePendingDto) {
      setApprovingId(item.id);
      try {
        await approveMut.run(item);
      } finally {
        setApprovingId(null);
      }
    },
  };
}
