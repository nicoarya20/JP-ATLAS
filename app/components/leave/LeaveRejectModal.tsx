/** "Tolak cuti" dialog: an optional reason the requester will read; refusals from the server stay inside it. */
import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { LEAVE_REJECT_REASON_MAX } from '@server/leave/leave.dto';
import { useState } from 'react';
import { notify } from '~/components/ui/notify';
import { describeApiError } from '~/lib/http';
import { type LeavePendingDto, rejectLeave } from '~/lib/leave-api';
import { formatLeaveRange } from '~/lib/leave-view';
import { LEAVE_REJECT_COPY } from './leave.copy';

type ViewProps = {
  item: LeavePendingDto;
  reason: string;
  error: string | null;
  loading: boolean;
  onReason: (reason: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

/** The dialog body without state, so it renders the same in tests and in the app. */
export function LeaveRejectView(p: ViewProps) {
  const tooLong = p.reason.length > LEAVE_REJECT_REASON_MAX;
  return (
    <Stack gap="sm">
      <Text size="sm">
        {`${p.item.requester.name}, ${formatLeaveRange(p.item.startDate, p.item.endDate)}. `}
        {LEAVE_REJECT_COPY.impact}
      </Text>
      <Textarea
        label={LEAVE_REJECT_COPY.reason}
        placeholder={LEAVE_REJECT_COPY.reasonPlaceholder}
        autosize
        minRows={2}
        value={p.reason}
        onChange={(e) => p.onReason(e.currentTarget.value)}
        error={tooLong ? LEAVE_REJECT_COPY.tooLong(LEAVE_REJECT_REASON_MAX) : undefined}
      />
      <Text size="xs" c={tooLong ? 'danger' : 'dimmed'} ta="right">
        {LEAVE_REJECT_COPY.counter(p.reason.length, LEAVE_REJECT_REASON_MAX)}
      </Text>
      {p.error && (
        <Alert color="danger" role="alert">
          {p.error}
        </Alert>
      )}
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={p.onCancel} disabled={p.loading}>
          {LEAVE_REJECT_COPY.cancel}
        </Button>
        <Button color="danger" loading={p.loading} disabled={tooLong} onClick={p.onSubmit}>
          {LEAVE_REJECT_COPY.submit}
        </Button>
      </Group>
    </Stack>
  );
}

type FormProps = { item: LeavePendingDto; onClose: () => void; onDone: () => void };

function LeaveRejectForm({ item, onClose, onDone }: FormProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      await rejectLeave(item.id, reason.trim() === '' ? null : reason.trim());
      notify.success(LEAVE_REJECT_COPY.done(item.requester.name));
      onDone();
      onClose();
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LeaveRejectView
      item={item}
      reason={reason}
      error={error}
      loading={loading}
      onReason={(r) => {
        setError(null);
        setReason(r);
      }}
      onSubmit={() => void send()}
      onCancel={onClose}
    />
  );
}

type ModalProps = { item: LeavePendingDto | null; onClose: () => void; onDone: () => void };

/** Open while `item` is set; the form unmounts on close, so the next rejection starts with an empty reason. */
export function LeaveRejectModal({ item, onClose, onDone }: ModalProps) {
  return (
    <Modal
      opened={item !== null}
      onClose={onClose}
      title={item ? LEAVE_REJECT_COPY.title(item.requester.name) : ''}
      centered
    >
      {item && <LeaveRejectForm item={item} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}
