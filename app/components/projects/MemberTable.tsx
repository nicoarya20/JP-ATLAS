/** Project members: a table from `sm` up and cards below it; actions only for those who may manage. */
import type { ProjectMemberItem } from '@server/project/project.dto';
import { FiUsers } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { type ResponsiveColumn, ResponsiveTable } from '~/components/ui/ResponsiveTable';
import {
  MemberActionButtons,
  MemberCard,
  type MemberHandlers,
  MemberIdentity,
  MemberRole,
} from './MemberCard';
import { countManagers, type MemberContext, memberActions } from './member-actions';
import { MEMBERS_COPY } from './members.copy';

type Props = MemberHandlers & {
  members: ProjectMemberItem[];
  canManage: boolean;
  meId: string;
};

export function MemberTable({ members, canManage, meId, ...handlers }: Props) {
  const ctx: MemberContext = { canManage, meId, managerCount: countManagers(members) };
  const columns: ResponsiveColumn<ProjectMemberItem>[] = [
    {
      key: 'name',
      header: MEMBERS_COPY.colName,
      cell: (m) => <MemberIdentity member={m} isMe={m.userId === meId} />,
    },
    { key: 'role', header: MEMBERS_COPY.colRole, cell: (m) => <MemberRole member={m} /> },
  ];
  if (canManage) {
    columns.push({
      key: 'actions',
      header: MEMBERS_COPY.colActions,
      cell: (m) => <MemberActionButtons member={m} actions={memberActions(m, ctx)} {...handlers} />,
    });
  }
  return (
    <ResponsiveTable
      label={MEMBERS_COPY.tableLabel}
      columns={columns}
      rows={members}
      getRowKey={(m) => m.userId}
      renderCard={(m) => (
        <MemberCard
          member={m}
          actions={memberActions(m, ctx)}
          isMe={m.userId === meId}
          {...handlers}
        />
      )}
      empty={
        <EmptyState
          icon={FiUsers}
          title={MEMBERS_COPY.emptyTitle}
          description={MEMBERS_COPY.emptyBody}
        />
      }
    />
  );
}
