/**
 * One Trash item as the wireframe draws it: kind chip, bold title, one info line and "Pulihkan" on
 * the right (under the text on a phone). An item waiting for a trashed project has the button off
 * and says what to do first, with a link to the project when the caller can find it.
 */
import { Anchor, Badge, Flex, Group, Paper, Stack, Text } from '@mantine/core';
import type { TrashItem } from '~/lib/trash-api';
import { describeItem } from '~/lib/trash-view';
import { RestoreAction } from './RestoreAction';
import { TRASH_BLOCKED_COPY } from './trash.copy';

type Props = {
  item: TrashItem;
  /** This card's restore is running. */
  restoring: boolean;
  /** Another card's restore is running; one at a time. */
  busyElsewhere: boolean;
  /** The card "Lihat proyeknya" jumped to. */
  highlighted: boolean;
  onRestore: (item: TrashItem) => void;
  onViewProject: (projectId: string) => void;
};

/** Id of the card's element, the target of the jump to a project. */
export const trashCardId = (key: string) => `trash-${key}`;

function BlockedNote({
  blocked,
  onViewProject,
}: {
  blocked: { projectId: string; visible: boolean };
  onViewProject: (projectId: string) => void;
}) {
  if (!blocked.visible) {
    return (
      <Text size="sm" fw={600}>
        {TRASH_BLOCKED_COPY.askManager}
      </Text>
    );
  }
  return (
    <Group gap="md" wrap="wrap">
      <Text size="sm" fw={600} c="dimmed">
        {TRASH_BLOCKED_COPY.restoreFirst}
      </Text>
      <Anchor
        component="button"
        type="button"
        size="sm"
        fw={700}
        onClick={() => onViewProject(blocked.projectId)}
      >
        {TRASH_BLOCKED_COPY.viewProject}
      </Anchor>
    </Group>
  );
}

export function TrashItemCard({
  item,
  restoring,
  busyElsewhere,
  highlighted,
  onRestore,
  onViewProject,
}: Props) {
  const view = describeItem(item);
  return (
    <Paper
      id={trashCardId(view.key)}
      withBorder
      radius="md"
      p="sm"
      bd={highlighted ? '2px solid var(--mantine-primary-color-filled)' : undefined}
    >
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        gap="sm"
        align={{ base: 'stretch', sm: 'center' }}
        justify="space-between"
      >
        <Group gap="md" wrap="nowrap" align="flex-start" style={{ minWidth: 0, flex: 1 }}>
          <Badge variant="light" color="gray" miw="5em" style={{ flexShrink: 0 }}>
            {view.chip}
          </Badge>
          <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
            <Text fw={700} style={{ overflowWrap: 'anywhere' }}>
              {view.title}
            </Text>
            <Text size="sm" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
              {view.info}
            </Text>
            {view.blocked && <BlockedNote blocked={view.blocked} onViewProject={onViewProject} />}
          </Stack>
        </Group>
        <RestoreAction
          cap={item.can.restore}
          ariaLabel={view.restoreLabel}
          loading={restoring}
          busyElsewhere={busyElsewhere}
          onRestore={() => onRestore(item)}
        />
      </Flex>
    </Paper>
  );
}
