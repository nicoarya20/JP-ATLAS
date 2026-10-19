import { Anchor, Badge, Button, Divider, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { FiAlertTriangle, FiClock } from 'react-icons/fi';
import { Link } from 'react-router';
import { notify } from '~/components/ui/notify';
import { SectionCard } from '~/components/ui/SectionCard';
import {
  FOCUS_GROUP_LABELS,
  FOCUS_HIDDEN_COUNT,
  FOCUS_TASKS,
  type FocusGroup,
  type FocusTask,
} from './home.dummy';

const GROUPS: FocusGroup[] = ['late', 'today', 'week'];

function FocusRow({ task, onDone }: { task: FocusTask; onDone: (t: FocusTask) => void }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" py={6}>
      <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
        <Text fw={600}>{task.title}</Text>
        <Group gap="xs" wrap="wrap">
          {task.chip && (
            <Badge
              color="danger"
              variant="filled"
              tt="none"
              leftSection={<FiAlertTriangle size="1.25em" aria-hidden />}
            >
              {task.chip}
            </Badge>
          )}
          <Text size="xs" c="dimmed">
            {task.meta}
          </Text>
        </Group>
      </Stack>
      <Button variant="default" style={{ flexShrink: 0 }} onClick={() => onDone(task)}>
        Selesai
      </Button>
    </Group>
  );
}

/** "My Focus": what to work on now, grouped by urgency; Selesai removes the row. */
export function HomeFocus() {
  const [tasks, setTasks] = useState(FOCUS_TASKS);
  const total = tasks.length + FOCUS_HIDDEN_COUNT;

  const finish = (task: FocusTask) => {
    setTasks((rows) => rows.filter((r) => r.id !== task.id));
    notify.success(`"${task.title}" ditandai selesai.`);
  };

  return (
    <SectionCard title="My Focus" subtitle="Apa yang harus saya kerjakan sekarang?">
      {tasks.length === 0 && (
        <Text c="dimmed" size="sm">
          Semua tugas prioritas sudah selesai. Kerja bagus!
        </Text>
      )}
      {GROUPS.map((g) => {
        const rows = tasks.filter((t) => t.group === g);
        if (rows.length === 0) return null;
        return (
          <div key={g}>
            <Group gap={4} c="dimmed" mb={2}>
              {g === 'late' && <FiAlertTriangle size="1.25em" aria-hidden />}
              {g === 'today' && <FiClock size="1.25em" aria-hidden />}
              <Text size="xs" fw={700} tt="uppercase">
                {FOCUS_GROUP_LABELS[g]}
              </Text>
            </Group>
            {rows.map((t, i) => (
              <div key={t.id}>
                {i > 0 && <Divider />}
                <FocusRow task={t} onDone={finish} />
              </div>
            ))}
          </div>
        );
      })}
      <Anchor component={Link} to="/app/tasks" fw={600} size="sm">
        {`Lihat semua tugas (${total})`}
      </Anchor>
    </SectionCard>
  );
}
