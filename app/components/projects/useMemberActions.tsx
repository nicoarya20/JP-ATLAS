import { modals } from '@mantine/modals';
import { confirmAction } from '~/components/ui/confirmAction';
import { notify } from '~/components/ui/notify';
import { AddMemberForm } from './AddMemberForm';
import { PEOPLE_COPY as P } from './project-people.copy';
import { type ProjectRole, ROLE_LABELS } from './projects.detail.dummy';
import type { Failure, ProjectRecord } from './projects.logic';
import { projectActions } from './projects.store';

/** Runs a store write and tells the person what happened: a toast on success, the reason on failure. */
function report(failed: Failure | null, success: string) {
  if (failed) notify.error(P.failed, P.errors[failed]);
  else notify.success(success);
  return failed === null;
}

/** The three things the Anggota tab can do: change a role, remove someone, add someone. */
export function useMemberActions(project: ProjectRecord, viewer: string) {
  const changeRole = (name: string, role: ProjectRole) =>
    report(
      projectActions.changeRole(project.id, name, role, viewer),
      P.roleChanged(name, ROLE_LABELS[role]),
    );

  // T2: removing someone takes their access away, so it asks first.
  const remove = (name: string) =>
    confirmAction({
      title: P.removeTitle(name),
      body: P.removeBody,
      confirmLabel: P.removeLabel,
      danger: true,
      onConfirm: () =>
        report(projectActions.removePerson(project.id, name, viewer), P.removed(name)),
    });

  const add = () => {
    const id = modals.open({
      title: P.addTitle,
      children: (
        <AddMemberForm
          taken={project.team.map((m) => m.name)}
          onClose={() => modals.close(id)}
          onSubmit={(name, role) => {
            report(projectActions.addPerson(project.id, name, role, viewer), P.added(name));
            modals.close(id);
          }}
        />
      ),
    });
  };

  return { changeRole, remove, add };
}
