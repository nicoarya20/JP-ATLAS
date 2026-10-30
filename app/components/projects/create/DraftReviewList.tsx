/**
 * The phases and loose tasks of a story draft, editable inline (rename) or removable, before the
 * project is created (plan §4.8: "AI hanya mengusulkan; pengguna memeriksa draf sebelum proyek dibuat").
 * Dates, priority and kind are shown as read-only hints — the server recomputes them unchanged.
 */
import { ActionIcon, Badge, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { FiX } from 'react-icons/fi';
import type { EditableDraft, EditableTask } from './project-draft.flow';
import { STORY_COPY as COPY } from './story-create.copy';

type Props = {
  draft: EditableDraft;
  onRenamePhase: (key: string, name: string) => void;
  onRenameTask: (key: string, title: string) => void;
  onRemovePhase: (key: string) => void;
  onRemoveTask: (key: string) => void;
};

function TaskHints({ task }: { task: EditableTask }) {
  if (!task.dueDate && !task.priority && !task.kindName) return null;
  return (
    <Group gap={6} wrap="wrap">
      {task.dueDate && (
        <Badge size="sm" variant="light" color="gray">
          {task.dueDate}
        </Badge>
      )}
      {task.priority && (
        <Badge size="sm" variant="light" color="gray">
          {task.priority}
        </Badge>
      )}
      {task.kindName && (
        <Badge size="sm" variant="light" color="gray">
          {task.kindName}
        </Badge>
      )}
    </Group>
  );
}

function TaskRow({
  task,
  onRename,
  onRemove,
}: {
  task: EditableTask;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
        <TextInput value={task.title} onChange={(e) => onRename(e.currentTarget.value)} size="sm" />
        <TaskHints task={task} />
      </Stack>
      <ActionIcon
        variant="subtle"
        color="danger"
        aria-label={COPY.removeTask}
        onClick={onRemove}
        style={{ flexShrink: 0 }}
      >
        <FiX size="1.25em" aria-hidden />
      </ActionIcon>
    </Group>
  );
}

export function DraftReviewList({
  draft,
  onRenamePhase,
  onRenameTask,
  onRemovePhase,
  onRemoveTask,
}: Props) {
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text fw={600} size="sm">
          {COPY.phasesTitle}
        </Text>
        {draft.phases.length === 0 ? (
          <Text size="sm" c="dimmed">
            {COPY.noPhases}
          </Text>
        ) : (
          draft.phases.map((phase) => (
            <Paper key={phase.key} withBorder p="sm" radius="md">
              <Stack gap="sm">
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  <TextInput
                    value={phase.name}
                    onChange={(e) => onRenamePhase(phase.key, e.currentTarget.value)}
                    fw={600}
                    style={{ minWidth: 0, flex: 1 }}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="danger"
                    aria-label={COPY.removePhase}
                    onClick={() => onRemovePhase(phase.key)}
                    style={{ flexShrink: 0 }}
                  >
                    <FiX size="1.25em" aria-hidden />
                  </ActionIcon>
                </Group>
                {phase.tasks.length > 0 && (
                  <Stack gap="xs" pl="md">
                    {phase.tasks.map((task) => (
                      <TaskRow
                        key={task.key}
                        task={task}
                        onRename={(title) => onRenameTask(task.key, title)}
                        onRemove={() => onRemoveTask(task.key)}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
      <Stack gap="xs">
        <Text fw={600} size="sm">
          {COPY.looseTasksTitle}
        </Text>
        {draft.looseTasks.length === 0 ? (
          <Text size="sm" c="dimmed">
            {COPY.noLooseTasks}
          </Text>
        ) : (
          <Stack gap="xs">
            {draft.looseTasks.map((task) => (
              <TaskRow
                key={task.key}
                task={task}
                onRename={(title) => onRenameTask(task.key, title)}
                onRemove={() => onRemoveTask(task.key)}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
