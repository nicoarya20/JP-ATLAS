/** One draft of "Tulis saja ✦" as a card: pick box, the fields that matter, "Ubah", and its save result. */
import { Anchor, Badge, Button, Checkbox, Group, Paper, Stack, Text } from '@mantine/core';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiEdit2,
  FiLoader,
  FiUser,
} from 'react-icons/fi';
import { Link } from 'react-router';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import { longDate } from './task-draft';
import { WRITE_COPY as COPY } from './task-draft.copy';
import type { DraftItem } from './task-draft.state';

type Props = {
  item: DraftItem;
  /** Name of the chosen assignee, or null when unknown (members still loading). */
  assigneeName: string | null;
  kindName: string | null;
  /** A batch is running: nothing on the card may change. */
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
};

export function TaskDraftCard({ item, assigneeName, kindName, busy, onToggle, onEdit }: Props) {
  const { values, status } = item;
  const saved = status === 'saved';
  const locked = busy || saved || status === 'saving';
  const priority = PRIORITY_LABELS[values.priority];
  const PriorityIcon = priority.icon;
  return (
    <Paper withBorder p="sm" radius="md" data-draft-status={status}>
      <Group align="flex-start" wrap="nowrap" gap="sm">
        <Checkbox
          checked={item.selected}
          onChange={onToggle}
          disabled={locked}
          aria-label={COPY.pickDraft(values.title)}
          mt={2}
        />
        <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
          <Text fw={600} style={{ overflowWrap: 'anywhere' }}>
            {values.title}
          </Text>
          <Group gap="xs" wrap="wrap">
            <Group gap={4} wrap="nowrap">
              <FiUser size="1.25em" aria-hidden />
              <Text size="sm" c={assigneeName || !item.note ? undefined : 'warn.8'}>
                {assigneeName ?? item.note ?? COPY.assigneeNone}
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap">
              <FiCalendar size="1.25em" aria-hidden />
              <Text size="sm">{values.dueDate ? longDate(values.dueDate) : COPY.dueNone}</Text>
            </Group>
            <Badge
              variant="light"
              color={priority.color}
              leftSection={<PriorityIcon size="1.25em" aria-hidden />}
            >
              {priority.label}
            </Badge>
            {kindName && <Badge variant="default">{kindName}</Badge>}
          </Group>
          <CardStatus item={item} />
        </Stack>
        <Button
          variant="subtle"
          onClick={onEdit}
          disabled={locked}
          aria-label={COPY.editDraft(values.title)}
          leftSection={<FiEdit2 size="1.25em" aria-hidden />}
          style={{ flexShrink: 0 }}
        >
          {COPY.edit}
        </Button>
      </Group>
    </Paper>
  );
}

/** Saving, saved (with a link to the task) or the reason it failed; nothing while the draft is untouched. */
function CardStatus({ item }: { item: DraftItem }) {
  if (item.status === 'saving') {
    return (
      <Group gap={4} wrap="nowrap" role="status">
        <FiLoader size="1.25em" aria-hidden />
        <Text size="sm">{COPY.saving}</Text>
      </Group>
    );
  }
  if (item.status === 'saved' && item.saved) {
    return (
      <Group gap="xs" wrap="wrap">
        <Badge color="ok" variant="light" leftSection={<FiCheckCircle size="1.25em" aria-hidden />}>
          {COPY.savedBadge}
        </Badge>
        <Anchor component={Link} to={`/app/tasks/${item.saved.number}`} size="sm">
          {COPY.openSaved}
        </Anchor>
      </Group>
    );
  }
  if (item.status === 'failed' && item.error) {
    return (
      <Group gap={4} wrap="nowrap" align="flex-start" role="alert">
        <FiAlertTriangle size="1.25em" aria-hidden style={{ flexShrink: 0 }} />
        <Text size="sm" c="danger">
          {COPY.failed(item.error)}
        </Text>
      </Group>
    );
  }
  return null;
}
