import { requireUser } from '@server/guard';
import { METRICS } from '@server/metrics/config';
import { isoDateIn } from '@server/metrics/dates';
import { elapsed } from '@server/metrics/project.metrics';
import { toPrincipal } from '@server/project/membership.query';
import type { ProjectDetail } from '@server/project/project.dto';
import { getProjectDetail } from '@server/project/project.query';
import { listProjectActivity } from '@server/project/project-activity.query';
import { getProjectPlan, type ProjectPlan } from '@server/project/project-plan.query';
import { data } from 'react-router';
import { ProjectSummary } from '~/components/projects/ProjectSummary';
import { NOT_FOUND_TEXT } from '~/components/projects/projects.copy';
import { ACTIVITY_PAGE_SIZE } from '~/components/projects/summary/activity';
import { toJson } from '~/lib/loader-json';
import type { ActivityPage } from '~/lib/project-deadline-api';
import type { Route } from './+types/summary';

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.project.name ?? 'Proyek'} — Simple PM` }];
}

const EMPTY_PLAN: ProjectPlan = {
  phases: [],
  milestones: [],
  nextMilestone: null,
  currentPhase: null,
};
const EMPTY_ACTIVITY: ActivityPage = { items: [], nextCursor: null };

// Loads and checks access itself: the layout loader runs in parallel and does not protect this one.
export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const now = new Date();
  const project = await getProjectDetail(principal, params.projectId, now);
  if (!project) throw data(NOT_FOUND_TEXT, { status: 404 });
  const today = isoDateIn(now, METRICS.TIME_ZONE);
  const [plan, activity] = await Promise.all([
    getProjectPlan(principal, project.id),
    listProjectActivity(principal, project.id, { limit: ACTIVITY_PAGE_SIZE }),
  ]);
  return {
    project: toJson<ProjectDetail>(project),
    today,
    // Elapsed time comes from the shared metric, never recomputed in the browser.
    elapsed: elapsed(project.startDate, project.dueDate, today),
    // Both were readable a moment ago (the project loaded), so a miss here only means a race with a
    // delete or a Trash move: show empty cards rather than fail the whole tab.
    plan: toJson<ProjectPlan>(plan ?? EMPTY_PLAN),
    activity: toJson<ActivityPage>(activity.ok ? activity.value : EMPTY_ACTIVITY),
  };
}

/** "Ringkasan" tab of a project. */
export default function ProjectSummaryPage({ loaderData }: Route.ComponentProps) {
  const { project, elapsed, today, plan, activity } = loaderData;
  return (
    <ProjectSummary
      project={project}
      elapsed={elapsed}
      today={today}
      plan={plan}
      activity={activity}
    />
  );
}
