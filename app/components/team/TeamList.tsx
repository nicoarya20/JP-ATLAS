import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { FiCircle, FiUsers } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import type { Member, TeamProject } from './team.dummy';
import { canSeeWorkload, summaryOf } from './team.filter';

function showMember(m: Member, project: string) {
  modals.open({
    title: m.isMe ? `${m.name} (Anda)` : m.name,
    children: (
      <Stack gap={4}>
        <Text size="sm">{`${m.role} · ${project}${m.lead ? ' (Lead)' : ''}`}</Text>
        <Text size="sm">{m.away ?? 'Tersedia'}</Text>
        <Text size="sm" c="dimmed">
          {canSeeWorkload(m)
            ? `${m.active} tugas aktif, ${m.late} terlambat.`
            : 'Jumlah tugas hanya terlihat oleh orang itu sendiri, Pengelola proyek, dan Admin.'}
        </Text>
      </Stack>
    ),
  });
}

function Row({ m, project }: { m: Member; project: string }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm" wrap="nowrap" style={{ flex: '1 1 220px', minWidth: 0 }}>
          <MemberAvatar name={m.name} size="lg" />
          <div style={{ minWidth: 0 }}>
            <Text fw={700}>{m.isMe ? `${m.name} (Anda)` : m.name}</Text>
            <Text size="xs" c="dimmed">{`${m.role} · ${project}${m.lead ? ' (Lead)' : ''}`}</Text>
          </div>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flex: '1 1 180px' }}>
          <FiCircle size="1.25em" aria-hidden fill={m.away ? 'none' : 'currentColor'} />
          <Text fw={600} size="sm">
            {m.away ?? 'Tersedia'}
          </Text>
        </Group>
        <div style={{ flex: '0 1 120px' }}>
          {canSeeWorkload(m) && (
            <>
              <Text fw={700} size="sm">{`${m.active} tugas aktif`}</Text>
              <Text size="xs" c="dimmed">{`${m.late} terlambat`}</Text>
            </>
          )}
        </div>
        <Button variant="default" onClick={() => showMember(m, project)}>
          Lihat
        </Button>
      </Group>
    </Paper>
  );
}

/** Members per project with availability; workload only where the viewer may see it. */
export function TeamList({ projects }: { projects: TeamProject[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FiUsers}
        title="Tidak ada anggota yang cocok"
        description="Coba ubah nama yang dicari atau pilih proyek lain."
      />
    );
  }
  return (
    <Stack gap="md">
      {projects.map((p) => (
        <Stack key={p.name} gap="xs">
          <Text fw={700} size="sm">
            {summaryOf(p)}
          </Text>
          {p.members.map((m) => (
            <Row key={m.name} m={m} project={p.name} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
