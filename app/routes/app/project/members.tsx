import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core';
import { requireUser } from '@server/guard';
import type { ProjectMemberRole } from '@server/pm/enums';
import { toPrincipal } from '@server/project/membership.query';
import type { ProjectMemberItem } from '@server/project/project.dto';
import { getProjectDetail, listProjectMembers } from '@server/project/project.query';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FiAlertCircle, FiUserPlus } from 'react-icons/fi';
import { data } from 'react-router';
import { AddMemberModal } from '~/components/projects/AddMemberModal';
import { ChangeRoleModal } from '~/components/projects/ChangeRoleModal';
import type { MemberBusy } from '~/components/projects/MemberCard';
import { MemberTable } from '~/components/projects/MemberTable';
import { MEMBERS_COPY } from '~/components/projects/members.copy';
import { NOT_FOUND_TEXT } from '~/components/projects/projects.copy';
import { useProjectActions } from '~/components/projects/useProjectActions';
import { toJson } from '~/lib/loader-json';
import { fetchProjectMembers, type PickerPerson, projectKeys } from '~/lib/projects-api';
import type { Route } from './+types/members';

export function meta() {
  return [{ title: 'Anggota Proyek — Simple PM' }];
}

// Loads and checks access itself: the layout loader runs in parallel and does not protect this one.
export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const principal = toPrincipal(actor);
  const [project, members] = await Promise.all([
    getProjectDetail(principal, params.projectId, new Date()),
    listProjectMembers(principal, params.projectId),
  ]);
  if (!project || !members) throw data(NOT_FOUND_TEXT, { status: 404 });
  return {
    projectId: project.id,
    // Managing members is part of managing the project; the page never compares a role.
    canManage: project.can.update === true,
    meId: principal.id,
    members: toJson<ProjectMemberItem[]>(members),
  };
}

/** "Anggota" tab: list, add, change role and remove (both T2 through `confirmAction`). */
export default function ProjectMembersPage({ loaderData }: Route.ComponentProps) {
  const { projectId, canManage, meId } = loaderData;
  const actions = useProjectActions();
  const [adding, setAdding] = useState(false);
  const [roleOf, setRoleOf] = useState<ProjectMemberItem | null>(null);
  const [target, setTarget] = useState<NonNullable<MemberBusy>>();
  const members = useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => fetchProjectMembers(projectId),
    initialData: loaderData.members,
  });
  const saving =
    target?.action === 'remove' ? actions.removeMember.loading : actions.changeRole.loading;
  const busy: MemberBusy = target && saving ? target : null;
  const ref = (m: ProjectMemberItem) => ({ userId: m.userId, name: m.name });
  const add = async (person: PickerPerson, role: ProjectMemberRole) =>
    (
      await actions.addMember.run({
        id: projectId,
        member: { userId: person.id, role },
        name: person.name,
      })
    ).ok;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Stack gap={4}>
          <Title order={2} size="h3">
            {MEMBERS_COPY.title}
          </Title>
          <Text c="dimmed">{MEMBERS_COPY.description}</Text>
        </Stack>
        {canManage && (
          <Button
            leftSection={<FiUserPlus size="1.25em" aria-hidden />}
            onClick={() => setAdding(true)}
          >
            {MEMBERS_COPY.add}
          </Button>
        )}
      </Group>
      {members.isError && (
        <Alert color="danger" icon={<FiAlertCircle size="1.25em" aria-hidden />}>
          {MEMBERS_COPY.loadFailed}
        </Alert>
      )}
      <MemberTable
        members={members.data}
        canManage={canManage}
        meId={meId}
        onChangeRole={setRoleOf}
        onRemove={(m) => {
          setTarget({ userId: m.userId, action: 'remove' });
          actions.removeMember.confirm(projectId, ref(m));
        }}
        busy={busy}
      />
      {canManage && (
        <>
          <AddMemberModal
            projectId={projectId}
            opened={adding}
            loading={actions.addMember.loading}
            onClose={() => setAdding(false)}
            onAdd={add}
          />
          <ChangeRoleModal
            member={roleOf}
            onClose={() => setRoleOf(null)}
            onSubmit={(m, role) => {
              setRoleOf(null);
              setTarget({ userId: m.userId, action: 'changeRole' });
              actions.changeRole.confirm(projectId, ref(m), role);
            }}
          />
        </>
      )}
    </Stack>
  );
}
