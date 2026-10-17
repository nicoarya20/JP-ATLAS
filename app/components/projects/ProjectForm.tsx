/**
 * Project form: `create` (④, members kept beside the form) or `edit` ("Ubah proyek", S1-13: all five
 * statuses, Lead picked among the current managers, no member picker). Limits are the write route's.
 */
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
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  type ProjectPriority,
  type ProjectStatus,
} from '@server/pm/enums';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_INITIAL_STATUSES,
  PROJECT_NAME_MAX,
} from '@server/project/project.limits';
import { useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '~/lib/http';
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import type { ProjectCreateInput } from '~/lib/projects-api';
import { useUnsavedGuard } from '~/lib/use-unsaved-guard';
import { MemberPicker, type PickedMember } from './MemberPicker';
import { EDIT_COPY } from './project-edit.copy';
import { FORM_COPY } from './projects.copy';
import { QuickDates, type QuickRange, quickRangeDates } from './QuickDates';

export type ProjectFormValues = {
  name: string;
  description: string;
  status: ProjectStatus;
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

/** 422 `issues` paths ("/name", "name") to form fields; anything else stays in the toast. */
export function fieldErrors(err: unknown): FieldErrors | null {
  if (!(err instanceof ApiError) || !err.issues) return null;
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.replace(/^\//, '').split('/')[0] ?? ''] = i.message;
  return out as FieldErrors;
}

/** Form values to the POST body; blanks are left out so the server applies its defaults. */
export function toCreateInput(v: ProjectFormValues, members: PickedMember[]): ProjectCreateInput {
  const description = v.description.trim();
  return {
    name: v.name.trim(),
    ...(description ? { description } : {}),
    // The create form only offers the initial statuses; anything else falls back to Draf.
    status: PROJECT_INITIAL_STATUSES.find((s) => s === v.status) ?? 'draft',
    priority: v.priority,
    leadId: v.leadId,
    ...(v.startDate ? { startDate: v.startDate } : {}),
    ...(v.dueDate ? { dueDate: v.dueDate } : {}),
    members: members.map((m) => ({ userId: m.id, role: m.role })),
  };
}

type Person = { id: string; name: string };
type Common = {
  /** The server's today (team time zone), used when a quick range is picked without a start date. */
  today: IsoDate;
  submitting: boolean;
  cancelTo: string;
};
type CreateProps = Common & {
  mode?: 'create';
  creator: Person;
  /** Resolves with field errors to show, or null when the project was created. */
  onSubmit: (input: ProjectCreateInput) => Promise<FieldErrors | null>;
};
type EditProps = Common & {
  mode: 'edit';
  initial: ProjectFormValues;
  /** The project's current managers: the only people who may become the Lead. */
  managers: Person[];
  /** Resolves with field errors to show, or null when the changes were saved. */
  onSubmit: (values: ProjectFormValues) => Promise<FieldErrors | null>;
};
type Props = CreateProps | EditProps;

const NEW_PROJECT = (leadId: string): ProjectFormValues => ({
  name: '',
  description: '',
  status: 'draft',
  priority: 'medium',
  leadId,
  startDate: null,
  dueDate: null,
});

export function ProjectForm(props: Props) {
  const { today, submitting, cancelTo } = props;
  const editing = props.mode === 'edit';
  const creator = editing ? null : props.creator;
  const [members, setMembers] = useState<PickedMember[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const form = useForm<ProjectFormValues>({
    mode: 'uncontrolled',
    initialValues: editing ? props.initial : NEW_PROJECT(props.creator.id),
    validate: (v) => validateProject(v),
    onValuesChange: () => setDirty(form.isDirty()),
  });
  useUnsavedGuard(!saved && (dirty || members.length > 0));

  const leadPeople = editing ? props.managers : [props.creator, ...members];
  const leadOptions = leadPeople.map((p) => ({ value: p.id, label: p.name }));
  const statuses = editing ? PROJECT_STATUSES : PROJECT_INITIAL_STATUSES;
  const pickRange = (range: QuickRange) => {
    const { startDate, dueDate } = quickRangeDates(form.getValues().startDate, today, range);
    form.setFieldValue('startDate', startDate);
    form.setFieldValue('dueDate', dueDate);
  };
  const removeMembers = (next: PickedMember[]) => {
    // A removed person cannot stay the Lead; fall back to the creator.
    if (creator && !next.some((m) => m.id === form.getValues().leadId))
      form.setFieldValue('leadId', creator.id);
    setMembers(next);
  };
  const submit = form.onSubmit(async (values) => {
    const errors = editing
      ? await props.onSubmit(values)
      : await props.onSubmit(toCreateInput(values, members));
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
          label={editing ? EDIT_COPY.status : FORM_COPY.status}
          description={editing ? EDIT_COPY.statusHint : undefined}
          key={form.key('status')}
          {...form.getInputProps('status')}
        >
          <Group gap="lg" wrap="wrap" mt="xs">
            {statuses.map((s) => (
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
            description={editing ? EDIT_COPY.leadHint : FORM_COPY.leadHint}
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
        {creator && <MemberPicker value={members} onChange={removeMembers} creator={creator} />}
        <Group justify="flex-end" gap="xs" wrap="wrap">
          <Button component={Link} to={cancelTo} variant="default">
            {FORM_COPY.cancel}
          </Button>
          <Button type="submit" loading={submitting}>
            {editing ? EDIT_COPY.submit : FORM_COPY.submit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
