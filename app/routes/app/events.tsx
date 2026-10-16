import { Button, Group, Menu, SegmentedControl, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { requireUser } from '@server/guard';
import { useMemo, useState } from 'react';
import { FiCalendar, FiChevronDown, FiList, FiPlus, FiSearch } from 'react-icons/fi';
import { EventsList } from '~/components/events/EventsList';
import { EVENTS, type EventKind, KIND_LABELS } from '~/components/events/events.dummy';
import { type EventTab, filterEvents } from '~/components/events/events.filter';
import { MonthGrid } from '~/components/events/MonthGrid';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { ViewToggle } from '~/components/ui/ViewToggle';
import { DUMMY_TODAY } from '~/lib/dummy-clock';
import type { Route } from './+types/events';

export function meta() {
  return [{ title: 'Events — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

type KindFilter = EventKind | 'all';

/** Events with hardcoded dummy data (events.dummy.ts); list and month-calendar views. */
export default function EventsPage() {
  const [tab, setTab] = useState<EventTab>('upcoming');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const rows = useMemo(() => filterEvents(EVENTS, tab, q, kind), [tab, q, kind]);
  const kindLabel = kind === 'all' ? 'Filter' : `Filter: ${KIND_LABELS[kind]}`;

  return (
    <PageContainer>
      <PageHeader
        title="Events"
        description="Rapat dan acara tim"
        actions={
          <Button
            leftSection={<FiPlus size="1.25em" aria-hidden />}
            onClick={() =>
              notifications.show({
                message: 'Form event baru menyusul. Untuk sekarang, data masih contoh.',
              })
            }
          >
            Event baru
          </Button>
        }
      />
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm" wrap="wrap" style={{ flex: 1 }}>
          <SegmentedControl
            aria-label="Waktu event"
            value={tab}
            onChange={(v) => setTab(v as EventTab)}
            data={[
              { value: 'upcoming', label: 'Akan datang' },
              { value: 'past', label: 'Sudah lewat' },
            ]}
          />
          <TextInput
            style={{ flex: '1 1 220px', maxWidth: 360 }}
            placeholder="Cari judul atau lokasi..."
            aria-label="Cari event"
            leftSection={<FiSearch size="1.25em" aria-hidden />}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
          />
          <Menu>
            <Menu.Target>
              <Button variant="default" rightSection={<FiChevronDown size="1.25em" aria-hidden />}>
                {kindLabel}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => setKind('all')}>Semua jenis</Menu.Item>
              <Menu.Item onClick={() => setKind('rapat')}>Rapat</Menu.Item>
              <Menu.Item onClick={() => setKind('acara')}>Acara</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
        <ViewToggle
          value={view}
          onChange={setView}
          ariaLabel="Pilih tampilan event"
          options={[
            { value: 'list', label: 'Daftar', icon: FiList },
            { value: 'calendar', label: 'Kalender', icon: FiCalendar },
          ]}
        />
      </Group>
      {view === 'list' ? (
        <EventsList rows={rows} tab={tab} />
      ) : (
        <MonthGrid year={2026} month={10} title="Oktober 2026" events={rows} today={DUMMY_TODAY} />
      )}
    </PageContainer>
  );
}
