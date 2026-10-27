/**
 * The operation browser: one collapsible group per tag, one collapsible row per
 * operation. Grouping keeps a key with a wide scope set from turning the page
 * into a wall of text, and every row stays inside 375 px because the method
 * badge is fixed-width and the path wraps instead of scrolling sideways.
 */
import { Accordion, Badge, Group, Paper, Stack, Text } from '@mantine/core';
import type { Components } from '~/lib/openapi-schema';
import type { OperationGroup, ViewOperation } from '~/lib/openapi-types';
import { methodColor } from '~/lib/openapi-view';
import { OperationDetail } from './OperationDetail';

function OperationControl({ op }: { op: ViewOperation }) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start" miw={0}>
      <Badge
        size="sm"
        color={methodColor(op.method)}
        variant="filled"
        flex="0 0 auto" miw={64}
      >
        {op.method}
      </Badge>
      <Stack gap={0} miw={0} flex={1}>
        <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
          {op.path}
        </Text>
        {op.summary && (
          <Text size="xs" c="dimmed">
            {op.summary}
          </Text>
        )}
      </Stack>
    </Group>
  );
}

function GroupPanel({
  group,
  components,
  baseUrl,
}: {
  group: OperationGroup;
  components: Components;
  baseUrl: string;
}) {
  return (
    <Accordion variant="separated" chevronPosition="left" radius="md" multiple>
      {group.operations.map((op) => (
        <Accordion.Item key={op.id} value={op.id}>
          <Accordion.Control>
            <OperationControl op={op} />
          </Accordion.Control>
          <Accordion.Panel>
            <OperationDetail op={op} components={components} baseUrl={baseUrl} />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

export function OperationList({
  groups,
  components,
  baseUrl,
  openTags,
  onOpenTagsChange,
}: {
  groups: OperationGroup[];
  components: Components;
  baseUrl: string;
  openTags: string[];
  onOpenTagsChange: (tags: string[]) => void;
}) {
  return (
    <Accordion
      variant="contained"
      radius="md"
      multiple
      value={openTags}
      onChange={onOpenTagsChange}
    >
      {groups.map((group) => (
        <Accordion.Item key={group.tag} value={group.tag}>
          <Accordion.Control>
            <Group gap="xs" wrap="wrap">
              <Text fw={600}>{group.tag}</Text>
              <Badge size="sm" variant="light" color="gray">
                {group.operations.length}
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder={false} p={0} bg="transparent">
              <GroupPanel group={group} components={components} baseUrl={baseUrl} />
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
