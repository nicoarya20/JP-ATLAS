/** "Ajukan cuti" dialog (wireframe 09 screen 3): a date range and a note; server refusals stay inside it. */
import { Alert, Button, Group, Modal, SimpleGrid, Stack, Text, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useState } from 'react';
import { notify } from '~/components/ui/notify';
import { describeApiError } from '~/lib/http';
import { type LeaveApprovers, submitLeave } from '~/lib/leave-api';
import {
  approversHint,
  type LeaveFormValues,
  leaveFormBlocker,
  submitLabel,
  toLeaveInput,
} from '~/lib/leave-view';
import { LEAVE_FORM_COPY } from './leave.copy';

const DATE_FORMAT = 'D MMMM YYYY';
const EMPTY: LeaveFormValues = { from: null, to: null, note: '' };

type ViewProps = {
  values: LeaveFormValues;
  today: string;
  approvers: LeaveApprovers;
  autoApproves: boolean;
  /** Why the send button is off, or null when ready. */
  blocker: string | null;
  /** The last refusal from the server, in plain words. */
  error: string | null;
  loading: boolean;
  onChange: (patch: Partial<LeaveFormValues>) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

/** The form without state or modal chrome, so it renders the same in tests and in the app. */
export function LeaveRequestView(p: ViewProps) {
  const { values, today } = p;
  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        <DateInput
          label={LEAVE_FORM_COPY.from}
          placeholder={LEAVE_FORM_COPY.datePlaceholder}
          valueFormat={DATE_FORMAT}
          minDate={today}
          value={values.from}
          onChange={(from) => p.onChange({ from })}
        />
        <DateInput
          label={LEAVE_FORM_COPY.to}
          placeholder={LEAVE_FORM_COPY.datePlaceholder}
          valueFormat={DATE_FORMAT}
          minDate={values.from && values.from > today ? values.from : today}
          value={values.to}
          onChange={(to) => p.onChange({ to })}
        />
      </SimpleGrid>
      <Textarea
        label={LEAVE_FORM_COPY.note}
        placeholder={LEAVE_FORM_COPY.notePlaceholder}
        autosize
        minRows={2}
        value={values.note}
        onChange={(e) => p.onChange({ note: e.currentTarget.value })}
      />
      <Text size="sm" c="dimmed">
        {approversHint(p.approvers)}
      </Text>
      {p.error && (
        <Alert color="danger" role="alert">
          {p.error}
        </Alert>
      )}
      {p.blocker && (
        <Text size="sm" c="dimmed" id="leave-blocker">
          {p.blocker}
        </Text>
      )}
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={p.onCancel} disabled={p.loading}>
          {LEAVE_FORM_COPY.cancel}
        </Button>
        <Button
          loading={p.loading}
          disabled={p.blocker !== null}
          aria-describedby={p.blocker ? 'leave-blocker' : undefined}
          onClick={p.onSubmit}
        >
          {submitLabel(p.autoApproves)}
        </Button>
      </Group>
    </Stack>
  );
}

type FormProps = Pick<ViewProps, 'today' | 'approvers' | 'autoApproves'> & {
  onClose: () => void;
  /** Runs after a saved request, to refresh the page data. */
  onSaved: () => void;
};

function LeaveRequestForm({ today, approvers, autoApproves, onClose, onSaved }: FormProps) {
  const [values, setValues] = useState<LeaveFormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const input = toLeaveInput(values, today);

  const change = (patch: Partial<LeaveFormValues>) => {
    setError(null);
    setValues((v) => {
      const next = { ...v, ...patch };
      // Moving the start past the end drags the end along instead of leaving an impossible range.
      return next.from && next.to && next.to < next.from ? { ...next, to: next.from } : next;
    });
  };

  const send = async () => {
    if (!input) return;
    setLoading(true);
    try {
      await submitLeave(input);
      notify.success(autoApproves ? LEAVE_FORM_COPY.saved : LEAVE_FORM_COPY.sent);
      onSaved();
      onClose();
    } catch (err) {
      // Kept inside the dialog with the fields untouched, so the person fixes the dates and sends again.
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LeaveRequestView
      values={values}
      today={today}
      approvers={approvers}
      autoApproves={autoApproves}
      blocker={leaveFormBlocker(values, today)}
      error={error}
      loading={loading}
      onChange={change}
      onSubmit={() => void send()}
      onCancel={onClose}
    />
  );
}

type ModalProps = FormProps & { opened: boolean };

/** The dialog; its form unmounts on close, so a reopened dialog starts empty. */
export function LeaveRequestModal({ opened, onClose, ...form }: ModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={LEAVE_FORM_COPY.title} centered>
      <LeaveRequestForm {...form} onClose={onClose} />
    </Modal>
  );
}
