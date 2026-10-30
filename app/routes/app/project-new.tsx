import { Alert } from '@mantine/core';
import { canCreateProject } from '@server/access/project.policy';
import { requireUser } from '@server/guard';
import { METRICS } from '@server/metrics/config';
import { isoDateIn } from '@server/metrics/dates';
import { toPrincipal } from '@server/project/membership.query';
import { useEffect, useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { data, useNavigate, useSearchParams } from 'react-router';
import { StoryCreateStep } from '~/components/projects/create/StoryCreateStep';
import { TemplateCreateStep } from '~/components/projects/create/TemplateCreateStep';
import { projectHref } from '~/components/projects/ProjectCard';
import { ProjectCreateChooser } from '~/components/projects/ProjectCreateChooser';
import { fieldErrors, ProjectForm } from '~/components/projects/ProjectForm';
import { CHOOSER_COPY } from '~/components/projects/project-chooser.copy';
import { FORM_COPY } from '~/components/projects/projects.copy';
import { useProjectActions } from '~/components/projects/useProjectActions';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { createModeOf, PROJECT_CHOOSER_PATH } from '~/lib/project-create-mode';
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

export default function ProjectNewPage({ loaderData }: Route.ComponentProps) {
  const { create } = useProjectActions();
  const navigate = useNavigate();
  const [search] = useSearchParams();
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
  const mode = createModeOf(search);
  const chooserBack = { to: PROJECT_CHOOSER_PATH, label: CHOOSER_COPY.backToChooser };

  // Step ②: the bare URL asks how to start; only a `?cara=...` value shows a step ③ screen.
  if (mode === 'choose') {
    return (
      <PageContainer>
        <PageHeader title={CHOOSER_COPY.title} description={CHOOSER_COPY.description} back={back} />
        <ProjectCreateChooser />
      </PageContainer>
    );
  }
  if (mode === 'cerita') {
    return (
      <PageContainer>
        <PageHeader
          title={CHOOSER_COPY.story.title}
          description={CHOOSER_COPY.story.body}
          back={chooserBack}
        />
        <StoryCreateStep
          creator={loaderData.creator}
          today={loaderData.today}
          cancelTo={LIST_PATH}
          onSaved={setSavedId}
          onBack={() => navigate(PROJECT_CHOOSER_PATH)}
        />
      </PageContainer>
    );
  }
  if (mode === 'template') {
    return (
      <PageContainer>
        <PageHeader
          title={CHOOSER_COPY.template.title}
          description={CHOOSER_COPY.template.body}
          back={chooserBack}
        />
        <TemplateCreateStep
          creator={loaderData.creator}
          today={loaderData.today}
          onSaved={setSavedId}
        />
      </PageContainer>
    );
  }
  return (
    <PageContainer>
      <PageHeader title={FORM_COPY.title} description={FORM_COPY.description} back={chooserBack} />
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
