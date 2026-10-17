/**
 * "Tampilkan lebih banyak" of the task form: Deskripsi, Jenis, Tanggal mulai and, when creating,
 * Langkah awal. Tag, Perlu diperiksa, Estimasi and Tahapan wait for S4-S5 (P3 §2 Tugas ⑥).
 */
import {
  ActionIcon,
  Button,
  Group,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import type { UseFormReturnType } from '@mantine/form';
import {
  TASK_CHECKLIST_INITIAL_MAX,
  TASK_CHECKLIST_TEXT_MAX,
  TASK_DESCRIPTION_MAX,
} from '@server/task/task.limits';
import type { TaskFormKind } from '@server/task/task-form.query';
import type { KeyboardEvent } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import type { TaskFormValues } from './task-form';
import { TASK_FORM_COPY as COPY } from './task-form.copy';

export const TASK_DATE_FORMAT = 'D MMMM YYYY';

type Props = {
  form: UseFormReturnType<TaskFormValues>;
  kinds: TaskFormKind[];
  /** Initial steps are a create-only field; later steps are added on the task detail. */
  withSteps: boolean;
};

export function TaskFormMore({ form, kinds, withSteps }: Props) {
  const steps = form.getValues().steps;
  const full = steps.length >= TASK_CHECKLIST_INITIAL_MAX;
  const addStep = () => {
    if (!full) form.insertListItem('steps', '');
  };
  // Enter in a step adds the next one instead of saving the whole form half-filled.
  const onStepKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addStep();
  };

  return (
    <Stack gap="md">
      <Textarea
        label={COPY.descriptionLabel}
        description={COPY.descriptionHint}
        autosize
        minRows={3}
        maxLength={TASK_DESCRIPTION_MAX}
        key={form.key('description')}
        {...form.getInputProps('description')}
      />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Select
          label={COPY.kind}
          data={kinds.map((k) => ({ value: k.id, label: k.name }))}
          allowDeselect={false}
          disabled={kinds.length === 0}
          key={form.key('kindId')}
          {...form.getInputProps('kindId')}
        />
        <DateInput
          label={COPY.startDate}
          placeholder={COPY.datePlaceholder}
          valueFormat={TASK_DATE_FORMAT}
          clearable
          key={form.key('startDate')}
          {...form.getInputProps('startDate')}
        />
      </SimpleGrid>
      {withSteps && (
        <Input.Wrapper label={COPY.steps} description={COPY.stepsHint} error={form.errors.steps}>
          <Stack gap="xs" mt="xs">
            {steps.map((_, i) => (
              // nowrap is safe: the input shrinks (minWidth 0) beside one icon button.
              <Group key={form.key(`steps.${i}`)} gap="xs" wrap="nowrap" align="flex-start">
                <TextInput
                  aria-label={COPY.stepLabel(i + 1)}
                  placeholder={COPY.stepPlaceholder}
                  maxLength={TASK_CHECKLIST_TEXT_MAX}
                  style={{ flex: 1, minWidth: 0 }}
                  onKeyDown={onStepKey}
                  {...form.getInputProps(`steps.${i}`)}
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={COPY.removeStep(i + 1)}
                  onClick={() => form.removeListItem('steps', i)}
                  style={{ flexShrink: 0 }}
                >
                  <FiX size="1.25em" aria-hidden />
                </ActionIcon>
              </Group>
            ))}
            <Group gap="xs" wrap="wrap">
              <Button
                variant="default"
                leftSection={<FiPlus size="1.25em" aria-hidden />}
                onClick={addStep}
                disabled={full}
              >
                {COPY.addStep}
              </Button>
              {full && (
                <Input.Description>{COPY.stepsFull(TASK_CHECKLIST_INITIAL_MAX)}</Input.Description>
              )}
            </Group>
          </Stack>
        </Input.Wrapper>
      )}
    </Stack>
  );
}
