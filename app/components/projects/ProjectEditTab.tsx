import { Alert } from '@mantine/core';
import { FiLock } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { notify } from '~/components/ui/notify';
import { fakeLatency } from '~/lib/dummy-latency';
import { ProjectForm } from './ProjectForm';
import { useProjectOutlet } from './project-context';
import { DETAIL_COPY } from './project-detail.copy';
import { FORM_COPY } from './project-form.copy';
import { PEOPLE_COPY } from './project-people.copy';
import { PEOPLE } from './projects.detail.dummy';
import { toInput } from './projects.logic';
import { projectActions } from './projects.store';

/** "Ubah proyek": the same form as "Buat proyek", filled with this project; saving goes to the dummy store. */
export function ProjectEditTab() {
  const { project, access, viewer } = useProjectOutlet();
  const navigate = useNavigate();
  const base = `/app/projects/${encodeURIComponent(project.id)}`;

  if (!access.canManage) {
    return (
      <Alert color="gray" variant="light" icon={<FiLock size="1.25em" aria-hidden />}>
        {DETAIL_COPY.editForbidden}
      </Alert>
    );
  }
  const people = [
    ...new Set([viewer, ...PEOPLE.map((p) => p.name), ...project.team.map((m) => m.name)]),
  ];
  return (
    <ProjectForm
      initial={toInput(project)}
      people={people}
      submitLabel={FORM_COPY.save}
      cancelTo={base}
      onSubmit={async (values) => {
        await fakeLatency();
        const failed = projectActions.update(project.id, values, viewer);
        if (failed) return notify.error(PEOPLE_COPY.failed, PEOPLE_COPY.errors[failed]);
        notify.success(FORM_COPY.saved(values.name));
        navigate(base);
      }}
    />
  );
}
