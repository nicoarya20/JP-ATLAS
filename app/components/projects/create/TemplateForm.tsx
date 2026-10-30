/**
 * Manual "Bikin template baru" (plan §5.2): name, description, phases (name + start/end offset in
 * days) each with their tasks (title, kind, priority, due offset), and loose tasks. Reuses the
 * add/remove row interaction `PhaseForm.tsx`/`PhaseList.tsx` use for real project phases.
 */
import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { PROJECT_PRIORITIES } from '@server/pm/enums';
import { DEFAULT_TASK_KINDS } from '@server/pm/limits';
import {
  PHASE_NAME_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
} from '@server/project/project.limits';
import { TASK_TITLE_MAX } from '@server/task/task.limits';
import { useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import type { SaveTemplateInput, TemplateDetail } from '~/lib/project-templates-api';
import { TEMPLATE_COPY as COPY } from './template-create.copy';

type TaskRow = {
  key: string;
  title: string;
  kindName: string | null;
  priority: (typeof PROJECT_PRIORITIES)[number] | null;
  dueOffsetDays: number | null;
};
type PhaseRow = {
  key: string;
  name: string;
  startOffsetDays: number | null;
  endOffsetDays: number | null;
  tasks: TaskRow[];
};

let seq = 0;
const nextKey = () => `tf${++seq}`;
const emptyTask = (): TaskRow => ({
  key: nextKey(),
  title: '',
  kindName: null,
  priority: null,
  dueOffsetDays: null,
});
const emptyPhase = (): PhaseRow => ({
  key: nextKey(),
  name: '',
  startOffsetDays: null,
  endOffsetDays: null,
  tasks: [],
});

const KIND_OPTIONS = DEFAULT_TASK_KINDS.map((k) => ({ value: k.name, label: k.name }));
const PRIORITY_OPTIONS = PROJECT_PRIORITIES.map((p) => ({
  value: p,
  label: PRIORITY_LABELS[p].label,
}));

function TaskEditor({
  task,
  onChange,
  onRemove,
}: {
  task: TaskRow;
  onChange: (next: TaskRow) => void;
  onRemove: () => void;
}) {
  return (
    <Group gap="xs" wrap="wrap" align="flex-start">
      <TextInput
        placeholder={COPY.taskTitlePlaceholder}
        maxLength={TASK_TITLE_MAX}
        value={task.title}
        onChange={(e) => onChange({ ...task, title: e.currentTarget.value })}
        flex="2 1 160px"
      />
      <Select
        placeholder="Jenis"
        data={KIND_OPTIONS}
        clearable
        value={task.kindName}
        onChange={(v) => onChange({ ...task, kindName: v })}
        flex="1 1 120px"
      />
      <Select
        placeholder="Prioritas"
        data={PRIORITY_OPTIONS}
        clearable
        value={task.priority}
        onChange={(v) => onChange({ ...task, priority: v as TaskRow['priority'] })}
        flex="1 1 120px"
      />
      <NumberInput
        placeholder={COPY.dueOffsetLabel}
        value={task.dueOffsetDays ?? ''}
        onChange={(v) => onChange({ ...task, dueOffsetDays: typeof v === 'number' ? v : null })}
        flex="1 1 100px"
      />
      <ActionIcon
        variant="subtle"
        color="danger"
        aria-label={COPY.removeTask}
        onClick={onRemove}
        flex="0 0 auto"
      >
        <FiX size="1.25em" aria-hidden />
      </ActionIcon>
    </Group>
  );
}

function PhaseEditor({
  phase,
  onChange,
  onRemove,
}: {
  phase: PhaseRow;
  onChange: (next: PhaseRow) => void;
  onRemove: () => void;
}) {
  const setTask = (key: string, next: TaskRow) =>
    onChange({ ...phase, tasks: phase.tasks.map((t) => (t.key === key ? next : t)) });
  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap="sm">
        <Group gap="xs" wrap="wrap" align="flex-start">
          <TextInput
            placeholder={COPY.phaseNamePlaceholder}
            maxLength={PHASE_NAME_MAX}
            value={phase.name}
            onChange={(e) => onChange({ ...phase, name: e.currentTarget.value })}
            flex="2 1 160px"
          />
          <NumberInput
            placeholder={COPY.startOffsetLabel}
            value={phase.startOffsetDays ?? ''}
            onChange={(v) =>
              onChange({ ...phase, startOffsetDays: typeof v === 'number' ? v : null })
            }
            flex="1 1 110px"
          />
          <NumberInput
            placeholder={COPY.endOffsetLabel}
            value={phase.endOffsetDays ?? ''}
            onChange={(v) =>
              onChange({ ...phase, endOffsetDays: typeof v === 'number' ? v : null })
            }
            flex="1 1 110px"
          />
          <ActionIcon
            variant="subtle"
            color="danger"
            aria-label={COPY.removePhase}
            onClick={onRemove}
            flex="0 0 auto"
          >
            <FiX size="1.25em" aria-hidden />
          </ActionIcon>
        </Group>
        <Stack gap="xs" pl="md">
          {phase.tasks.map((task) => (
            <TaskEditor
              key={task.key}
              task={task}
              onChange={(next) => setTask(task.key, next)}
              onRemove={() =>
                onChange({ ...phase, tasks: phase.tasks.filter((t) => t.key !== task.key) })
              }
            />
          ))}
          <Button
            variant="subtle"
            size="xs"
            leftSection={<FiPlus size="1.25em" aria-hidden />}
            onClick={() => onChange({ ...phase, tasks: [...phase.tasks, emptyTask()] })}
          >
            {COPY.addTask}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

type Props = {
  initial?: TemplateDetail;
  saving: boolean;
  onSubmit: (input: SaveTemplateInput) => void;
  onCancel: () => void;
};

const taskRowOf = (t: {
  title: string;
  kindName: string | null;
  priority: TaskRow['priority'];
  dueOffsetDays: number | null;
}): TaskRow => ({
  key: nextKey(),
  title: t.title,
  kindName: t.kindName,
  priority: t.priority,
  dueOffsetDays: t.dueOffsetDays,
});

const fromDetail = (t?: TemplateDetail) => ({
  name: t?.name ?? '',
  description: t?.description ?? '',
  phases: (t?.phases ?? []).map(
    (p): PhaseRow => ({
      key: nextKey(),
      name: p.name,
      startOffsetDays: p.startOffsetDays,
      endOffsetDays: p.endOffsetDays,
      tasks: p.tasks.map(taskRowOf),
    }),
  ),
  looseTasks: (t?.looseTasks ?? []).map(taskRowOf),
});

export function TemplateForm({ initial, saving, onSubmit, onCancel }: Props) {
  const [state, setState] = useState(() => fromDetail(initial));
  const setPhase = (key: string, next: PhaseRow) =>
    setState((s) => ({ ...s, phases: s.phases.map((p) => (p.key === key ? next : p)) }));
  const setLooseTask = (key: string, next: TaskRow) =>
    setState((s) => ({ ...s, looseTasks: s.looseTasks.map((t) => (t.key === key ? next : t)) }));

  const submit = () => {
    onSubmit({
      name: state.name.trim(),
      description: state.description.trim() || null,
      source: initial?.source ?? 'manual',
      phases: state.phases.map((p) => ({
        name: p.name.trim(),
        startOffsetDays: p.startOffsetDays,
        endOffsetDays: p.endOffsetDays,
        tasks: p.tasks.map((t) => ({
          title: t.title.trim(),
          kindName: t.kindName,
          priority: t.priority,
          dueOffsetDays: t.dueOffsetDays,
        })),
      })),
      looseTasks: state.looseTasks.map((t) => ({
        title: t.title.trim(),
        kindName: t.kindName,
        priority: t.priority,
        dueOffsetDays: t.dueOffsetDays,
      })),
    });
  };
  const canSave = state.name.trim().length > 0;

  return (
    <Stack gap="md">
      <TextInput
        label={COPY.nameLabel}
        placeholder={COPY.namePlaceholder}
        withAsterisk
        maxLength={PROJECT_NAME_MAX}
        value={state.name}
        onChange={(e) => setState((s) => ({ ...s, name: e.currentTarget.value }))}
      />
      <Textarea
        label={COPY.descriptionLabel}
        autosize
        minRows={2}
        maxLength={PROJECT_DESCRIPTION_MAX}
        value={state.description}
        onChange={(e) => setState((s) => ({ ...s, description: e.currentTarget.value }))}
      />
      <Stack gap="xs">
        <Text fw={600} size="sm">
          {COPY.phasesTitle}
        </Text>
        {state.phases.map((phase) => (
          <PhaseEditor
            key={phase.key}
            phase={phase}
            onChange={(next) => setPhase(phase.key, next)}
            onRemove={() =>
              setState((s) => ({ ...s, phases: s.phases.filter((p) => p.key !== phase.key) }))
            }
          />
        ))}
        <Button
          variant="default"
          size="sm"
          leftSection={<FiPlus size="1.25em" aria-hidden />}
          onClick={() => setState((s) => ({ ...s, phases: [...s.phases, emptyPhase()] }))}
        >
          {COPY.addPhase}
        </Button>
      </Stack>
      <Stack gap="xs">
        <Text fw={600} size="sm">
          {COPY.looseTasksTitle}
        </Text>
        {state.looseTasks.map((task) => (
          <TaskEditor
            key={task.key}
            task={task}
            onChange={(next) => setLooseTask(task.key, next)}
            onRemove={() =>
              setState((s) => ({
                ...s,
                looseTasks: s.looseTasks.filter((t) => t.key !== task.key),
              }))
            }
          />
        ))}
        <Button
          variant="subtle"
          size="xs"
          leftSection={<FiPlus size="1.25em" aria-hidden />}
          onClick={() => setState((s) => ({ ...s, looseTasks: [...s.looseTasks, emptyTask()] }))}
        >
          {COPY.addTask}
        </Button>
      </Stack>
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={onCancel} disabled={saving}>
          {COPY.cancel}
        </Button>
        <Button onClick={submit} loading={saving} disabled={!canSave}>
          {COPY.save}
        </Button>
      </Group>
    </Stack>
  );
}
