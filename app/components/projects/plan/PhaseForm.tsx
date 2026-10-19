/** Modal to add or edit a phase: name, description, start and end date (and status when editing). */
import {
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { PHASE_STATUSES } from '@server/pm/enums';
import { PHASE_DESCRIPTION_MAX, PHASE_NAME_MAX } from '@server/project/project.limits';
import type { PhaseDto } from '@server/project/project-plan.dto';
import { PHASE_FORM_COPY as COPY, PHASE_STATUS_LABELS } from './plan.copy';
import { emptyPhaseValues, type PhaseFormValues, phaseValues, validatePhase } from './plan-form';

const DATE_FORMAT = 'D MMMM YYYY';
const STATUS_OPTIONS = PHASE_STATUSES.map((s) => ({ value: s, label: PHASE_STATUS_LABELS[s] }));

type Props = {
  opened: boolean;
  /** The phase being edited, or null to add a new one. */
  phase: PhaseDto | null;
  loading: boolean;
  onClose: () => void;
  /** Resolves true when saved, so the modal can close. */
  onSubmit: (values: PhaseFormValues, initial: PhaseFormValues) => Promise<boolean>;
};

export function PhaseFormBody({ phase, loading, onClose, onSubmit }: Omit<Props, 'opened'>) {
  const initial = phase ? phaseValues(phase) : emptyPhaseValues();
  const form = useForm<PhaseFormValues>({
    mode: 'uncontrolled',
    initialValues: initial,
    validate: validatePhase,
  });
  const submit = form.onSubmit(async (values) => {
    if (await onSubmit(values, initial)) onClose();
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <TextInput
          label={COPY.name}
          placeholder={COPY.namePlaceholder}
          withAsterisk
          maxLength={PHASE_NAME_MAX}
          data-autofocus
          key={form.key('name')}
          {...form.getInputProps('name')}
        />
        <Textarea
          label={COPY.description}
          autosize
          minRows={2}
          maxLength={PHASE_DESCRIPTION_MAX}
          key={form.key('description')}
          {...form.getInputProps('description')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <DateInput
            label={COPY.startDate}
            placeholder={COPY.datePlaceholder}
            valueFormat={DATE_FORMAT}
            clearable
            key={form.key('startDate')}
            {...form.getInputProps('startDate')}
          />
          <DateInput
            label={COPY.endDate}
            placeholder={COPY.datePlaceholder}
            valueFormat={DATE_FORMAT}
            clearable
            key={form.key('endDate')}
            {...form.getInputProps('endDate')}
          />
        </SimpleGrid>
        {phase && (
          <Select
            label={COPY.status}
            data={STATUS_OPTIONS}
            allowDeselect={false}
            key={form.key('status')}
            {...form.getInputProps('status')}
          />
        )}
        <Group justify="flex-end" gap="xs" wrap="wrap">
          <Button variant="default" onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="submit" loading={loading}>
            {phase ? COPY.editSubmit : COPY.createSubmit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function PhaseForm({ opened, ...body }: Props) {
  return (
    <Modal
      opened={opened}
      onClose={body.onClose}
      title={body.phase ? COPY.editTitle : COPY.createTitle}
    >
      {/* Keyed by phase so reopening for another one starts from its own values. */}
      <PhaseFormBody key={body.phase?.id ?? 'new'} {...body} />
    </Modal>
  );
}
