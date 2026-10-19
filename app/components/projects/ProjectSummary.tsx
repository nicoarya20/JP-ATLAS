import { SimpleGrid, Stack } from '@mantine/core';
import { ProjectActivityCard } from './ProjectActivityCard';
import { ProjectAttentionCard } from './ProjectAttentionCard';
import { ProjectPhasesCard } from './ProjectPhasesCard';
import { ProjectProgressCard } from './ProjectProgressCard';
import type { ProjectRecord } from './projects.logic';

/** The Ringkasan tab (flow ⑦): progress and phases on the left, what needs attention and the feed on the right. */
export function ProjectSummary({ project }: { project: ProjectRecord }) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Stack gap="md">
        <ProjectProgressCard project={project} />
        <ProjectPhasesCard project={project} />
      </Stack>
      <Stack gap="md">
        <ProjectAttentionCard projectName={project.name} />
        <ProjectActivityCard activity={project.activity} />
      </Stack>
    </SimpleGrid>
  );
}
