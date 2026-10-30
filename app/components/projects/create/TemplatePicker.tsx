/** "Pakai template" (plan §5.1): the caller's own templates, a card each, with the empty state CLAUDE.md UX requires. */
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { FiFileText, FiTrash2 } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { fetchTemplates, type TemplateListItem, templateKeys } from '~/lib/project-templates-api';
import { TEMPLATE_COPY as COPY } from './template-create.copy';
import { useProjectTemplates } from './useProjectTemplates';

type Props = {
  onPick: (template: TemplateListItem) => void;
  onCreateNew: () => void;
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' });

function TemplateCard({
  item,
  onPick,
  onDelete,
  deleting,
}: {
  item: TemplateListItem;
  onPick: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
          <Text fw={600} truncate>
            {item.name}
          </Text>
          <Group gap={6} wrap="wrap">
            <Badge size="sm" variant="light" color={item.source === 'story' ? 'atlas' : 'gray'}>
              {item.source === 'story' ? COPY.sourceStory : COPY.sourceManual}
            </Badge>
            <Text size="xs" c="dimmed">
              {COPY.phaseCount(item.phaseCount)} · {COPY.taskCount(item.taskCount)}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {COPY.createdAt(dateFormatter.format(new Date(item.createdAt)))}
          </Text>
        </Stack>
        <ActionIcon
          variant="subtle"
          color="danger"
          aria-label={COPY.deleteButton}
          loading={deleting}
          onClick={onDelete}
          style={{ flexShrink: 0 }}
        >
          <FiTrash2 size="1.25em" aria-hidden />
        </ActionIcon>
      </Group>
      <Button fullWidth mt="sm" onClick={onPick}>
        {COPY.useButton}
      </Button>
    </Paper>
  );
}

export function TemplatePicker({ onPick, onCreateNew }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: templateKeys.list(''),
    queryFn: () => fetchTemplates(''),
  });
  const templates = useProjectTemplates();

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Title order={3}>{COPY.pickerTitle}</Title>
        <Button variant="default" onClick={onCreateNew}>
          {COPY.createNew}
        </Button>
      </Group>
      {isLoading ? (
        <Stack gap="xs">
          <Skeleton height={100} radius="md" />
          <Skeleton height={100} radius="md" />
        </Stack>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={FiFileText}
          title={COPY.pickerEmpty}
          description={COPY.pickerEmptyHint}
          action={{ label: COPY.createNew, onClick: onCreateNew }}
        />
      ) : (
        <Stack gap="xs">
          {data.items.map((item) => (
            <TemplateCard
              key={item.id}
              item={item}
              onPick={() => onPick(item)}
              onDelete={() => templates.remove.confirm(item.id, item.name)}
              deleting={templates.remove.loading}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
