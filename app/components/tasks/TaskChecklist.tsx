/**
 * "Langkah-langkah" of a task (S2-13): big ticks, progress "2/3", add / rename / remove. Only a viewer
 * the server lets edit the task (`can.update`) sees the controls; everyone else reads the list.
 */
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { TASK_CHECKLIST_MAX_ITEMS, TASK_CHECKLIST_TEXT_MAX } from '@server/task/task.limits';
import { useState } from 'react';
import { FiCheck, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { confirmAction } from '~/components/ui/confirmAction';
import type { TaskChecklist as Checklist, ChecklistItem } from '~/lib/tasks-api';
import { CHECKLIST_COPY as COPY } from './task-body.copy';
import { useChecklistActions } from './useTaskBodyActions';

type Props = { taskRef: string; checklist: Checklist; canEdit: boolean };

function StepRow({
  item,
  taskRef,
  canEdit,
}: {
  item: ChecklistItem;
  taskRef: string;
  canEdit: boolean;
}) {
  const { change, remove } = useChecklistActions(taskRef);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const save = async () => {
    const next = text.trim();
    if (next === '' || next === item.text) return setEditing(false);
    const res = await change.run({ id: item.id, patch: { text: next } });
    if (res.ok) setEditing(false);
  };
  const askRemove = () =>
    confirmAction({
      title: COPY.removeTitle(item.text),
      body: COPY.removeBody,
      confirmLabel: COPY.remove,
      danger: true,
      onConfirm: () => void remove.run(item.id),
    });
  if (editing) {
    return (
      <Group gap="xs" wrap="wrap" align="flex-start">
        <TextInput
          aria-label={COPY.edit}
          value={text}
          maxLength={TASK_CHECKLIST_TEXT_MAX}
          onChange={(e) => setText(e.currentTarget.value)}
          style={{ flex: '1 1 12rem' }}
        />
        <Group gap="xs" wrap="wrap">
          <Button loading={change.loading} onClick={save} leftSection={<FiCheck size="1.25em" />}>
            {COPY.save}
          </Button>
          <Button variant="default" onClick={() => setEditing(false)}>
            {COPY.cancel}
          </Button>
        </Group>
      </Group>
    );
  }
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <Checkbox
        size="lg"
        checked={item.isDone}
        disabled={!canEdit || change.loading}
        aria-label={COPY.toggleLabel(item.text)}
        onChange={(e) =>
          void change.run({ id: item.id, patch: { isDone: e.currentTarget.checked } })
        }
      />
      <Text
        style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
        td={item.isDone ? 'line-through' : undefined}
        c={item.isDone ? 'dimmed' : undefined}
      >
        {item.text}
      </Text>
      {canEdit && (
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={COPY.edit}
            onClick={() => setEditing(true)}
          >
            <FiEdit2 size="1.25em" aria-hidden />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="danger"
            aria-label={COPY.remove}
            loading={remove.loading}
            onClick={askRemove}
          >
            <FiTrash2 size="1.25em" aria-hidden />
          </ActionIcon>
        </Group>
      )}
    </Group>
  );
}

function AddStep({ taskRef, full }: { taskRef: string; full: boolean }) {
  const { add } = useChecklistActions(taskRef);
  const [text, setText] = useState('');
  const submit = async () => {
    if (text.trim() === '') return;
    const res = await add.run(text);
    if (res.ok) setText('');
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Group gap="xs" wrap="wrap" align="flex-start">
        <TextInput
          aria-label={COPY.inputLabel}
          placeholder={COPY.inputPlaceholder}
          value={text}
          maxLength={TASK_CHECKLIST_TEXT_MAX}
          disabled={full}
          error={full ? COPY.full : undefined}
          onChange={(e) => setText(e.currentTarget.value)}
          style={{ flex: '1 1 12rem' }}
        />
        <Button type="submit" loading={add.loading} disabled={full || text.trim() === ''}>
          {COPY.add}
        </Button>
      </Group>
    </form>
  );
}

export function TaskChecklist({ taskRef, checklist, canEdit }: Props) {
  const { done, total, items } = checklist;
  return (
    <Paper withBorder p={{ base: 'sm', md: 'md' }} radius="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Title order={3}>{COPY.title}</Title>
          {total > 0 && (
            <Text size="sm" c="dimmed" aria-label={COPY.progressLabel(done, total)}>
              {COPY.progress(done, total)}
            </Text>
          )}
        </Group>
        {total > 0 && <Progress value={(done / total) * 100} aria-hidden />}
        {items.length === 0 && <Text c="dimmed">{canEdit ? COPY.empty : COPY.emptyReadOnly}</Text>}
        <Stack gap="xs">
          {items.map((item) => (
            <StepRow key={item.id} item={item} taskRef={taskRef} canEdit={canEdit} />
          ))}
        </Stack>
        {canEdit && <AddStep taskRef={taskRef} full={total >= TASK_CHECKLIST_MAX_ITEMS} />}
      </Stack>
    </Paper>
  );
}
