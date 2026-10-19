import { Alert } from '@mantine/core';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { FiLock } from 'react-icons/fi';
import { data, useNavigate, useSearchParams } from 'react-router';
import { ProjectCreateChooser } from '~/components/projects/ProjectCreateChooser';
import { ProjectForm } from '~/components/projects/ProjectForm';
import { CHOOSER_COPY } from '~/components/projects/project-chooser.copy';
import { FORM_COPY } from '~/components/projects/project-form.copy';
import { emptyValues } from '~/components/projects/project-form.logic';
import { dummyName, dummyProjectAccess } from '~/components/projects/projects.access';
import { PEOPLE } from '~/components/projects/projects.detail.dummy';
import { projectActions } from '~/components/projects/projects.store';
import { notify } from '~/components/ui/notify';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { fakeLatency } from '~/lib/dummy-latency';
import { createModeOf, PROJECT_CHOOSER_PATH } from '~/lib/project-create-mode';
import type { Route } from './+types/project-new';

const LIST_PATH = '/app/projects';
const KNOWN = PEOPLE.map((p) => p.name);

export function meta() {
  return [{ title: 'Proyek Baru — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  // A Member opening the URL gets a 403 page with the reason, not an empty form.
  if (!dummyProjectAccess(toPrincipal(actor)).canCreate)
    return data({ allowed: false as const }, { status: 403 });
  return { allowed: true as const, creator: dummyName(actor.user.name, KNOWN) };
}

/** "Buat proyek": step ② asks how to start, step ③ is the form. Saves into the dummy store. */
export default function ProjectNewPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const back = { to: LIST_PATH, label: CHOOSER_COPY.back };

  if (!loaderData.allowed) {
    return (
      <PageContainer>
        <PageHeader title={CHOOSER_COPY.title} back={back} />
        <Alert color="gray" variant="light" icon={<FiLock size="1.25em" aria-hidden />}>
          {CHOOSER_COPY.forbidden}
        </Alert>
      </PageContainer>
    );
  }
  const { creator } = loaderData;

  if (createModeOf(search) === 'choose') {
    return (
      <PageContainer>
        <PageHeader title={CHOOSER_COPY.title} description={CHOOSER_COPY.description} back={back} />
        <ProjectCreateChooser />
      </PageContainer>
    );
  }
  return (
    <PageContainer>
      <PageHeader
        title={FORM_COPY.title}
        description={FORM_COPY.description}
        back={{ to: PROJECT_CHOOSER_PATH, label: CHOOSER_COPY.backToChooser }}
      />
      <ProjectForm
        initial={emptyValues(creator)}
        people={[...new Set([creator, ...KNOWN])]}
        submitLabel={FORM_COPY.create}
        cancelTo={LIST_PATH}
        onSubmit={async (values) => {
          await fakeLatency();
          const id = projectActions.create(values, creator);
          notify.success(FORM_COPY.created(values.name));
          navigate(`/app/projects/${id}`);
        }}
      />
    </PageContainer>
  );
}
