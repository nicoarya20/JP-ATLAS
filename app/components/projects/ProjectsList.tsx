import { Anchor, Badge, Group, Paper, Progress, SimpleGrid, Stack, Text } from '@mantine/core';
import { FiFolder } from 'react-icons/fi';
import { Link } from 'react-router';
import { ConditionPill } from '~/components/pm/ConditionPill';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { formatCalendarDate } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { AvatarStack } from '~/components/ui/MemberAvatar';
import { type ResponsiveColumn, ResponsiveTable } from '~/components/ui/ResponsiveTable';
import type { DummyProject } from './projects.dummy';

const percent = (p: DummyProject) => (p.total === 0 ? 0 : Math.round((p.done / p.total) * 100));
const people = (p: DummyProject) => p.members.map((name) => ({ id: name, name }));

function Name({ p }: { p: DummyProject }) {
  return (
    <div style={{ minWidth: 0 }}>
      <Anchor component={Link} to={`/app/projects/${p.id}`} fw={700} c="inherit">
        {p.name}
      </Anchor>
      <Text size="xs" c="dimmed">{`Lead: ${p.lead}`}</Text>
    </div>
  );
}

function Condition({ p }: { p: DummyProject }) {
  return (
    <Stack gap={2} align="flex-start">
      <ConditionPill condition={p.condition} />
      <Text size="xs" c="dimmed">
        {p.conditionNote}
      </Text>
    </Stack>
  );
}

function Due({ p }: { p: DummyProject }) {
  return (
    <div>
      <Text size="sm" fw={600}>
        {formatCalendarDate(p.due)}
      </Text>
      {p.extended && (
        <Text size="xs" c="dimmed">
          {p.extended}
        </Text>
      )}
    </div>
  );
}

function Bar({ p }: { p: DummyProject }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Progress
        value={percent(p)}
        color="ok"
        style={{ flex: 1, minWidth: 60 }}
        aria-label={`Progres ${percent(p)}%`}
      />
      <Text size="sm" fw={600}>{`${percent(p)}%`}</Text>
    </Group>
  );
}

const COLUMNS: ResponsiveColumn<DummyProject>[] = [
  { key: 'name', header: 'Nama proyek', cell: (p) => <Name p={p} /> },
  { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
  { key: 'cond', header: 'Kondisi', cell: (p) => <Condition p={p} /> },
  { key: 'progress', header: 'Progres', cell: (p) => <Bar p={p} />, width: 190 },
  { key: 'due', header: 'Tenggat', cell: (p) => <Due p={p} /> },
  { key: 'members', header: 'Anggota', cell: (p) => <AvatarStack members={people(p)} /> },
];

const EMPTY = (
  <EmptyState
    icon={FiFolder}
    title="Belum ada proyek yang cocok"
    description="Coba ubah kata kunci atau pilih status lain."
  />
);

/** Desktop table that turns into cards on phones. */
export function ProjectsList({ rows }: { rows: DummyProject[] }) {
  return (
    <ResponsiveTable
      label="Daftar proyek"
      columns={COLUMNS}
      rows={rows}
      getRowKey={(p) => p.id}
      empty={EMPTY}
      renderCard={(p) => (
        <Stack gap="xs">
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Name p={p} />
            <StatusBadge status={p.status} />
          </Group>
          <Condition p={p} />
          <Bar p={p} />
          <Group justify="space-between" wrap="wrap">
            <Due p={p} />
            <AvatarStack members={people(p)} />
          </Group>
        </Stack>
      )}
    />
  );
}

/** Card grid used by the "Grid" view. */
export function ProjectsGrid({ rows }: { rows: DummyProject[] }) {
  if (rows.length === 0) return EMPTY;
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {rows.map((p) => (
        <Paper key={p.id} withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Name p={p} />
              <Badge variant="light" tt="none">{`${percent(p)}%`}</Badge>
            </Group>
            <StatusBadge status={p.status} />
            <Condition p={p} />
            <Bar p={p} />
            <Group justify="space-between" wrap="wrap">
              <Due p={p} />
              <AvatarStack members={people(p)} />
            </Group>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
