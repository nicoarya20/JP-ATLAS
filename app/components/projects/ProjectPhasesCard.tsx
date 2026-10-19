import { Anchor, Progress, Stack, Text } from '@mantine/core';
import { diffDays } from '@server/metrics/dates';
import { Link } from 'react-router';
import { SectionCard } from '~/components/ui/SectionCard';
import { DUMMY_TODAY } from '~/lib/dummy-clock';
import { PhaseStepper } from './PhaseStepper';
import { DETAIL_COPY as C } from './project-detail.copy';
import type { ProjectRecord } from './projects.logic';
import { currentPhase, nextMilestone, shortDate } from './projects.read';

/** Where the project is among its phases, and the next milestone; the full list is on the Tahapan tab. */
export function ProjectPhasesCard({ project }: { project: ProjectRecord }) {
  const phase = currentPhase(project.phases);
  const milestone = nextMilestone(project.phases);
  return (
    <SectionCard title={C.phases}>
      {!phase ? (
        <Text size="sm" c="dimmed">
          {C.phasesEmpty}
        </Text>
      ) : (
        <Stack gap="sm">
          <PhaseStepper phases={project.phases} />
          <Text size="sm" fw={600}>
            {C.now(phase.name, phase.progress)}
          </Text>
          <Progress
            value={phase.progress}
            color="ok"
            aria-label={C.now(phase.name, phase.progress)}
          />
          {milestone && (
            <div>
              <Text size="sm">{C.nextMilestone(milestone.name)}</Text>
              <Text size="xs" c="dimmed">
                {C.inDays(shortDate(milestone.due), diffDays(DUMMY_TODAY, milestone.due))}
              </Text>
            </div>
          )}
          <Anchor
            component={Link}
            to={`/app/projects/${encodeURIComponent(project.id)}/phases`}
            size="sm"
          >
            {C.seeAllPhases}
          </Anchor>
        </Stack>
      )}
    </SectionCard>
  );
}
