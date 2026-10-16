import { requireUser } from '@server/guard';
import { METRICS } from '@server/metrics/config';
import { isoDateIn } from '@server/metrics/dates';
import { elapsed } from '@server/metrics/project.metrics';
import { toPrincipal } from '@server/project/membership.query';
import type { ProjectDetail } from '@server/project/project.dto';
import { getProjectDetail } from '@server/project/project.query';
import { data } from 'react-router';
import { ProjectSummary } from '~/components/projects/ProjectSummary';
import { NOT_FOUND_TEXT } from '~/components/projects/projects.copy';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/summary';

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.project.name ?? 'Proyek'} — Simple PM` }];
}

// Loads and checks access itself: the layout loader runs in parallel and does not protect this one.
export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const now = new Date();
  const project = await getProjectDetail(toPrincipal(actor), params.projectId, now);
  if (!project) throw data(NOT_FOUND_TEXT, { status: 404 });
  const today = isoDateIn(now, METRICS.TIME_ZONE);
  return {
    project: toJson<ProjectDetail>(project),
    // Elapsed time comes from the shared metric, never recomputed in the browser.
    elapsed: elapsed(project.startDate, project.dueDate, today),
  };
}

/** "Ringkasan" tab of a project. */
export default function ProjectSummaryPage({ loaderData }: Route.ComponentProps) {
  return <ProjectSummary project={loaderData.project} elapsed={loaderData.elapsed} />;
}
