import { Anchor, Button, Divider, Group, Stack, Text } from '@mantine/core';
import type {
  HomeFocus as Focus,
  HomeCounters,
  HomeScheduleGroup,
  Widget,
} from '@server/home/home.dto';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router';
import { SCHEDULE_GROUP_LABELS } from '~/components/tasks/tasks.copy';
import { EmptyState } from '~/components/ui/EmptyState';
import { HomeFocusRow } from './HomeFocusRow';
import { HomeSection, type Retry } from './HomeSection';
import { HOME_COPY, HOME_LINKS } from './home.copy';

/** Display order of the groups; the server already sorts the rows, so a group is a run of them. */
const GROUP_ORDER: HomeScheduleGroup[] = ['overdue', 'today', 'tomorrow', 'week', 'later', 'none'];

type Props = {
  widget: Widget<Focus>;
  counters: Widget<HomeCounters>;
  today: string;
  retry: Retry;
};

function GroupHeading({ group }: { group: HomeScheduleGroup }) {
  return (
    <Group gap={4} c="dimmed" mb={2}>
      {group === 'overdue' && <FiAlertTriangle size="1.25em" aria-hidden />}
      {group === 'today' && <FiClock size="1.25em" aria-hidden />}
      <Text size="xs" fw={700} tt="uppercase">
        {SCHEDULE_GROUP_LABELS[group]}
      </Text>
    </Group>
  );
}

function Empty({ noProject }: { noProject: boolean }) {
  return noProject ? (
    <EmptyState
      icon={FiUsers}
      title={HOME_COPY.focus.noProjectTitle}
      description={HOME_COPY.focus.noProjectHint}
    />
  ) : (
    <EmptyState
      icon={FiCheckCircle}
      title={HOME_COPY.focus.empty}
      action={{ label: HOME_COPY.focus.emptyAction, to: HOME_LINKS.tasks }}
    />
  );
}

/** "My Focus": what to work on now by urgency, a button per task, and tasks waiting for my review. */
export function HomeFocus({ widget, counters, today, retry }: Props) {
  const noProject = counters.ok && counters.data.memberProjects === 0;
  return (
    <HomeSection
      title={HOME_COPY.focus.title}
      subtitle={HOME_COPY.focus.subtitle}
      widget={widget}
      retry={retry}
    >
      {(f) => {
        if (f.items.length === 0 && f.awaitingReview.length === 0) {
          return <Empty noProject={noProject} />;
        }
        return (
          <>
            {GROUP_ORDER.map((group) => {
              const rows = f.items.filter((t) => t.group === group);
              if (rows.length === 0) return null;
              return (
                <div key={group}>
                  <GroupHeading group={group} />
                  {rows.map((t, i) => (
                    <div key={t.id}>
                      {i > 0 && <Divider />}
                      <HomeFocusRow task={t} today={today} />
                    </div>
                  ))}
                </div>
              );
            })}
            {f.awaitingReview.length > 0 && (
              <div>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={2}>
                  {HOME_COPY.focus.waitingReview}
                </Text>
                <Stack gap={0}>
                  {f.awaitingReview.map((t, i) => (
                    <div key={t.id}>
                      {i > 0 && <Divider />}
                      <Group justify="space-between" wrap="wrap" gap="xs" py={6}>
                        <Stack gap={2} style={{ minWidth: 0, flex: '1 1 14rem' }}>
                          <Text fw={600}>{t.title}</Text>
                          <Text size="xs" c="dimmed">
                            {t.project.name}
                          </Text>
                        </Stack>
                        <Button
                          component={Link}
                          to={`/app/tasks/${t.number}`}
                          variant="light"
                          style={{ flexShrink: 0 }}
                        >
                          {HOME_COPY.focus.review}
                        </Button>
                      </Group>
                    </div>
                  ))}
                </Stack>
              </div>
            )}
            <Anchor component={Link} to={HOME_LINKS.tasks} fw={600} size="sm">
              {[
                HOME_COPY.focus.all(f.total),
                f.awaitingReviewTotal > 0 ? HOME_COPY.focus.awaiting(f.awaitingReviewTotal) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Anchor>
          </>
        );
      }}
    </HomeSection>
  );
}
