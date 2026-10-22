/** Body of the "Ringkasan" tab: progress, phases and milestone on the left; tasks that need attention and activity on the right. */
import { SimpleGrid, Stack } from '@mantine/core';
import type { IsoDate } from '@server/metrics/dates';
import type { ElapsedResult } from '@server/metrics/project.metrics';
import type { ProjectDetail } from '@server/project/project.dto';
import type { ProjectPlan } from '@server/project/project-plan.query';
import type { ActivityPage } from '~/lib/project-deadline-api';
import { ProgressVsTime } from './ProgressVsTime';
import { ProjectTaskHighlights } from './ProjectTaskHighlights';
import { ActivityCard } from './summary/ActivityCard';
import { NextPhaseCard } from './summary/NextPhaseCard';

type Props = {
  project: Pick<ProjectDetail, 'id' | 'progress' | 'taskCounts' | 'startDate' | 'dueDate' | 'can'>;
  elapsed: ElapsedResult | null;
  today: IsoDate;
  plan: Pick<ProjectPlan, 'phases' | 'currentPhase' | 'nextMilestone'>;
  /** First page of the activity feed, loaded with the page. */
  activity: ActivityPage;
};

// minWidth: 0 lets a column shrink below its widest child (the phase stepper scrolls inside its card).
const COLUMN = { minWidth: 0 } as const;

export function ProjectSummary({ project, elapsed, today, plan, activity }: Props) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Stack gap="md" style={COLUMN}>
        <ProgressVsTime
          progress={project.progress}
          elapsed={elapsed}
          startDate={project.startDate}
          dueDate={project.dueDate}
          today={today}
        />
        <NextPhaseCard
          projectId={project.id}
          plan={plan}
          today={today}
          canPlan={project.can.update === true}
        />
      </Stack>
      <Stack gap="md" style={COLUMN}>
        <ProjectTaskHighlights overdue={project.taskCounts.overdue} />
        <ActivityCard projectId={project.id} first={activity} />
      </Stack>
    </SimpleGrid>
  );
}
