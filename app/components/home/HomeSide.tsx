import { Anchor, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';
import { ConditionPill } from '~/components/pm/ConditionPill';
import { ProgressBar } from '~/components/pm/ProgressBar';
import { DateText } from '~/components/ui/DateText';
import { DUMMY_ACTIVITIES, DUMMY_PROJECTS } from './home.dummy';

/** "Proyek saya" with progress, and the recent activity feed. */
export function HomeSide() {
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Group justify="space-between" wrap="wrap">
          <Title order={5}>Proyek saya</Title>
          <Anchor component={Link} to="/app/projects" size="sm">
            Lihat semua
          </Anchor>
        </Group>
        {DUMMY_PROJECTS.map((p) => (
          <Paper key={p.id} withBorder p="sm" radius="md">
            <Stack gap="xs">
              <Group justify="space-between" wrap="wrap" gap="xs">
                <Text fw={600}>{p.name}</Text>
                <ConditionPill condition={p.condition} />
              </Group>
              <ProgressBar done={p.done} total={p.total} timePct={p.timePct} />
            </Stack>
          </Paper>
        ))}
      </Stack>
      <Stack gap="xs">
        <Title order={5}>Aktivitas terbaru</Title>
        <Paper withBorder p="sm" radius="md">
          <Stack gap="sm">
            {DUMMY_ACTIVITIES.map((a) => (
              <div key={a.id}>
                <Text size="sm">
                  <b>{a.actor}</b> {a.text}
                </Text>
                <DateText value={a.at} mode="relative" />
              </div>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
}
