/** The leave approval card: "Setujui" asks first (T2), "Tolak" opens the reason dialog; both close the card. */
import { useState } from 'react';
import type { LeaveRejectTarget } from '~/components/leave/LeaveRejectModal';
import { confirmAction } from '~/components/ui/confirmAction';
import type { InboxItem } from '~/lib/inbox-api';
import { leaveRangeOf } from '~/lib/inbox-view';
import { approveLeave } from '~/lib/leave-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { INBOX_LEAVE_COPY } from './inbox.copy';

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/** The request a leave card stands for: the id is the card's ref, name and dates come from its payload snapshot. */
export function leaveTargetOf(item: InboxItem): LeaveRejectTarget {
  return {
    id: item.ref.id,
    name: text(item.payload.name),
    startDate: text(item.payload.startDate),
    endDate: text(item.payload.endDate),
  };
}

export function useInboxLeave(refresh: () => void) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<LeaveRejectTarget | null>(null);

  const approveMut = useApiMutation({
    mutationFn: (target: LeaveRejectTarget) => approveLeave(target.id),
    successMessage: (_d, target) => INBOX_LEAVE_COPY.approved(target.name),
    errorTitle: INBOX_LEAVE_COPY.approveFailed,
    onSuccess: refresh,
    // Someone else may have decided first (409): reload so the card leaves the queue.
    onError: refresh,
  });

  const send = async (card: InboxItem, target: LeaveRejectTarget) => {
    setApprovingId(card.id);
    try {
      await approveMut.run(target);
    } finally {
      setApprovingId(null);
    }
  };

  return {
    approvingId,
    rejecting,
    closeReject: () => setRejecting(null),
    reject: (card: InboxItem) => setRejecting(leaveTargetOf(card)),
    approve(card: InboxItem) {
      const target = leaveTargetOf(card);
      confirmAction({
        title: INBOX_LEAVE_COPY.approveTitle(target.name),
        body: INBOX_LEAVE_COPY.approveBody(leaveRangeOf(card) ?? ''),
        confirmLabel: INBOX_LEAVE_COPY.approveConfirm,
        onConfirm: () => void send(card, target),
      });
    },
  };
}
