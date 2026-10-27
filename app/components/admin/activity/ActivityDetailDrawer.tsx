import { Divider, Drawer, Group, Stack, Text } from '@mantine/core';
import type { AdminActivityRow } from '~/lib/admin-activity-api';
import { TARGET_LABELS } from '~/lib/audit-api';
import { useTimeFormat } from '~/lib/time-format';
import { Field, Section } from '../../logs/DetailParts';
import { ActionBadge, ActorCell } from './ActivityCells';

/**
 * The admin reading of one entry: who, what, when, and the human summary. Deliberately no raw meta,
 * IP, user agent or ids — those are the "nomor id yang tidak berarti" the Admin page exists to spare
 * its reader (P11 AD-18).
 */
export function ActivityDetailDrawer({
  row,
  onClose,
}: {
  row: AdminActivityRow | null;
  onClose: () => void;
}) {
  const { dateTime: formatDateTime } = useTimeFormat();
  return (
    <Drawer
      opened={row !== null}
      onClose={onClose}
      position="right"
      size="md"
      title="Detail aktivitas"
      padding="md"
    >
      {row && (
        <Stack gap="lg">
          <Group justify="space-between" wrap="nowrap">
            <ActionBadge action={row.action} />
            <Text size="sm" c="dimmed">
              {formatDateTime(row.createdAt)}
            </Text>
          </Group>
          <Text size="sm">{row.summary}</Text>
          <Divider />
          <Section title="Siapa">
            <ActorCell row={row} />
          </Section>
          <Divider />
          <Section title="Terkait">
            <Field label="Jenis">
              <Text size="sm">{TARGET_LABELS[row.targetType] ?? row.targetType}</Text>
            </Field>
          </Section>
        </Stack>
      )}
    </Drawer>
  );
}
