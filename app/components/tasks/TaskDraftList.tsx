/** The result of "Tulis saja ✦": banner, the draft cards, progress and the two buttons (Ubah tulisan, Simpan N tugas). */
import { Alert, Button, Group, Progress, Stack, Text } from '@mantine/core';
import { FiInfo } from 'react-icons/fi';
import { TaskDraftCard } from './TaskDraftCard';
import { WRITE_COPY as COPY } from './task-draft.copy';
import { type DraftItem, isPending, type WriteState } from './task-draft.state';

const HINT_ID = 'task-draft-hint';
const PERCENT = 100;

type Props = {
  items: DraftItem[];
  batch: WriteState['batch'];
  assigneeName: (id: string | null) => string | null;
  kindName: (id: string | null) => string | null;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onSave: () => void;
  onBack: () => void;
};

export function TaskDraftList(props: Props) {
  const { items, batch, assigneeName, kindName, onToggle, onEdit, onSave, onBack } = props;
  const pending = items.filter(isPending).length;
  const anySaved = items.some((i) => i.status === 'saved');
  const hint = batch
    ? COPY.saveBusy
    : pending === 0
      ? COPY.saveNone
      : anySaved
        ? COPY.editBackLocked
        : null;
  return (
    <Stack gap="sm">
      {items.length > 0 && (
        <Alert
          color="blue"
          variant="light"
          title={COPY.banner}
          icon={<FiInfo size="1.25em" aria-hidden />}
        >
          {COPY.bannerHint}
        </Alert>
      )}
      {items.length === 0 ? (
        <Text c="dimmed">{COPY.noDrafts}</Text>
      ) : (
        <Stack gap="xs">
          {items.map((item) => (
            <TaskDraftCard
              key={item.id}
              item={item}
              assigneeName={item.values.assigneeId ? assigneeName(item.values.assigneeId) : null}
              kindName={kindName(item.values.kindId)}
              busy={batch !== null}
              onToggle={() => onToggle(item.id)}
              onEdit={() => onEdit(item.id)}
            />
          ))}
        </Stack>
      )}
      {batch && (
        <Stack gap={4} role="status">
          <Progress value={(batch.done / batch.total) * PERCENT} aria-hidden />
          <Text size="sm">{COPY.progress(Math.min(batch.done + 1, batch.total), batch.total)}</Text>
        </Stack>
      )}
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={onBack} disabled={anySaved || batch !== null}>
          {COPY.editBack}
        </Button>
        {items.length > 0 && (
          <Button
            onClick={onSave}
            loading={batch !== null}
            disabled={pending === 0}
            aria-describedby={hint ? HINT_ID : undefined}
          >
            {COPY.save(pending)}
          </Button>
        )}
      </Group>
      {hint && (
        <Text id={HINT_ID} size="sm" c="dimmed" ta="right">
          {hint}
        </Text>
      )}
    </Stack>
  );
}
