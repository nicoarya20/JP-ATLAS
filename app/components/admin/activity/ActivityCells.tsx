import { Avatar, Badge, Group, Stack, Text } from '@mantine/core';
import type { AdminActivityRow } from '~/lib/admin-activity-api';
import { actionMeta } from '~/lib/audit-api';
import { TruncatedText } from '../../logs/TruncatedText';

/** Indonesian label + role colour for an action, from the shared `ACTION_META`. */
export function ActionBadge({ action, size = 'sm' }: { action: string; size?: 'xs' | 'sm' }) {
  const m = actionMeta(action);
  return (
    <Badge variant="light" color={m.color} size={size} flex="0 0 auto">
      {m.label}
    </Badge>
  );
}

/** Actor avatar + name over the masked email; "Sistem" when no actor was attached. */
export function ActorCell({ row }: { row: AdminActivityRow }) {
  if (!row.actorName && !row.actorEmail) {
    return (
      <Text size="sm" c="dimmed">
        Sistem
      </Text>
    );
  }
  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar
        src={row.actorImage}
        size={26}
        radius="xl"
        name={row.actorName ?? undefined}
        color="initials"
        imageProps={{ referrerPolicy: 'no-referrer' }}
      />
      <Stack gap={0} miw={0}>
        <TruncatedText size="sm" fw={500} lh={1.3} maw={180}>
          {row.actorName ?? row.actorEmail ?? '—'}
        </TruncatedText>
        {row.actorEmail && (
          <TruncatedText size="xs" c="dimmed" lh={1.3} maw={180}>
            {row.actorEmail}
          </TruncatedText>
        )}
      </Stack>
    </Group>
  );
}
