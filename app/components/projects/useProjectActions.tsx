/** Project and member writes with `loading`, toasts and cache refresh; member changes ask first (T2). */
import type { ProjectMemberRole, ProjectStatus } from '@server/pm/enums';
import { confirmAction } from '~/components/ui/confirmAction';
import { PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import {
  addProjectMember,
  changeProjectMemberRole,
  createProject,
  type ProjectCreateInput,
  type ProjectMemberInput,
  type ProjectPatch,
  removeProjectMember,
  setProjectStatus,
  updateProject,
} from '~/lib/projects-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { type ProjectEditPlan, saveProjectEdit } from './project-edit';
import { ACTION_COPY, CONFIRM_COPY, MEMBER_ROLE_LABELS } from './projects.copy';
import { useRefreshProject } from './summary/useRefreshProject';

/** A member as the dialogs name them. */
export type MemberRef = { userId: string; name: string };

export function useProjectActions() {
  // Every write can change list rows, the member tab and the header; the header is loader-fed, so
  // the cache alone is not enough (PRJ-02).
  const refresh = useRefreshProject();

  const create = useApiMutation({
    mutationFn: (input: ProjectCreateInput) => createProject(input),
    successMessage: (saved) => ACTION_COPY.created(saved.name),
    errorTitle: ACTION_COPY.createFailed,
    onSuccess: refresh,
  });

  const update = useApiMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjectPatch }) => updateProject(id, patch),
    successMessage: ACTION_COPY.updated,
    errorTitle: ACTION_COPY.updateFailed,
    onSuccess: refresh,
  });

  /** "Ubah proyek": info, status and Lead in one save; refreshes on failure too, a part may be saved. */
  const edit = useApiMutation({
    mutationFn: ({ id, changes }: { id: string; changes: ProjectEditPlan }) =>
      saveProjectEdit(id, changes),
    successMessage: ACTION_COPY.updated,
    errorTitle: ACTION_COPY.updateFailed,
    onSuccess: refresh,
    onError: () => void refresh(),
  });

  const setStatus = useApiMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) =>
      setProjectStatus(id, status),
    successMessage: (_saved, { status }) =>
      ACTION_COPY.statusChanged(PROJECT_STATUS_LABELS[status].label),
    errorTitle: ACTION_COPY.statusFailed,
    onSuccess: refresh,
  });

  const addMember = useApiMutation({
    mutationFn: ({ id, member }: { id: string; member: ProjectMemberInput; name: string }) =>
      addProjectMember(id, member),
    successMessage: (_d, { name }) => ACTION_COPY.memberAdded(name),
    errorTitle: ACTION_COPY.addMemberFailed,
    onSuccess: refresh,
  });

  const changeRole = useApiMutation({
    mutationFn: ({
      id,
      member,
      role,
    }: {
      id: string;
      member: MemberRef;
      role: ProjectMemberRole;
    }) => changeProjectMemberRole(id, member.userId, role),
    successMessage: (_d, { member }) => ACTION_COPY.roleChanged(member.name),
    errorTitle: ACTION_COPY.changeRoleFailed,
    onSuccess: refresh,
  });

  const removeMember = useApiMutation({
    mutationFn: ({ id, member }: { id: string; member: MemberRef }) =>
      removeProjectMember(id, member.userId),
    successMessage: (_d, { member }) => ACTION_COPY.memberRemoved(member.name),
    errorTitle: ACTION_COPY.removeMemberFailed,
    onSuccess: refresh,
  });

  return {
    create,
    update,
    edit,
    setStatus,
    addMember,
    changeRole: {
      ...changeRole,
      /** Opens the T2 dialog; the change runs only after the user confirms. */
      confirm: (id: string, member: MemberRef, role: ProjectMemberRole) =>
        confirmAction({
          title: CONFIRM_COPY.roleTitle(member.name),
          body: CONFIRM_COPY.roleBody(MEMBER_ROLE_LABELS[role]),
          confirmLabel: CONFIRM_COPY.roleLabel,
          onConfirm: () => void changeRole.run({ id, member, role }),
        }),
    },
    removeMember: {
      ...removeMember,
      /** Opens the T2 dialog; the member is removed only after the user confirms. */
      confirm: (id: string, member: MemberRef) =>
        confirmAction({
          title: CONFIRM_COPY.removeTitle(member.name),
          body: CONFIRM_COPY.removeBody,
          confirmLabel: CONFIRM_COPY.removeLabel,
          danger: true,
          onConfirm: () => void removeMember.run({ id, member }),
        }),
    },
  };
}
