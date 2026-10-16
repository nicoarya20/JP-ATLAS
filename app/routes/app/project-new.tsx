import { Alert } from '@mantine/core';
import { canCreateProject } from '@server/access/project.policy';
import { requireUser } from '@server/guard';
import { METRICS } from '@server/metrics/config';
import { isoDateIn } from '@server/metrics/dates';
import { toPrincipal } from '@server/project/membership.query';
import { useEffect, useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { data, useNavigate } from 'react-router';
import { projectHref } from '~/components/projects/ProjectCard';
import { type FieldErrors, ProjectForm } from '~/components/projects/ProjectForm';
import { FORM_COPY } from '~/components/projects/projects.copy';
import { useProjectActions } from '~/components/projects/useProjectActions';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { ApiError } from '~/lib/http';
import type { Route } from './+types/project-new';

const LIST_PATH = '/app/projects';

export function meta() {
  return [{ title: 'Proyek Baru — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  // The server's policy decides; a Member opening the URL gets a 403 page with the reason.
  if (!canCreateProject(toPrincipal(actor)).ok)
    return data({ allowed: false as const }, { status: 403 });
  return {
    allowed: true as const,
    creator: { id: actor.user.id, name: actor.user.name },
    today: isoDateIn(new Date(), METRICS.TIME_ZONE),
  };
}

/** 422 `issues` paths ("/name", "name") to form fields; anything else stays in the toast. */
function fieldErrors(err: unknown): FieldErrors | null {
  if (!(err instanceof ApiError) || !err.issues) return null;
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.replace(/^\//, '').split('/')[0] ?? ''] = i.message;
  return out as FieldErrors;
}

export default function ProjectNewPage({ loaderData }: Route.ComponentProps) {
  const { create } = useProjectActions();
  const navigate = useNavigate();
  const [savedId, setSavedId] = useState<string | null>(null);
  // Navigate after the guard re-rendered without the unsaved-changes block.
  useEffect(() => {
    if (savedId) navigate(projectHref(savedId));
  }, [savedId, navigate]);
  const back = { to: LIST_PATH, label: FORM_COPY.back };

  if (!loaderData.allowed) {
    return (
      <PageContainer>
        <PageHeader title={FORM_COPY.title} back={back} />
        <Alert color="gray" variant="light" icon={<FiLock size="1.25em" aria-hidden />}>
          {FORM_COPY.forbidden}
        </Alert>
      </PageContainer>
    );
  }
  return (
    <PageContainer>
      <PageHeader title={FORM_COPY.title} description={FORM_COPY.description} back={back} />
      <ProjectForm
        creator={loaderData.creator}
        today={loaderData.today}
        submitting={create.loading}
        cancelTo={LIST_PATH}
        onSubmit={async (input) => {
          const res = await create.run(input);
          if (res.ok) {
            setSavedId(res.data.id);
            return null;
          }
          return fieldErrors(res.error) ?? {};
        }}
      />
    </PageContainer>
  );
}
