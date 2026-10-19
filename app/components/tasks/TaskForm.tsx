/**
 * Task form: `create` (Tugas ⑥, S2-11) or `edit` ("Ubah tugas" of the task detail, S2-12/S2-13; the
 * project stays fixed and initial steps are not offered). Limits are the write routes' (`task.limits`).
 */
import { Button, Collapse, Group, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import type { IsoDate } from '@server/metrics/types';
import { PROJECT_PRIORITIES } from '@server/pm/enums';
import { isTaskWorkerRole, TASK_TITLE_MAX } from '@server/task/task.limits';
import type { TaskFormKind, TaskFormPhase, TaskFormProject } from '@server/task/task-form.query';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { Link } from 'react-router';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import { fetchProjectMembers, type ProjectMemberItem, projectKeys } from '~/lib/projects-api';
import { useUnsavedGuard } from '~/lib/use-unsaved-guard';
import { TASK_DATE_FORMAT, TaskFormMore } from './TaskFormMore';
import {
  hasFoldedValues,
  QUICK_DUE_LABELS,
  QUICK_DUES,
  quickDue,
  type TaskFieldErrors,
  type TaskFormValues,
  validateTask,
} from './task-form';
import { TASK_FORM_COPY as COPY } from './task-form.copy';

const PRIORITY_OPTIONS = PROJECT_PRIORITIES.map((p) => ({
  value: p,
  label: PRIORITY_LABELS[p].label,
}));

/** Only Pengelola and Anggota work on tasks; a Pemantau is never offered (P3 §2 Tugas ⑥). */
export const workersOf = (members: readonly ProjectMemberItem[]) =>
  members.filter((m) => isTaskWorkerRole(m.role));

/** The kind a new task gets when none is picked: the project's "Tugas" kind, like the server. */
export const defaultKindId = (kinds: readonly TaskFormKind[]) =>
  (kinds.find((k) => k.baseKind === 'task') ?? kinds[0])?.id ?? null;

type Common = {
  /** The server's today (team time zone) for the quick due buttons; never the browser's clock. */
  today: IsoDate;
  viewer: { id: string; name: string };
  /** Members of the project the form opens with, so the first render needs no fetch. */
  initialMembers?: ProjectMemberItem[];
  submitting: boolean;
  cancelTo: string;
  /** When set, Batal calls it instead of going to `cancelTo` (the form inside a dialog must not leave the page). */
  onCancel?: () => void;
  /** Resolves with field errors to show, or null when the task was saved. */
  onSubmit: (values: TaskFormValues) => Promise<TaskFieldErrors | null>;
};
type CreateProps = Common & {
  mode: 'create';
  /** Projects the viewer may add a task to, from the server. */
  projects: TaskFormProject[];
  initial: TaskFormValues;
};
type EditProps = Common & {
  mode: 'edit';
  project: { id: string; name: string };
  kinds: TaskFormKind[];
  phases: TaskFormPhase[];
  initial: TaskFormValues;
};
export type TaskFormProps = CreateProps | EditProps;

export function TaskForm(props: TaskFormProps) {
  const { today, viewer, submitting, cancelTo, initial } = props;
  const editing = props.mode === 'edit';
  const [saved, setSaved] = useState(false);
  // A draft that fills the folded fields opens them, so nothing it filled is hidden from the user.
  const [more, setMore] = useState(editing || hasFoldedValues(initial));
  // Project picked by hand: once its members load, the viewer becomes the default assignee if they work there.
  const [autoAssign, setAutoAssign] = useState<string | null>(null);
  // Fields with their own rule are checked when the user leaves them; project and the rest wait for Simpan,
  // so tabbing past an untouched Proyek does not shout "Pilih proyek" before the user got there.
  const form = useForm<TaskFormValues>({
    initialValues: initial,
    validate: validateTask,
    validateInputOnBlur: ['title', 'description', 'dueDate', 'startDate'],
  });
  useUnsavedGuard(!saved && form.isDirty());

  const projectId = editing ? props.project.id : form.values.projectId;
  const members = useQuery({
    queryKey: projectKeys.members(projectId ?? ''),
    queryFn: () => fetchProjectMembers(projectId ?? ''),
    enabled: Boolean(projectId),
    initialData: projectId === initial.projectId ? props.initialMembers : undefined,
  });
  const workers = workersOf(members.data ?? []);
  const chosen = editing ? undefined : props.projects.find((p) => p.id === projectId);
  const kinds = editing ? props.kinds : (chosen?.kinds ?? []);
  const phases = editing ? props.phases : (chosen?.phases ?? []);

  useEffect(() => {
    if (!autoAssign || autoAssign !== projectId || !members.data) return;
    const isWorker = workersOf(members.data).some((m) => m.userId === viewer.id);
    form.setFieldValue('assigneeId', isWorker ? viewer.id : null);
    setAutoAssign(null);
  }, [autoAssign, projectId, members.data, viewer.id, form.setFieldValue]);

  const pickProject = (id: string | null) => {
    form.setFieldValue('projectId', id);
    form.setFieldValue('assigneeId', null);
    const next = editing ? undefined : props.projects.find((p) => p.id === id);
    form.setFieldValue('kindId', next ? defaultKindId(next.kinds) : null);
    // A phase belongs to one project, so the old pick cannot follow the task to another.
    form.setFieldValue('phaseId', null);
    setAutoAssign(id);
  };
  const submit = form.onSubmit(async (values) => {
    const errors = await props.onSubmit(values);
    if (errors) {
      form.setErrors(errors);
      // A refused field may sit in the folded part; open it so the message is seen.
      if (errors.description || errors.kindId || errors.phaseId || errors.startDate || errors.steps)
        setMore(true);
    } else setSaved(true);
  });

  const assigneeOptions = workers.map((m) => ({
    value: m.userId,
    label: m.userId === viewer.id ? COPY.me(m.name) : m.name,
  }));
  const assigneeHint = !projectId
    ? COPY.assigneeNeedsProject
    : members.isError
      ? COPY.assigneeLoadFailed
      : members.isPending
        ? COPY.assigneeLoading
        : COPY.assigneeHint;

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        {editing ? (
          <TextInput
            label={COPY.project}
            description={COPY.projectFixed}
            value={props.project.name}
            readOnly
          />
        ) : (
          <Select
            label={COPY.project}
            placeholder={COPY.projectPlaceholder}
            withAsterisk
            searchable
            data={props.projects.map((p) => ({ value: p.id, label: p.name }))}
            value={form.values.projectId}
            onChange={pickProject}
            error={form.errors.projectId}
          />
        )}
        <TextInput
          label={COPY.name}
          description={COPY.nameHint}
          withAsterisk
          maxLength={TASK_TITLE_MAX}
          {...form.getInputProps('title')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label={COPY.assignee}
            description={assigneeHint}
            placeholder={COPY.assigneePlaceholder}
            data={assigneeOptions}
            clearable
            searchable
            disabled={!projectId || members.isPending}
            {...form.getInputProps('assigneeId')}
          />
          <Select
            label={COPY.priority}
            data={PRIORITY_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('priority')}
          />
        </SimpleGrid>
        <DateInput
          label={COPY.dueDate}
          placeholder={COPY.datePlaceholder}
          valueFormat={TASK_DATE_FORMAT}
          clearable
          {...form.getInputProps('dueDate')}
        />
        <div>
          <Text size="sm" c="dimmed" mb={6} id="task-quick-due-label">
            {COPY.quickLabel}
          </Text>
          <Group gap="xs" wrap="wrap" role="group" aria-labelledby="task-quick-due-label">
            {QUICK_DUES.map((q) => (
              <Button
                key={q}
                variant="default"
                onClick={() => form.setFieldValue('dueDate', quickDue(today, q))}
              >
                {QUICK_DUE_LABELS[q]}
              </Button>
            ))}
          </Group>
        </div>
        <Group>
          <Button
            variant="subtle"
            aria-expanded={more}
            aria-controls="task-form-more"
            leftSection={
              more ? (
                <FiChevronUp size="1.25em" aria-hidden />
              ) : (
                <FiChevronDown size="1.25em" aria-hidden />
              )
            }
            onClick={() => setMore((v) => !v)}
          >
            {more ? COPY.less : COPY.more}
          </Button>
        </Group>
        <Collapse expanded={more} id="task-form-more">
          <TaskFormMore
            form={form}
            kinds={kinds}
            phases={phases}
            hasProject={Boolean(projectId)}
            withSteps={!editing}
          />
        </Collapse>
        <Group justify="flex-end" gap="xs" wrap="wrap">
          {props.onCancel ? (
            <Button variant="default" onClick={props.onCancel}>
              {COPY.cancel}
            </Button>
          ) : (
            <Button component={Link} to={cancelTo} variant="default">
              {COPY.cancel}
            </Button>
          )}
          <Button type="submit" loading={submitting}>
            {editing ? COPY.editSubmit : COPY.submit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
