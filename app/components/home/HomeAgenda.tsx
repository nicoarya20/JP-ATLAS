import { Anchor, Divider, Group, Stack, Text } from '@mantine/core';
import { FiAlertTriangle } from 'react-icons/fi';
import { Link } from 'react-router';
import { ConditionPill } from '~/components/pm/ConditionPill';
import { ProgressBar } from '~/components/pm/ProgressBar';
import { SectionCard } from '~/components/ui/SectionCard';
import { AGENDA_TODAY, HOME_PROJECTS } from './home.dummy';

/** "Agenda & Projects": today's meetings plus a short progress list of my projects. */
export function HomeAgenda() {
  return (
    <SectionCard title="Agenda & Projects" subtitle="Ada rapat apa? Proyek saya bagaimana?">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        Hari ini
      </Text>
      {AGENDA_TODAY.map((e) => (
        <Group key={e.id} gap="md" align="flex-start" wrap="nowrap">
          <Text fw={700}>{e.time}</Text>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600}>{e.title}</Text>
            <Group gap={4} wrap="nowrap" c="warn">
              <FiAlertTriangle size="1.25em" aria-hidden />
              <Text size="xs">{e.warning}</Text>
            </Group>
          </Stack>
        </Group>
      ))}
      <Divider />
      <Group justify="space-between" wrap="wrap">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Proyek saya
        </Text>
        <Anchor component={Link} to="/app/projects" size="sm" fw={600}>
          Lihat semua
        </Anchor>
      </Group>
      {HOME_PROJECTS.map((p) => (
        <Stack key={p.id} gap={6}>
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text fw={600}>{p.name}</Text>
            <ConditionPill condition={p.condition} />
          </Group>
          <ProgressBar done={p.done} total={p.total} />
          {p.note && (
            <Text size="xs" c="dimmed">
              {p.note}
            </Text>
          )}
        </Stack>
      ))}
    </SectionCard>
  );
}
