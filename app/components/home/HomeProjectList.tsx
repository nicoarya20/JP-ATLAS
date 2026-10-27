import { Anchor, Group, Stack, Text } from '@mantine/core';
import type { HomeProject } from '@server/home/home.dto';
import { FiFolder } from 'react-icons/fi';
import { Link } from 'react-router';
import { ConditionPill } from '~/components/pm/ConditionPill';
import { ProgressBar } from '~/components/pm/ProgressBar';
import { formatCalendarDate } from '~/components/ui/DateText';
import { EmptyState } from '~/components/ui/EmptyState';
import { HOME_COPY, HOME_LINKS } from './home.copy';

/** My running projects, the ones that need a look first: condition, progress and what makes it so. */
export function HomeProjectList({ items }: { items: HomeProject[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FiFolder}
        title={HOME_COPY.agenda.noProjects}
        description={HOME_COPY.agenda.noProjectsHint}
        action={{ label: HOME_COPY.more, to: HOME_LINKS.projects }}
      />
    );
  }
  return (
    <Stack gap="sm">
      {items.map((p) => {
        const note = [
          p.condition && p.condition !== 'on_track' ? p.reason : null,
          p.dueDate ? HOME_COPY.agenda.due(formatCalendarDate(p.dueDate)) : null,
        ].filter(Boolean);
        return (
          <Stack key={p.id} gap="xs">
            <Group justify="space-between" wrap="wrap" gap="xs">
              <Anchor component={Link} to={`${HOME_LINKS.projects}/${p.id}`} fw={600} c="inherit">
                {p.name}
              </Anchor>
              {p.condition && <ConditionPill condition={p.condition} />}
            </Group>
            <ProgressBar done={p.progress.done} total={p.progress.total} />
            {note.length > 0 && (
              <Text size="xs" c="dimmed">
                {note.join(' · ')}
              </Text>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
