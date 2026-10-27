/** "Diperpanjang ×N" badge; opening it lists every earlier due date with who moved it and why. */
import { Badge, Button, Loader, Popover, Stack, Text, UnstyledButton } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { FiClock } from 'react-icons/fi';
import { DateText, formatCalendarDate } from '~/components/ui/DateText';
import {
  type DeadlineExtensionDto,
  deadlineKeys,
  fetchExtensions,
} from '~/lib/project-deadline-api';
import { BADGE_COPY, EXTEND_CATEGORY_LABELS } from './summary.copy';

type ListProps = { items: readonly DeadlineExtensionDto[]; total: number };

/** The history rows, newest first as the server sends them. */
export function ExtensionList({ items, total }: ListProps) {
  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {BADGE_COPY.empty}
      </Text>
    );
  }
  return (
    <Stack gap="sm" role="list">
      {items.map((e) => (
        <Stack key={e.id} gap={4} role="listitem">
          <Text size="sm" fw={600}>
            {BADGE_COPY.move(formatCalendarDate(e.oldDueDate), formatCalendarDate(e.newDueDate))}
          </Text>
          <Text size="sm">{`${EXTEND_CATEGORY_LABELS[e.reasonCategory]}: ${e.reason}`}</Text>
          <Text size="xs" c="dimmed" component="div">
            {`${BADGE_COPY.by(e.extendedByName)} · `}
            <DateText value={e.createdAt} mode="date" />
          </Text>
        </Stack>
      ))}
      {total > items.length && (
        <Text size="xs" c="dimmed">
          {BADGE_COPY.more(items.length, total)}
        </Text>
      )}
    </Stack>
  );
}

/** Fetched only while the popover is open, so a page full of projects never asks for it. */
function History({ projectId }: { projectId: string }) {
  const history = useQuery({
    queryKey: deadlineKeys.extensions(projectId),
    queryFn: () => fetchExtensions(projectId),
  });
  if (history.isError) {
    return (
      <Stack gap="xs" align="flex-start">
        <Text size="sm" c="danger">
          {BADGE_COPY.failed}
        </Text>
        <Button variant="light" size="sm" onClick={() => void history.refetch()}>
          {BADGE_COPY.retry}
        </Button>
      </Stack>
    );
  }
  if (!history.data) {
    return (
      <Text size="sm" c="dimmed" role="status">
        <Loader size="xs" mr="xs" />
        {BADGE_COPY.loading}
      </Text>
    );
  }
  return <ExtensionList items={history.data.items} total={history.data.count} />;
}

type Props = { projectId: string; count: number };

export function DeadlineBadge({ projectId, count }: Props) {
  if (count <= 0) return null;
  return (
    <Popover width={320} position="bottom-start" withArrow shadow="md" trapFocus withinPortal>
      <Popover.Target>
        <UnstyledButton aria-label={`${BADGE_COPY.label(count)}. ${BADGE_COPY.title}`}>
          <Badge
            variant="light"
            color="gray"
            tt="none"
            leftSection={<FiClock size="1.25em" aria-hidden />}
          >
            {BADGE_COPY.label(count)}
          </Badge>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text fw={600}>{BADGE_COPY.title}</Text>
          <History projectId={projectId} />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
