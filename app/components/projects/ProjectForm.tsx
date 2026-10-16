/** New project form (④): uncontrolled fields, limits shared with the write route, members kept beside the form. */
import {
  Button,
  Group,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import type { IsoDate } from '@server/metrics/types';
import { PROJECT_PRIORITIES, type ProjectPriority } from '@server/pm/enums';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_INITIAL_STATUSES,
  PROJECT_NAME_MAX,
  type ProjectInitialStatus,
} from '@server/project/project.limits';
import { useState } from 'react';
import { Link } from 'react-router';
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import type { ProjectCreateInput } from '~/lib/projects-api';
import { useUnsavedGuard } from '~/lib/use-unsaved-guard';
import { MemberPicker, type PickedMember } from './MemberPicker';
import { FORM_COPY } from './projects.copy';
import { QuickDates, quickDueDate } from './QuickDates';

export type ProjectFormValues = {
  name: string;
  description: string;
  status: ProjectInitialStatus;
  priority: ProjectPriority;
  leadId: string;
  startDate: string | null;
  dueDate: string | null;
};

/** What a failed submit hands back: field messages keyed by form field (from the 422 `issues`). */
export type FieldErrors = Partial<Record<keyof ProjectFormValues, string>>;

const DATE_FORMAT = 'D MMMM YYYY';
const PRIORITY_OPTIONS = PROJECT_PRIORITIES.map((p) => ({
  value: p,
  label: PRIORITY_LABELS[p].label,
}));

/** Client checks mirror the route schema; the server stays the judge (dates, candidates). */
export function validateProject(v: ProjectFormValues): FieldErrors {
  const errors: FieldErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = FORM_COPY.nameRequired;
  else if (name.length > PROJECT_NAME_MAX) errors.name = FORM_COPY.nameTooLong(PROJECT_NAME_MAX);
  if (v.description.length > PROJECT_DESCRIPTION_MAX) {
    errors.description = FORM_COPY.descriptionTooLong(PROJECT_DESCRIPTION_MAX);
  }
  // ISO dates compare correctly as strings.
  if (v.startDate && v.dueDate && v.dueDate < v.startDate)
    errors.dueDate = FORM_COPY.dueBeforeStart;
  return errors;
}

/** Form values to the POST body; blanks are left out so the server applies its defaults. */
export function toCreateInput(v: ProjectFormValues, members: PickedMember[]): ProjectCreateInput {
  const description = v.description.trim();
  return {
    name: v.name.trim(),
    ...(description ? { description } : {}),
    status: v.status,
    priority: v.priority,
    leadId: v.leadId,
    ...(v.startDate ? { startDate: v.startDate } : {}),
    ...(v.dueDate ? { dueDate: v.dueDate } : {}),
    members: members.map((m) => ({ userId: m.id, role: m.role })),
  };
}

type Props = {
  creator: { id: string; name: string };
  /** The server's today (team time zone), used when a quick range is picked without a start date. */
  today: IsoDate;
  /** Resolves with field errors to show, or null when the project was created. */
  onSubmit: (input: ProjectCreateInput) => Promise<FieldErrors | null>;
  submitting: boolean;
  cancelTo: string;
};

export function ProjectForm({ creator, today, onSubmit, submitting, cancelTo }: Props) {
  const [members, setMembers] = useState<PickedMember[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const form = useForm<ProjectFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      description: '',
      status: 'draft',
      priority: 'medium',
      leadId: creator.id,
      startDate: null,
      dueDate: null,
    },
    validate: (v) => validateProject(v),
    onValuesChange: () => setDirty(form.isDirty()),
  });
  useUnsavedGuard(!saved && (dirty || members.length > 0));

  const leadOptions = [creator, ...members].map((p) => ({ value: p.id, label: p.name }));
  const pickRange = (range: Parameters<typeof quickDueDate>[1]) => {
    const start = form.getValues().startDate ?? today;
    form.setFieldValue('startDate', start);
    form.setFieldValue('dueDate', quickDueDate(start, range));
  };
  const removeMembers = (next: PickedMember[]) => {
    // A removed person cannot stay the Lead; fall back to the creator.
    if (!next.some((m) => m.id === form.getValues().leadId))
      form.setFieldValue('leadId', creator.id);
    setMembers(next);
  };
  const submit = form.onSubmit(async (values) => {
    const errors = await onSubmit(toCreateInput(values, members));
    if (errors) form.setErrors(errors);
    else setSaved(true);
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <TextInput
          label={FORM_COPY.name}
          placeholder={FORM_COPY.namePlaceholder}
          withAsterisk
          maxLength={PROJECT_NAME_MAX}
          key={form.key('name')}
          {...form.getInputProps('name')}
        />
        <Textarea
          label={FORM_COPY.descriptionLabel}
          description={FORM_COPY.descriptionHint}
          autosize
          minRows={3}
          maxLength={PROJECT_DESCRIPTION_MAX}
          key={form.key('description')}
          {...form.getInputProps('description')}
        />
        <Radio.Group
          label={FORM_COPY.status}
          key={form.key('status')}
          {...form.getInputProps('status')}
        >
          <Group gap="lg" wrap="wrap" mt="xs">
            {PROJECT_INITIAL_STATUSES.map((s) => (
              <Radio key={s} value={s} label={PROJECT_STATUS_LABELS[s].label} />
            ))}
          </Group>
        </Radio.Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label={FORM_COPY.priority}
            data={PRIORITY_OPTIONS}
            allowDeselect={false}
            key={form.key('priority')}
            {...form.getInputProps('priority')}
          />
          <Select
            label={FORM_COPY.lead}
            description={FORM_COPY.leadHint}
            data={leadOptions}
            allowDeselect={false}
            key={form.key('leadId')}
            {...form.getInputProps('leadId')}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <DateInput
            label={FORM_COPY.startDate}
            placeholder={FORM_COPY.datePlaceholder}
            valueFormat={DATE_FORMAT}
            clearable
            key={form.key('startDate')}
            {...form.getInputProps('startDate')}
          />
          <DateInput
            label={FORM_COPY.dueDate}
            placeholder={FORM_COPY.datePlaceholder}
            valueFormat={DATE_FORMAT}
            clearable
            key={form.key('dueDate')}
            {...form.getInputProps('dueDate')}
          />
        </SimpleGrid>
        <QuickDates onPick={pickRange} />
        <MemberPicker value={members} onChange={removeMembers} creator={creator} />
        <Group justify="flex-end" gap="xs" wrap="wrap">
          <Button component={Link} to={cancelTo} variant="default">
            {FORM_COPY.cancel}
          </Button>
          <Button type="submit" loading={submitting}>
            {FORM_COPY.submit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
