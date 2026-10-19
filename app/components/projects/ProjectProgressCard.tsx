import { Group, Progress, Stack, Text } from '@mantine/core';
import { SectionCard } from '~/components/ui/SectionCard';
import { DETAIL_COPY as C } from './project-detail.copy';
import type { ProjectRecord } from './projects.logic';
import { daysLeft, percentDone, percentTime, shortDate } from './projects.read';

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm">{label}</Text>
        <Text size="sm" fw={700}>{`${value}%`}</Text>
      </Group>
      <Progress value={value} color="ok" aria-label={`${label} ${value}%`} />
    </div>
  );
}

/** Tasks done next to time gone: the two numbers that show whether the project is on time. */
export function ProjectProgressCard({ project }: { project: ProjectRecord }) {
  return (
    <SectionCard title={C.progress}>
      <Stack gap="md">
        <Meter label={C.tasksDone} value={percentDone(project)} />
        <Meter label={C.timePassed} value={percentTime(project)} />
        <Text size="xs" c="dimmed">
          {C.span(shortDate(project.start), shortDate(project.due), C.left(daysLeft(project)))}
        </Text>
      </Stack>
    </SectionCard>
  );
}
