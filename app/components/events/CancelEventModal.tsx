/**
 * "Batalkan acara" dialog (S7 E-11, T2): a required reason, a plain note that every guest is told,
 * a spinning confirm button and the server's error inside the dialog, so the typed reason survives
 * a failed try. Built on `modals.open` like the shared reason dialog, because that one labels its
 * field "Catatan" and the guests read this text as the reason.
 */
import { Alert, Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { modals } from '@mantine/modals';
import { EVENT_CANCEL_REASON_MAX } from '@server/event/events.dto';
import { useState } from 'react';
import { CANCEL_LABEL } from '~/components/ui/confirmAction';
import { describeApiError } from '~/lib/http';
import { ACTION_COPY } from './event-detail.copy';

/** The message to show when the reason cannot be sent yet, or null; the server also refuses an empty one. */
export const cancelReasonProblem = (reason: string): string | null =>
  reason.trim() === '' ? ACTION_COPY.reasonRequired : null;

type FormProps = {
  /** Sends the trimmed reason; a throw keeps the dialog open and is shown inside it. */
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
};

export function CancelEventForm({ onSubmit, onClose }: FormProps) {
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const missing = cancelReasonProblem(reason);
    setProblem(missing);
    setFailure(null);
    if (missing) return;
    setLoading(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (error) {
      setFailure(describeApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="sm">
      <Text size="sm">{ACTION_COPY.cancelDescription}</Text>
      <Textarea
        label={ACTION_COPY.reasonLabel}
        required
        autosize
        minRows={3}
        maxLength={EVENT_CANCEL_REASON_MAX}
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
        error={problem}
        data-autofocus
      />
      {failure && (
        <Alert color="danger" role="alert">
          {failure}
        </Alert>
      )}
      <Group justify="flex-end" wrap="wrap" gap="xs">
        <Button variant="default" onClick={onClose} disabled={loading}>
          {CANCEL_LABEL}
        </Button>
        <Button color="danger" loading={loading} onClick={submit}>
          {ACTION_COPY.cancelConfirm}
        </Button>
      </Group>
    </Stack>
  );
}

/** Opens the dialog; `onSubmit` receives the trimmed reason. */
export function openCancelEventModal(onSubmit: FormProps['onSubmit']) {
  const id = modals.open({
    title: ACTION_COPY.cancelTitle,
    children: <CancelEventForm onSubmit={onSubmit} onClose={() => modals.close(id)} />,
  });
  return id;
}
