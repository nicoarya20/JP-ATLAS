/**
 * Ganti Pengelola panel in the detail drawer (AD-13, option A): pick a new Pengelola from the
 * project's other managers, then confirm (T2). No promotion — when the project has no other
 * manager, the panel says so honestly instead of offering a way to add one.
 */
import { Button, Loader, Select, Stack, Text } from '@mantine/core';
import type { ProjectListItem } from '@server/project/project.dto';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminProjectKeys, fetchProjectManagers } from '~/lib/admin-projects-api';
import { MANAGER_COPY } from './projects.copy';
import { useChangeManager } from './useChangeManager';

type Props = {
  project: ProjectListItem;
  /** Called after a successful handover: refresh the list and close the drawer. */
  onDone: () => void;
};

export function ChangeManagerPanel({ project, onDone }: Props) {
  const managersQ = useQuery({
    queryKey: [...adminProjectKeys.all, 'managers', project.id],
    queryFn: () => fetchProjectManagers(project.id),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const { confirm, loading } = useChangeManager(onDone);

  if (managersQ.isLoading) return <Loader size="sm" />;

  const managers = managersQ.data?.managers ?? [];
  if (managers.length === 0)
    return (
      <Text size="sm" c="dimmed">
        {MANAGER_COPY.noCandidates}
      </Text>
    );

  const chosen = managers.find((m) => m.userId === selected);

  return (
    <Stack gap="sm">
      <Select
        label={MANAGER_COPY.pickerLabel}
        placeholder={MANAGER_COPY.pickerPlaceholder}
        data={managers.map((m) => ({ value: m.userId, label: m.name }))}
        value={selected}
        onChange={setSelected}
        searchable
      />
      <Button
        disabled={!chosen}
        loading={loading}
        onClick={() => chosen && confirm(project, { id: chosen.userId, name: chosen.name })}
      >
        {MANAGER_COPY.changeButton}
      </Button>
    </Stack>
  );
}
