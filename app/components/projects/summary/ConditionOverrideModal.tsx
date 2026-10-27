/** "Atur kondisi" dialog: a manager sets the project condition by hand, with a reason and an optional end day. */
import { Alert, Button, Group, Radio, Stack, Text, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { modals } from '@mantine/modals';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectCondition } from '@server/pm/enums';
import { OVERRIDE_REASON_MAX } from '@server/project/project.limits';
import { useState } from 'react';
import { describeApiError } from '~/lib/http';
import { CONDITION_LABELS } from '~/lib/pm-labels';
import { setConditionOverride } from '~/lib/project-deadline-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import {
  EMPTY_OVERRIDE,
  type OverrideValues,
  overrideBlocker,
  overrideReasonLength,
  toOverrideInput,
} from './condition-override';
import { OVERRIDE_CONDITIONS, OVERRIDE_COPY } from './summary.copy';
import { useRefreshProject } from './useRefreshProject';

const DATE_FORMAT = 'D MMMM YYYY';

type ViewProps = {
  today: IsoDate;
  values: OverrideValues;
  onChange: (patch: Partial<OverrideValues>) => void;
  blocker: string | null;
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

function ConditionChoice({ condition }: { condition: ProjectCondition }) {
  const { label, icon: Icon } = CONDITION_LABELS[condition];
  return (
    <Group gap="xs" wrap="nowrap" component="span" miw={0}>
      <Icon size="1.25em" aria-hidden />
      {label}
    </Group>
  );
}

/** The dialog body without state, so it renders the same in tests and in the app. */
export function ConditionOverrideView(p: ViewProps) {
  const { values, blocker } = p;
  const used = overrideReasonLength(values.reason);
  return (
    <Stack gap="sm">
      <Text size="sm">{OVERRIDE_COPY.intro}</Text>
      <Radio.Group
        label={OVERRIDE_COPY.condition}
        value={values.condition}
        onChange={(v) => p.onChange({ condition: v as ProjectCondition })}
      >
        <Stack gap="xs" mt="xs">
          {OVERRIDE_CONDITIONS.map((c) => (
            <Radio key={c} value={c} label={<ConditionChoice condition={c} />} />
          ))}
        </Stack>
      </Radio.Group>
      <Textarea
        label={OVERRIDE_COPY.reason}
        description={OVERRIDE_COPY.reasonHint}
        autosize
        minRows={3}
        value={values.reason}
        onChange={(e) => p.onChange({ reason: e.currentTarget.value })}
      />
      <Text size="xs" c={used > OVERRIDE_REASON_MAX ? 'danger' : 'dimmed'} ta="right">
        {OVERRIDE_COPY.counter(used, OVERRIDE_REASON_MAX)}
      </Text>
      <DateInput
        label={OVERRIDE_COPY.expires}
        description={OVERRIDE_COPY.expiresHint}
        placeholder={OVERRIDE_COPY.datePlaceholder}
        valueFormat={DATE_FORMAT}
        minDate={p.today}
        value={values.until}
        onChange={(until) => p.onChange({ until })}
        clearable
      />
      {p.error && (
        <Alert color="danger" role="alert">
          {p.error}
        </Alert>
      )}
      {blocker && (
        <Text size="sm" c="dimmed" id="override-blocker">
          {blocker}
        </Text>
      )}
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={p.onCancel} disabled={p.loading}>
          {OVERRIDE_COPY.cancel}
        </Button>
        <Button
          loading={p.loading}
          disabled={blocker !== null}
          aria-describedby={blocker ? 'override-blocker' : undefined}
          onClick={p.onSubmit}
        >
          {OVERRIDE_COPY.submit}
        </Button>
      </Group>
    </Stack>
  );
}

type FormProps = { projectId: string; today: IsoDate; onClose: () => void };

function ConditionOverrideForm({ projectId, today, onClose }: FormProps) {
  const [values, setValues] = useState<OverrideValues>(EMPTY_OVERRIDE);
  const [error, setError] = useState<string | null>(null);
  const refresh = useRefreshProject();
  const save = useApiMutation({
    mutationFn: (input: NonNullable<ReturnType<typeof toOverrideInput>>) =>
      setConditionOverride(projectId, input),
    successMessage: OVERRIDE_COPY.saved,
    errorTitle: OVERRIDE_COPY.failed,
    onSuccess: async () => {
      await refresh();
      onClose();
    },
    onError: (err) => setError(describeApiError(err)),
  });
  const input = toOverrideInput(values, today);
  return (
    <ConditionOverrideView
      today={today}
      values={values}
      onChange={(patch) => {
        setError(null);
        setValues((v) => ({ ...v, ...patch }));
      }}
      blocker={overrideBlocker(values, today)}
      error={error}
      loading={save.loading}
      onSubmit={() => input && void save.run(input)}
      onCancel={onClose}
    />
  );
}

/** Opens the dialog for one project; `today` is the server's day, so the end-day picker never starts in the past. */
export function openConditionOverrideModal(target: { projectId: string; today: IsoDate }) {
  const id = modals.open({
    title: OVERRIDE_COPY.title,
    children: <ConditionOverrideForm {...target} onClose={() => modals.close(id)} />,
  });
  return id;
}
