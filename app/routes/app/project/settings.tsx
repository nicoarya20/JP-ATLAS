import { Alert, Stack, Text, Title } from '@mantine/core';
import { requireUser } from '@server/guard';
import { METRICS } from '@server/metrics/config';
import { isoDateIn } from '@server/metrics/dates';
import { toPrincipal } from '@server/project/membership.query';
import { getProjectDetail, listProjectMembers } from '@server/project/project.query';
import { useEffect, useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { data, useNavigate } from 'react-router';
import { managersOf } from '~/components/projects/member-actions';
import { projectHref } from '~/components/projects/ProjectCard';
import { fieldErrors, ProjectForm } from '~/components/projects/ProjectForm';
import { isEmptyPlan, toEditPlan, toFormValues } from '~/components/projects/project-edit';
import { EDIT_COPY } from '~/components/projects/project-edit.copy';
import { NOT_FOUND_TEXT } from '~/components/projects/projects.copy';
import { useProjectActions } from '~/components/projects/useProjectActions';
import type { Route } from './+types/settings';

export function meta() {
  return [{ title: 'Ubah Proyek — Simple PM' }];
}

// Loads and checks access itself: the layout loader runs in parallel and does not protect this one.
export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const now = new Date();
  const project = await getProjectDetail(principal, params.projectId, now);
  if (!project) throw data(NOT_FOUND_TEXT, { status: 404 });
  // The server's `can.update` decides; a member who may only read gets a 403 page with the reason.
  if (project.can.update !== true) return data({ allowed: false as const }, { status: 403 });
  const members = (await listProjectMembers(principal, project.id)) ?? [];
  return {
    allowed: true as const,
    projectId: project.id,
    initial: toFormValues(project),
    managers: managersOf(members).map((m) => ({ id: m.userId, name: m.name })),
    today: isoDateIn(now, METRICS.TIME_ZONE),
  };
}

/** "Ubah proyek": info, dates, status (all five) and the Lead; members are managed in their tab. */
export default function ProjectSettingsPage({ loaderData }: Route.ComponentProps) {
  const { edit } = useProjectActions();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const projectId = loaderData.allowed ? loaderData.projectId : '';
  // Navigate after the guard re-rendered without the unsaved-changes block.
  useEffect(() => {
    if (done) navigate(projectHref(projectId));
  }, [done, navigate, projectId]);

  const heading = (
    <Stack gap={2}>
      <Title order={2} size="h3">
        {EDIT_COPY.title}
      </Title>
      {loaderData.allowed && <Text c="dimmed">{EDIT_COPY.description}</Text>}
    </Stack>
  );
  if (!loaderData.allowed) {
    return (
      <Stack gap="md">
        {heading}
        <Alert color="gray" variant="light" icon={<FiLock size="1.25em" aria-hidden />}>
          {EDIT_COPY.forbidden}
        </Alert>
      </Stack>
    );
  }
  const { initial } = loaderData;
  return (
    <Stack gap="md">
      {heading}
      <ProjectForm
        mode="edit"
        initial={initial}
        managers={loaderData.managers}
        today={loaderData.today}
        submitting={edit.loading}
        cancelTo={projectHref(projectId)}
        onSubmit={async (values) => {
          const changes = toEditPlan(initial, values);
          if (isEmptyPlan(changes)) {
            setDone(true);
            return null;
          }
          const res = await edit.run({ id: projectId, changes });
          if (res.ok) {
            setDone(true);
            return null;
          }
          return fieldErrors(res.error) ?? {};
        }}
      />
    </Stack>
  );
}
