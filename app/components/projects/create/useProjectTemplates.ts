/** Project template writes with `loading`, toasts and the T2 delete confirm (CLAUDE.md UX §1). */
import { useQueryClient } from '@tanstack/react-query';
import { confirmAction } from '~/components/ui/confirmAction';
import {
  applyTemplate,
  createTemplate,
  deleteTemplate,
  type SaveTemplateInput,
  templateKeys,
  type UseTemplateInput,
  updateTemplate,
} from '~/lib/project-templates-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { TEMPLATE_COPY } from './template-create.copy';

export function useProjectTemplates() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: templateKeys.all });

  const create = useApiMutation({
    mutationFn: (input: SaveTemplateInput) => createTemplate(input),
    successMessage: (saved) => TEMPLATE_COPY.saved(saved.name),
    errorTitle: TEMPLATE_COPY.saveFailed,
    onSuccess: refresh,
  });

  const update = useApiMutation({
    mutationFn: ({ id, input }: { id: string; input: SaveTemplateInput }) =>
      updateTemplate(id, input),
    successMessage: (saved) => TEMPLATE_COPY.saved(saved.name),
    errorTitle: TEMPLATE_COPY.saveFailed,
    onSuccess: refresh,
  });

  const remove = useApiMutation({
    mutationFn: ({ id }: { id: string; name: string }) => deleteTemplate(id),
    successMessage: (_d, { name }) => TEMPLATE_COPY.deleted(name),
    errorTitle: TEMPLATE_COPY.deleteFailed,
    onSuccess: refresh,
  });

  const apply = useApiMutation({
    mutationFn: ({ id, input }: { id: string; input: UseTemplateInput }) =>
      applyTemplate(id, input),
    successMessage: (saved) => TEMPLATE_COPY.applySucceeded(saved.name),
    errorTitle: TEMPLATE_COPY.useFailed,
  });

  return {
    create,
    update,
    use: apply,
    remove: {
      ...remove,
      /** Opens the T2 dialog ("Hapus template"); the row is gone only after the user confirms. */
      confirm: (id: string, name: string) =>
        confirmAction({
          title: TEMPLATE_COPY.deleteConfirmTitle(name),
          body: TEMPLATE_COPY.deleteConfirmBody,
          confirmLabel: TEMPLATE_COPY.deleteConfirmLabel,
          danger: true,
          onConfirm: () => void remove.run({ id, name }),
        }),
    },
  };
}
