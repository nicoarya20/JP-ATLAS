import { Box, Group, Paper, Skeleton, Stack, Text } from '@mantine/core';
import { useTimeFormat } from '~/lib/time-format';
import { UserActionsMenu } from './UserActionsMenu';
import { IdentityCell, RoleBadge, StatusBadge } from './UserCells';
import type { UserListProps } from './UserTable';

const SKELETON_KEYS = ['s0', 's1', 's2', 's3'];

/** Mobile card list (< sm). */
export function UserCardList({ rows, loading, perms, actions, onOpen, empty }: UserListProps) {
  const { relative: formatRelative } = useTimeFormat();
  if (loading) {
    return (
      <Stack gap="xs">
        {SKELETON_KEYS.map((k) => (
          <Skeleton key={k} h={88} radius="md" />
        ))}
      </Stack>
    );
  }
  if (rows.length === 0)
    return (
      <Paper withBorder>{empty}</Paper>
    );
  return (
    <Stack gap="xs">
      {rows.map((u) => (
        <Paper
          key={u.id}
          withBorder
          p="sm"
          onClick={() => onOpen(u)}
          // No `cursor` style prop in Mantine; the whole card opens the detail drawer.
          style={{ cursor: 'pointer' }}
        >
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
            <Stack gap="xs" miw={0} flex={1}>
              <IdentityCell user={u} isSelf={u.id === perms.currentUserId} />
              <Group gap="xs" wrap="wrap">
                <RoleBadge role={u.role} size="xs" />
                <StatusBadge user={u} size="xs" />
                <Text size="xs" c="dimmed">
                  {u.lastLoginAt ? `masuk ${formatRelative(u.lastLoginAt)}` : 'belum pernah masuk'}{' '}
                  · bergabung {formatRelative(u.createdAt)}
                </Text>
              </Group>
            </Stack>
            {/* Stop the card's open-drawer click from firing when using the menu. */}
            <Box onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <UserActionsMenu user={u} perms={perms} actions={actions} onOpen={onOpen} />
            </Box>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
