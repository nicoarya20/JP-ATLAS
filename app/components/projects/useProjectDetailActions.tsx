import { modals } from '@mantine/modals';
import { useNavigate } from 'react-router';
import { confirmAction } from '~/components/ui/confirmAction';
import { formatCalendarDate } from '~/components/ui/DateText';
import { notify } from '~/components/ui/notify';
import { TASKS } from '../tasks/tasks.dummy';
import { ExtendDueForm } from './ExtendDueForm';
import { DETAIL_COPY as C } from './project-detail.copy';
import type { ProjectRecord } from './projects.logic';
import { projectActions } from './projects.store';

/** The two things the project header can do: move the due date and move the project to the Trash. */
export function useProjectDetailActions(project: ProjectRecord, viewer: string) {
  const navigate = useNavigate();

  const extend = () => {
    const id = modals.open({
      title: C.extendTitle,
      children: (
        <ExtendDueForm
          project={project}
          onClose={() => modals.close(id)}
          onSubmit={(due, reason) => {
            const failed = projectActions.extend(project.id, due, viewer, reason);
            if (failed) notify.error(C.extendTitle, C.newDueAfter(formatCalendarDate(project.due)));
            else notify.success(C.extended(formatCalendarDate(due)));
            modals.close(id);
          }}
        />
      ),
    });
  };

  // T2: a project is not undoable with one click, so it asks first and says what goes with it.
  const remove = () =>
    confirmAction({
      title: C.deleteTitle(project.name),
      body: C.deleteBody(TASKS.filter((t) => t.project === project.name).length),
      confirmLabel: C.deleteLabel,
      danger: true,
      onConfirm: () => {
        projectActions.remove(project.id);
        notify.success(C.deleted(project.name));
        navigate('/app/projects');
      },
    });

  return { extend, remove };
}
