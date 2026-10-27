/**
 * The Ganti Pengelola action (AD-13): a T2 confirm dialog that names the impact, then the PUT with a
 * `loading` flag and a success/failure toast. Branch-independent — it takes an already-chosen target,
 * so the same hook serves whichever picker the A/B decision settles on.
 */
import { confirmAction } from '~/components/ui/confirmAction';
import { setProjectManager } from '~/lib/admin-projects-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { managerChangeDialog, MANAGER_COPY } from './projects.copy';

type Project = {
  id: string;
  name: string;
  lead: { name: string } | null;
  progress: { total: number };
};
type Target = { id: string; name: string };

/** `onDone` refreshes the list after a successful handover (the drawer stays open on the fresh row). */
export function useChangeManager(onDone: () => void) {
  const mutation = useApiMutation({
    mutationFn: ({ project, target }: { project: Project; target: Target }) =>
      setProjectManager(project.id, target.id),
    successMessage: (_d, { target }) => MANAGER_COPY.success(target.name),
    errorTitle: MANAGER_COPY.failed,
    onSuccess: () => void onDone(),
  });

  /** Opens the confirm dialog; on confirm, runs the mutation (the trigger button shows `loading`). */
  const confirm = (project: Project, target: Target) => {
    const { title, body } = managerChangeDialog(project, target.name);
    confirmAction({
      title,
      body,
      confirmLabel: MANAGER_COPY.confirmLabel,
      onConfirm: () => void mutation.run({ project, target }),
    });
  };

  return { confirm, loading: mutation.loading };
}
