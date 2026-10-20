/** The leave write of the settings page (cancel) with its dialog, toast and refresh. */
import { useRevalidator } from 'react-router';
import { confirmAction } from '~/components/ui/confirmAction';
import { cancelLeave, type LeaveRequestDto } from '~/lib/leave-api';
import { formatLeaveRange } from '~/lib/leave-view';
import { useApiMutation } from '~/lib/use-api-mutation';
import { LEAVE_CANCEL_COPY } from './leave.copy';

/** Cancelling asks first (T2): the dialog says what changes for colleagues. */
export function useLeaveActions() {
  const { revalidate } = useRevalidator();

  const cancelMut = useApiMutation({
    mutationFn: (id: string) => cancelLeave(id),
    successMessage: LEAVE_CANCEL_COPY.done,
    errorTitle: LEAVE_CANCEL_COPY.failed,
    onSuccess: () => revalidate(),
    // A 409 means it was already decided or ended: the fresh state explains it better than the toast alone.
    onError: () => void revalidate(),
  });

  return {
    cancelling: cancelMut.loading,
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
  };
}
