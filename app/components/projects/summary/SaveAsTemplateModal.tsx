/** "Simpan sebagai template" dialog: names the template; the project's structure is copied by the server. */
import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { PROJECT_NAME_MAX } from '@server/project/project.limits';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { saveProjectAsTemplate, templateKeys } from '~/lib/project-templates-api';
import { useApiMutation } from '~/lib/use-api-mutation';
import { TEMPLATE_COPY as COPY } from '../create/template-create.copy';

type Target = { projectId: string; projectName: string };

function SaveAsTemplateForm({ projectId, projectName, onClose }: Target & { onClose: () => void }) {
  const [name, setName] = useState(projectName);
  const queryClient = useQueryClient();
  const save = useApiMutation({
    mutationFn: (templateName: string) => saveProjectAsTemplate({ projectId, name: templateName }),
    successMessage: (saved) =>
      saved.omitted.phases + saved.omitted.tasks > 0
        ? COPY.savedOmitted(saved.name, saved.omitted.phases, saved.omitted.tasks)
        : COPY.saved(saved.name),
    errorTitle: COPY.saveFailed,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: templateKeys.all });
      onClose();
    },
  });
  const trimmed = name.trim();
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {COPY.saveDialogHint}
      </Text>
      <TextInput
        label={COPY.nameLabel}
        value={name}
        maxLength={PROJECT_NAME_MAX}
        onChange={(e) => setName(e.currentTarget.value)}
        data-autofocus
      />
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={onClose} disabled={save.loading}>
          {COPY.cancel}
        </Button>
        <Button
          loading={save.loading}
          disabled={trimmed === ''}
          onClick={() => void save.run(trimmed)}
        >
          {COPY.saveDialogSubmit}
        </Button>
      </Group>
    </Stack>
  );
}

/** Opens the dialog for one project; the name starts as the project's own. */
export function openSaveAsTemplateModal(target: Target) {
  const id = modals.open({
    title: COPY.saveDialogTitle,
    children: <SaveAsTemplateForm {...target} onClose={() => modals.close(id)} />,
  });
  return id;
}
