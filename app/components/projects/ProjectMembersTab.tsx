import { ActionIcon, Badge, Button, Group, Paper, Select, Stack, Text } from '@mantine/core';
import { FiUserPlus, FiUsers, FiUserX } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import { type ResponsiveColumn, ResponsiveTable } from '~/components/ui/ResponsiveTable';
import { PEOPLE_COPY as P } from './project-people.copy';
import { type ProjectPerson, type ProjectRole, ROLE_LABELS } from './projects.detail.dummy';
import type { ProjectRecord } from './projects.logic';
import { useMemberActions } from './useMemberActions';

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as ProjectRole[]).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

type Props = { project: ProjectRecord; canManage: boolean; viewer: string };

/** The Anggota tab (flow ⑩): who is on the project and in which role; managers can change all of it. */
export function ProjectMembersTab({ project, canManage, viewer }: Props) {
  const { changeRole, remove, add } = useMemberActions(project, viewer);
  const isLead = (m: ProjectPerson) => m.name === project.lead;

  const role = (m: ProjectPerson) =>
    isLead(m) ? (
      <Badge variant="light">{P.leadBadge}</Badge>
    ) : canManage ? (
      <Select
        aria-label={P.roleOf(m.name)}
        data={ROLE_OPTIONS}
        value={m.role}
        allowDeselect={false}
        onChange={(v) => v && changeRole(m.name, v as ProjectRole)}
      />
    ) : (
      <Badge variant="default">{ROLE_LABELS[m.role]}</Badge>
    );
  const removeButton = (m: ProjectPerson) =>
    canManage && !isLead(m) ? (
      <ActionIcon
        variant="subtle"
        color="danger"
        aria-label={P.remove(m.name)}
        onClick={() => remove(m.name)}
      >
        <FiUserX size="1.25em" aria-hidden />
      </ActionIcon>
    ) : null;
  const person = (m: ProjectPerson) => (
    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
      <MemberAvatar name={m.name} />
      <Text fw={600} truncate>
        {m.name}
      </Text>
    </Group>
  );

  const columns: ResponsiveColumn<ProjectPerson>[] = [
    { key: 'name', header: P.person, cell: person },
    {
      key: 'job',
      header: P.job,
      hideBelow: 'sm',
      cell: (m) => <Text size="sm">{m.jobTitle}</Text>,
    },
    { key: 'role', header: P.role, cell: role, width: 200 },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: P.actions,
            align: 'right',
            width: 80,
            cell: removeButton,
          } as const,
        ]
      : []),
  ];

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Text fw={600}>{P.count(project.team.length)}</Text>
        {canManage && (
          <Button leftSection={<FiUserPlus size="1.25em" aria-hidden />} onClick={add}>
            {P.add}
          </Button>
        )}
      </Group>
      <ResponsiveTable
        label={P.tableLabel}
        columns={columns}
        rows={project.team}
        getRowKey={(m) => m.name}
        empty={<EmptyState icon={FiUsers} title={P.title} description={P.nobody} />}
        renderCard={(m) => (
          <Paper withBorder p="sm" radius="md">
            <Stack gap="xs">
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                  {person(m)}
                  <Text size="xs" c="dimmed">
                    {m.jobTitle}
                  </Text>
                </Stack>
                <div style={{ flexShrink: 0 }}>{removeButton(m)}</div>
              </Group>
              {role(m)}
            </Stack>
          </Paper>
        )}
      />
      {!canManage && (
        <Text size="xs" c="dimmed">
          {P.noAccess}
        </Text>
      )}
    </Stack>
  );
}
