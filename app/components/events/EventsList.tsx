import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { FiCalendar, FiRepeat } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { DUMMY_TODAY } from '~/lib/dummy-clock';
import { type DummyEvent, KIND_LABELS } from './events.dummy';
import type { EventTab } from './events.filter';
import { groupEvents } from './events.filter';

const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });
const fullFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

function showDetail(e: DummyEvent) {
  modals.open({
    title: e.title,
    children: (
      <Stack gap={4}>
        <Text size="sm">{fullFmt.format(at(e.date))}</Text>
        <Text size="sm">{`${e.start}–${e.end} · ${e.location}`}</Text>
        <Text size="sm" c="dimmed">
          {[KIND_LABELS[e.kind], e.repeat && `berulang ${e.repeat}`].filter(Boolean).join(' · ')}
        </Text>
      </Stack>
    ),
  });
}

function DateBox({ e }: { e: DummyEvent }) {
  const today = e.date === DUMMY_TODAY;
  const dark = today && !e.finished;
  return (
    <Stack
      gap={0}
      align="center"
      justify="center"
      w={56}
      h={48}
      style={{
        flexShrink: 0,
        borderRadius: 'var(--mantine-radius-sm)',
        background: dark ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-default-hover)',
        color: dark ? 'var(--mantine-color-white)' : undefined,
      }}
    >
      <Text fw={700} size="sm" c="inherit">
        {today ? e.start : `${dayFmt.format(at(e.date))} ${Number(e.date.slice(8))}`}
      </Text>
    </Stack>
  );
}

/** Events grouped by when they happen; every row opens a small detail dialog. */
export function EventsList({ rows, tab }: { rows: DummyEvent[]; tab: EventTab }) {
  const groups = groupEvents(rows, tab);
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={FiCalendar}
        title={tab === 'past' ? 'Belum ada event yang lewat' : 'Belum ada event mendatang'}
        description="Rapat dan acara tim akan tampil di sini."
      />
    );
  }
  return (
    <Stack gap="md">
      {groups.map(({ group, rows: items }) => (
        <Stack key={group} gap="xs">
          <Text fw={700} size="sm">
            {group === 'Hari ini'
              ? `Hari ini · ${fullFmt.format(at(DUMMY_TODAY)).replace(/ \d{4}$/, '')}`
              : group}
          </Text>
          {items.map((e) => (
            <Paper key={e.id} withBorder p="sm" radius="md">
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <DateBox e={e} />
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Group gap={6} wrap="wrap">
                      <Text fw={700}>{e.title}</Text>
                      {e.repeat && (
                        <Group gap={4} c="dimmed" wrap="nowrap">
                          <FiRepeat size="1.25em" aria-hidden />
                          <Text size="xs">{e.repeat}</Text>
                        </Group>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {`${e.start}–${e.end} · ${e.location}${e.finished ? ' · Selesai' : ''}`}
                    </Text>
                  </Stack>
                </Group>
                <Button
                  style={{ flexShrink: 0 }}
                  variant={e.finished ? 'filled' : 'default'}
                  onClick={() => showDetail(e)}
                >
                  {e.finished ? 'Lihat hasil' : 'Lihat'}
                </Button>
              </Group>
            </Paper>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
