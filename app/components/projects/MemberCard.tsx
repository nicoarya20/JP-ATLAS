/** Pieces of one member row (name, role, actions) shared by the table and the mobile card. */
import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import type { ProjectMemberItem } from '@server/project/project.dto';
import { FiStar, FiUserCheck, FiUserMinus } from 'react-icons/fi';
import { MemberAvatar } from '~/components/ui/MemberAvatar';
import type { MemberRowActions } from './member-actions';
import { MEMBER_ROLE_HINTS, MEMBERS_COPY } from './members.copy';
import { MEMBER_ROLE_LABELS } from './projects.copy';

export type MemberBusy = { userId: string; action: 'changeRole' | 'remove' } | null;

export type MemberHandlers = {
  onChangeRole: (m: ProjectMemberItem) => void;
  onRemove: (m: ProjectMemberItem) => void;
  /** The row whose change is being saved, so only its button spins. */
  busy?: MemberBusy;
};

export function MemberIdentity({ member, isMe }: { member: ProjectMemberItem; isMe: boolean }) {
  return (
    <Group gap="sm" wrap="nowrap" miw={0}>
      <MemberAvatar name={member.name} image={member.image} />
      <Stack gap={4} miw={0}>
        <Group gap="xs" wrap="wrap">
          <Text fw={500} truncate>
            {member.name} {isMe && MEMBERS_COPY.you}
          </Text>
          {member.isLead && (
            <Badge variant="light" leftSection={<FiStar size="1.25em" aria-hidden />}>
              {MEMBERS_COPY.leadBadge}
            </Badge>
          )}
        </Group>
        {member.jobTitle && (
          <Text size="sm" c="dimmed" truncate>
            {member.jobTitle}
          </Text>
        )}
      </Stack>
    </Group>
  );
}

/** Role label; a Pemantau gets the plain-language note of what that means (R10 F7). */
export function MemberRole({ member }: { member: ProjectMemberItem }) {
  const hint = MEMBER_ROLE_HINTS[member.role];
  return (
    <Stack gap={2}>
      <Text>{MEMBER_ROLE_LABELS[member.role]}</Text>
      {hint && (
        <Text size="sm" c="dimmed">
          {hint}
        </Text>
      )}
    </Stack>
  );
}

type ActionsProps = MemberHandlers & { member: ProjectMemberItem; actions: MemberRowActions };

/** Nothing when the caller may not manage members; a disabled button always shows its reason in text. */
export function MemberActionButtons({
  member,
  actions,
  onChangeRole,
  onRemove,
  busy,
}: ActionsProps) {
  const { changeRole, remove } = actions;
  const spins = (action: NonNullable<MemberBusy>['action']) =>
    busy?.userId === member.userId && busy.action === action;
  if (!changeRole && !remove) return null;
  const reasons = [...new Set([changeRole?.blocked, remove?.blocked].filter(Boolean))];
  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="wrap">
        {changeRole && (
          <Button
            variant="default"
            leftSection={<FiUserCheck size="1.25em" aria-hidden />}
            aria-label={MEMBERS_COPY.changeRoleOf(member.name)}
            disabled={changeRole.blocked !== null}
            loading={spins('changeRole')}
            onClick={() => onChangeRole(member)}
          >
            {MEMBERS_COPY.changeRole}
          </Button>
        )}
        {remove && (
          <Button
            variant="light"
            color="danger"
            leftSection={<FiUserMinus size="1.25em" aria-hidden />}
            aria-label={MEMBERS_COPY.removeOf(member.name)}
            disabled={remove.blocked !== null}
            loading={spins('remove')}
            onClick={() => onRemove(member)}
          >
            {MEMBERS_COPY.remove}
          </Button>
        )}
      </Group>
      {reasons.map((r) => (
        <Text key={r} size="sm" c="dimmed" data-reason>
          {r}
        </Text>
      ))}
    </Stack>
  );
}

type CardProps = MemberHandlers & {
  member: ProjectMemberItem;
  actions: MemberRowActions;
  isMe: boolean;
};

/** Mobile layout of one member (below `sm`): identity, role, then actions full width. */
export function MemberCard({ member, actions, isMe, ...handlers }: CardProps) {
  return (
    <Stack gap="sm">
      <MemberIdentity member={member} isMe={isMe} />
      <MemberRole member={member} />
      <MemberActionButtons member={member} actions={actions} {...handlers} />
    </Stack>
  );
}
