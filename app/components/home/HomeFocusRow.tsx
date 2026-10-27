import { Anchor, Badge, Button, Group, Stack, Text } from '@mantine/core';
import type { HomeFocusTask } from '@server/home/home.dto';
import { FiAlertTriangle } from 'react-icons/fi';
import { Link } from 'react-router';
import { describeDue } from '~/components/ui/DateText';
import { HOME_COPY } from './home.copy';
import { useHomeStep } from './useHomeStep';

type Props = { task: HomeFocusTask; today: string };

/** Title, where it belongs and when it is due, plus the one button the server allows for this task. */
export function HomeFocusRow({ task, today }: Props) {
  const step = useHomeStep(task);
  const overdue = task.group === 'overdue' && task.overdueDays !== null;
  const due = task.dueDate && !overdue ? describeDue(task.dueDate, today).text : null;
  const action = task.action;
  return (
    <Group justify="space-between" wrap="wrap" gap="xs" py="xs">
      {/* The flex basis lets the button drop under the title on a narrow phone instead of squeezing it. */}
      <Stack gap={4} miw={0} flex="1 1 14rem">
        <Anchor component={Link} to={`/app/tasks/${task.number}`} fw={600} c="inherit">
          {task.title}
        </Anchor>
        <Group gap="xs" wrap="wrap">
          {overdue && (
            <Badge
              color="danger"
              variant="filled"
              tt="none"
              leftSection={<FiAlertTriangle size="1.25em" aria-hidden />}
            >
              {HOME_COPY.focus.late(task.overdueDays ?? 0)}
            </Badge>
          )}
          <Text size="xs" c="dimmed">
            {[task.project.name, due].filter(Boolean).join(' · ')}
          </Text>
        </Group>
      </Stack>
      {action && (
        <Button
          variant={action === 'complete' ? 'default' : 'light'}
          flex="0 0 auto"
          loading={step.loading}
          // Every row says the same word, so the name carries the task for screen readers.
          aria-label={`${action === 'complete' ? HOME_COPY.focus.done : HOME_COPY.focus.start}: ${task.title}`}
          onClick={() => void step.run(action)}
        >
          {action === 'complete' ? HOME_COPY.focus.done : HOME_COPY.focus.start}
        </Button>
      )}
    </Group>
  );
}
