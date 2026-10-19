/** "Perpanjang tenggat" dialog: a later due date, a reason category and a written reason (S5). */
import { Alert, Button, Group, Select, Stack, Text, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { modals } from '@mantine/modals';
import type { IsoDate } from '@server/metrics/types';
import { EXTENSION_REASON_CATEGORIES, type ExtensionReasonCategory } from '@server/pm/enums';
import { EXTENSION_REASON_MAX } from '@server/project/project.limits';
import { useState } from 'react';
import { formatCalendarDate } from '~/components/ui/DateText';
import { describeApiError } from '~/lib/http';
import { extendProjectDeadline } from '~/lib/project-deadline-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { quickDueDate } from '../QuickDates';
import {
  EMPTY_EXTEND,
  EXTEND_QUICK,
  type ExtendValues,
  extendBlocker,
  reasonLength,
  toExtendInput,
} from './extend-deadline';
import { EXTEND_CATEGORY_LABELS, EXTEND_COPY } from './summary.copy';
import { useRefreshProject } from './useRefreshProject';

const DATE_FORMAT = 'D MMMM YYYY';
const CATEGORY_OPTIONS = EXTENSION_REASON_CATEGORIES.map((value) => ({
  value,
  label: EXTEND_CATEGORY_LABELS[value],
}));

type ViewProps = {
  currentDue: IsoDate;
  values: ExtendValues;
  onChange: (patch: Partial<ExtendValues>) => void;
  /** Why the button is off, or null when ready. */
  blocker: string | null;
  /** The last failed send, in plain words. */
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

/** The dialog body without state, so it renders the same in tests and in the app. */
export function ExtendDeadlineView(p: ViewProps) {
  const { values, currentDue, blocker } = p;
  const used = reasonLength(values.reason);
  return (
    <Stack gap="sm">
      <Text size="sm">
        {`${EXTEND_COPY.current}: `}
        <Text span fw={600}>
          {formatCalendarDate(currentDue)}
        </Text>
      </Text>
      <DateInput
        label={EXTEND_COPY.newDate}
        placeholder={EXTEND_COPY.datePlaceholder}
        valueFormat={DATE_FORMAT}
        minDate={currentDue}
        value={values.newDueDate}
        onChange={(newDueDate) => p.onChange({ newDueDate })}
        clearable
      />
      <div>
        <Text size="sm" c="dimmed" mb={6} id="extend-quick-label">
          {EXTEND_COPY.quickLabel}
        </Text>
        <Group gap="xs" wrap="wrap" role="group" aria-labelledby="extend-quick-label">
          {EXTEND_QUICK.map(({ range, label }) => (
            <Button
              key={range}
              variant="default"
              onClick={() => p.onChange({ newDueDate: quickDueDate(currentDue, range) })}
            >
              {label}
            </Button>
          ))}
        </Group>
      </div>
      <Select
        label={EXTEND_COPY.category}
        placeholder={EXTEND_COPY.categoryPlaceholder}
        data={CATEGORY_OPTIONS}
        value={values.category}
        onChange={(v) => p.onChange({ category: v as ExtensionReasonCategory | null })}
        allowDeselect={false}
      />
      <Textarea
        label={EXTEND_COPY.reason}
        description={EXTEND_COPY.reasonHint}
        autosize
        minRows={3}
        value={values.reason}
        onChange={(e) => p.onChange({ reason: e.currentTarget.value })}
      />
      <Text size="xs" c={used > EXTENSION_REASON_MAX ? 'danger' : 'dimmed'} ta="right">
        {EXTEND_COPY.counter(used, EXTENSION_REASON_MAX)}
      </Text>
      {p.error && (
        <Alert color="danger" role="alert">
          {p.error}
        </Alert>
      )}
      {/* The reason sits next to the off button, so nobody has to guess what is missing. */}
      {blocker && (
        <Text size="sm" c="dimmed" id="extend-blocker">
          {blocker}
        </Text>
      )}
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={p.onCancel} disabled={p.loading}>
          {EXTEND_COPY.cancel}
        </Button>
        <Button
          loading={p.loading}
          disabled={blocker !== null}
          aria-describedby={blocker ? 'extend-blocker' : undefined}
          onClick={p.onSubmit}
        >
          {EXTEND_COPY.submit}
        </Button>
      </Group>
    </Stack>
  );
}

type FormProps = { projectId: string; currentDue: IsoDate; onClose: () => void };

function ExtendDeadlineForm({ projectId, currentDue, onClose }: FormProps) {
  const [values, setValues] = useState<ExtendValues>(EMPTY_EXTEND);
  const [error, setError] = useState<string | null>(null);
  const refresh = useRefreshProject();
  const extend = useApiMutation({
    mutationFn: (input: NonNullable<ReturnType<typeof toExtendInput>>) =>
      extendProjectDeadline(projectId, input),
    successMessage: (_d, input) => EXTEND_COPY.saved(formatCalendarDate(input.newDueDate)),
    errorTitle: EXTEND_COPY.failed,
    onSuccess: async () => {
      await refresh();
      onClose();
    },
    onError: (err) => setError(describeApiError(err)),
  });
  const blocker = extendBlocker(values, currentDue);
  const input = toExtendInput(values, currentDue);
  return (
    <ExtendDeadlineView
      currentDue={currentDue}
      values={values}
      onChange={(patch) => {
        setError(null);
        setValues((v) => ({ ...v, ...patch }));
      }}
      blocker={blocker}
      error={error}
      loading={extend.loading}
      onSubmit={() => input && void extend.run(input)}
      onCancel={onClose}
    />
  );
}

/** Opens the dialog for one project; `currentDue` is the due date the page shows now. */
export function openExtendDeadlineModal(target: { projectId: string; currentDue: IsoDate }) {
  const id = modals.open({
    title: EXTEND_COPY.title,
    children: <ExtendDeadlineForm {...target} onClose={() => modals.close(id)} />,
  });
  return id;
}
