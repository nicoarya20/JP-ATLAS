/** Modal to add or edit a milestone: title, date and, when the project has phases, an optional phase. */
import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { MILESTONE_TITLE_MAX } from '@server/project/project.limits';
import type { MilestoneDto, PhaseDto } from '@server/project/project-plan.dto';
import { MILESTONE_FORM_COPY as COPY } from './plan.copy';
import {
  emptyMilestoneValues,
  type MilestoneFormValues,
  milestoneValues,
  validateMilestone,
} from './plan-form';

const DATE_FORMAT = 'D MMMM YYYY';

type Props = {
  opened: boolean;
  /** The milestone being edited, or null to add a new one. */
  milestone: MilestoneDto | null;
  phases: readonly PhaseDto[];
  loading: boolean;
  onClose: () => void;
  /** Resolves true when saved, so the modal can close. */
  onSubmit: (values: MilestoneFormValues) => Promise<boolean>;
};

export function MilestoneFormBody({
  milestone,
  phases,
  loading,
  onClose,
  onSubmit,
}: Omit<Props, 'opened'>) {
  const form = useForm<MilestoneFormValues>({
    mode: 'uncontrolled',
    initialValues: milestone ? milestoneValues(milestone) : emptyMilestoneValues(),
    validate: validateMilestone,
  });
  const submit = form.onSubmit(async (values) => {
    if (await onSubmit(values)) onClose();
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <TextInput
          label={COPY.titleLabel}
          placeholder={COPY.titlePlaceholder}
          withAsterisk
          maxLength={MILESTONE_TITLE_MAX}
          data-autofocus
          key={form.key('title')}
          {...form.getInputProps('title')}
        />
        <DateInput
          label={COPY.dueDate}
          placeholder={COPY.datePlaceholder}
          valueFormat={DATE_FORMAT}
          withAsterisk
          clearable
          key={form.key('dueDate')}
          {...form.getInputProps('dueDate')}
        />
        {phases.length > 0 && (
          <Select
            label={COPY.phase}
            placeholder={COPY.phasePlaceholder}
            data={phases.map((p) => ({ value: p.id, label: p.name }))}
            clearable
            key={form.key('phaseId')}
            {...form.getInputProps('phaseId')}
          />
        )}
        <Group justify="flex-end" gap="xs" wrap="wrap">
          <Button variant="default" onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="submit" loading={loading}>
            {milestone ? COPY.editSubmit : COPY.createSubmit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function MilestoneForm({ opened, ...body }: Props) {
  return (
    <Modal
      opened={opened}
      onClose={body.onClose}
      title={body.milestone ? COPY.editTitle : COPY.createTitle}
    >
      {/* Keyed by milestone so reopening for another one starts from its own values. */}
      <MilestoneFormBody key={body.milestone?.id ?? 'new'} {...body} />
    </Modal>
  );
}
