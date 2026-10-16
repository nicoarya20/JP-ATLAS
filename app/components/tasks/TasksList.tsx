import { Anchor, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { FiCheckSquare } from 'react-icons/fi';
import { Link } from 'react-router';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { formatCalendarDate } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import { type DummyTask, KIND_LABELS } from './tasks.dummy';
import { groupTasks } from './tasks.filter';

type Props = {
  rows: DummyTask[];
  onDone: (t: DummyTask) => void;
  onReset: () => void;
  filtered: boolean;
};

/** One-line meta under the title: "#17 · Proyek Atlas · Bug · Sedang". */
export function taskMeta(t: DummyTask): string {
  return [`#${t.number}`, t.project, KIND_LABELS[t.kind], PRIORITY_LABELS[t.priority].label].join(
    ' · ',
  );
}

function Row({ t, onDone }: { t: DummyTask; onDone: (t: DummyTask) => void }) {
  const done = t.status === 'done';
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Stack gap={2} style={{ minWidth: 0, flex: '1 1 260px' }}>
          <Anchor component={Link} to={`/app/tasks/${t.number}`} fw={700} c="inherit">
            {t.title}
          </Anchor>
          <Text size="xs" c="dimmed">
            {taskMeta(t)}
          </Text>
        </Stack>
        <Group gap="md" wrap="wrap" justify="flex-end" style={{ flex: '1 1 260px' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            {t.note ? (
              <Text fw={600} size="sm">
                {t.note}
              </Text>
            ) : (
              <StatusBadge status={t.status} />
            )}
          </div>
          <Text size="sm">{formatCalendarDate(t.due)}</Text>
          {done || t.note?.startsWith('Menunggu') ? (
            <Button variant="default" component={Link} to={`/app/tasks/${t.number}`}>
              Lihat
            </Button>
          ) : (
            <Button onClick={() => onDone(t)}>Tandai selesai</Button>
          )}
        </Group>
      </Group>
    </Paper>
  );
}

/** Tasks split by due date; "Tandai selesai" updates the row in place. */
export function TasksList({ rows, onDone, onReset, filtered }: Props) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FiCheckSquare}
        title="Belum ada tugas di sini"
        description="Tugas yang cocok dengan pilihan Anda akan tampil di daftar ini."
        filtered={filtered}
        onReset={onReset}
      />
    );
  }
  return (
    <Stack gap="md">
      {groupTasks(rows).map(({ group, rows: items }) => (
        <Stack key={group} gap="xs">
          <Text fw={700} size="sm">{`${group} ${items.length}`}</Text>
          {items.map((t) => (
            <Row key={t.number} t={t} onDone={onDone} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
