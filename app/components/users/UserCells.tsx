import { Avatar, Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { isAdminRole, normalizeRole, ROLES } from '@server/permissions';
import { FiCheckCircle } from 'react-icons/fi';
import { type AdminUser, ROLE_LABEL, userStatus } from '~/lib/admin-users-api';
import { useTimeFormat } from '~/lib/time-format';
import { TruncatedText } from '../logs/TruncatedText';

export function roleColor(role: string | null | undefined): string {
  const r = normalizeRole(role);
  return r === ROLES.SUPER_ADMIN ? 'grape' : isAdminRole(r) ? 'blue' : 'gray';
}

export function RoleBadge({
  role,
  size = 'sm',
}: {
  role: string | null | undefined;
  size?: 'xs' | 'sm';
}) {
  const r = normalizeRole(role);
  return (
    <Tooltip
      label={r === ROLES.SUPER_ADMIN ? 'Dikelola lewat SUPER_ADMIN_EMAILS di env' : undefined}
      disabled={r !== ROLES.SUPER_ADMIN}
      withArrow
    >
      <Badge variant="light" color={roleColor(r)} size={size} style={{ flexShrink: 0 }}>
        {ROLE_LABEL[r] ?? r}
      </Badge>
    </Tooltip>
  );
}

export function StatusBadge({ user, size = 'sm' }: { user: AdminUser; size?: 'xs' | 'sm' }) {
  const { dateTime: formatDateTime } = useTimeFormat();
  const status = userStatus(user);
  if (status.key === 'banned') {
    const until = user.banExpires ? `sampai ${formatDateTime(user.banExpires)}` : 'permanen';
    return (
      <Tooltip
        label={`${user.banReason ? `Alasan: ${user.banReason}. ` : ''}Diblokir ${until}.`}
        withArrow
        multiline
        maw={280}
      >
        <Badge color="red" variant="filled" size={size} style={{ flexShrink: 0 }}>
          {status.label}
        </Badge>
      </Tooltip>
    );
  }
  const reason =
    status.key === 'rejected' && user.approvalReason ? `Alasan: ${user.approvalReason}` : undefined;
  return (
    <Tooltip label={reason} disabled={!reason} withArrow multiline maw={280}>
      <Badge color={status.color} variant="light" size={size} style={{ flexShrink: 0 }}>
        {status.label}
      </Badge>
    </Tooltip>
  );
}

/** Avatar + name (+ verified check) + email. */
export function IdentityCell({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  return (
    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
      <Avatar
        src={user.image}
        radius="xl"
        size={32}
        name={user.name}
        color="initials"
        imageProps={{ referrerPolicy: 'no-referrer' }}
      />
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Group gap={4} wrap="nowrap">
          <TruncatedText size="sm" fw={500} lh={1.3} maw={220}>
            {user.name}
          </TruncatedText>
          {user.emailVerified && (
            <Tooltip label="Email terverifikasi" withArrow>
              <Text c="teal" lh={0} style={{ flexShrink: 0 }}>
                <FiCheckCircle size={13} />
              </Text>
            </Tooltip>
          )}
          {isSelf && (
            <Badge size="xs" variant="outline" color="gray" style={{ flexShrink: 0 }}>
              Anda
            </Badge>
          )}
        </Group>
        <TruncatedText size="xs" c="dimmed" lh={1.3} maw={240}>
          {user.email}
        </TruncatedText>
      </Stack>
    </Group>
  );
}

/** "3 hari yang lalu · 12 login" or "Belum pernah login". */
export function ActivityCell({ user }: { user: AdminUser }) {
  const { dateTime: formatDateTime, relative: formatRelative } = useTimeFormat();
  if (!user.lastLoginAt) {
    return (
      <Text size="sm" c="dimmed">
        Belum pernah login
      </Text>
    );
  }
  return (
    <Tooltip label={formatDateTime(user.lastLoginAt)} withArrow openDelay={300}>
      <Stack gap={0}>
        <Text size="sm" lh={1.3}>
          {formatRelative(user.lastLoginAt)}
        </Text>
        <Text size="xs" c="dimmed" lh={1.3}>
          {user.loginCount} login · {user.activeSessions} sesi aktif
        </Text>
      </Stack>
    </Tooltip>
  );
}
