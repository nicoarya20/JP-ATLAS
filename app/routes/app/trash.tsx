import { Badge, Button, Group, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { requireUser } from '@server/guard';
import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { projectActions, useTrashedProjects } from '~/components/projects/projects.store';
import {
  RETENTION_DAYS,
  TRASH,
  TRASH_KIND_LABELS,
  type TrashItem,
  type TrashKind,
} from '~/components/trash/trash.dummy';
import { countsOf, daysLeft, ofKind } from '~/components/trash/trash.filter';
import { projectToItem } from '~/components/trash/trash.projects';
import { formatCalendarDate } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { notify } from '~/components/ui/notify';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/trash';

export function meta() {
  return [{ title: 'Sampah — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

type Tab = TrashKind | 'all';

/** Trash with hardcoded dummy data (trash.dummy.ts). Restoring is safe, so it needs no confirm dialog. */
export default function TrashPage() {
  const [others, setOthers] = useState<TrashItem[]>(TRASH);
  // Deleted projects live in the project store, so "Pulihkan" can put them back in the list.
  const items = [...useTrashedProjects().map(projectToItem), ...others];
  const [tab, setTab] = useState<Tab>('all');
  const counts = countsOf(items);
  const rows = ofKind(items, tab);

  const restore = (item: TrashItem) => {
    if (item.kind === 'project') projectActions.restore(item.id);
    else setOthers((all) => all.filter((i) => i.id !== item.id));
    notify.success(`"${item.title}" dipulihkan.`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Sampah"
        description={`Yang dihapus disimpan ${RETENTION_DAYS} hari, lalu hilang selamanya`}
      />
      <SegmentedControl
        aria-label="Jenis item terhapus"
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
        data={[
          { value: 'all', label: `Semua (${counts.all})` },
          { value: 'project', label: `Proyek (${counts.project})` },
          { value: 'task', label: `Tugas (${counts.task})` },
          { value: 'event', label: `Event (${counts.event})` },
        ]}
      />
      <Text
        size="sm"
        fw={700}
      >{`${rows.length} item · dihapus otomatis setelah ${RETENTION_DAYS} hari`}</Text>
      {rows.length === 0 ? (
        <EmptyState
          icon={FiTrash2}
          title="Sampah kosong"
          description="Tugas, event, dan proyek yang Anda hapus akan tampil di sini selama 30 hari."
        />
      ) : (
        <Stack gap="xs">
          {rows.map((i) => (
            <Paper key={i.id} withBorder p="sm" radius="md">
              <Group justify="space-between" wrap="wrap" gap="sm">
                <Group
                  gap="sm"
                  wrap="nowrap"
                  align="flex-start"
                  style={{ flex: '1 1 260px', minWidth: 0 }}
                >
                  <Badge variant="light" color="gray" tt="none">
                    {TRASH_KIND_LABELS[i.kind]}
                  </Badge>
                  <div style={{ minWidth: 0 }}>
                    <Text fw={700}>{i.title}</Text>
                    <Text size="xs" c="dimmed">
                      {`${i.project} · Dihapus oleh Anda · ${formatCalendarDate(i.deletedAt)} · Sisa ${daysLeft(i)} hari`}
                    </Text>
                  </div>
                </Group>
                <Button variant="default" onClick={() => restore(i)}>
                  Pulihkan
                </Button>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </PageContainer>
  );
}
