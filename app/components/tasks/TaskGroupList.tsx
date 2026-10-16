/**
 * "Tugas saya" in schedule groups: Terlambat / Hari ini / Besok / Minggu ini / Nanti / Tanpa tenggat.
 * Which group a task is in is decided by the server (`due=<group>`, team-zone clock), never by the
 * browser's date; each group loads its own keyset pages.
 */
import { Button, Group, Stack, Text } from '@mantine/core';
import { SCHEDULE_GROUPS, type ScheduleGroup } from '@server/metrics/schedule';
import { type ReactNode, useEffect, useState } from 'react';
import { type TaskCounts, useTaskList } from '~/lib/tasks-api';
import type { TaskListQuery } from '~/lib/tasks-filters';
import { ScheduleHeader, scheduleHeadingId } from './ScheduleHeader';
import { TaskRow } from './TaskRow';
import { LIST_COPY } from './tasks.copy';

type SectionProps = {
  group: ScheduleGroup;
  query: TaskListQuery;
  /** Server count of the group; with filters on, the loaded rows are counted instead. */
  count: number | null;
  onLoaded: (group: ScheduleGroup, rows: number) => void;
};

function GroupSection({ group, query, count, onLoaded }: SectionProps) {
  const list = useTaskList({ ...query, due: group });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const loaded = list.isSuccess;
  useEffect(() => {
    if (loaded) onLoaded(group, rows.length);
  }, [loaded, rows.length, group, onLoaded]);
  if (loaded && rows.length === 0) return null;
  const shown = count ?? (list.hasNextPage ? `${rows.length}+` : rows.length);
  return (
    <Stack gap="xs" component="section" aria-labelledby={scheduleHeadingId(group)}>
      <ScheduleHeader group={group} count={shown} />
      {list.isError && (
        <Group gap="xs" wrap="wrap">
          <Text c="danger">{LIST_COPY.loadFailed}</Text>
          <Button variant="light" onClick={() => void list.refetch()}>
            {LIST_COPY.retry}
          </Button>
        </Group>
      )}
      <Stack gap="xs" role="list">
        {rows.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </Stack>
      {list.hasNextPage && (
        <Button
          variant="subtle"
          loading={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {LIST_COPY.showMore}
        </Button>
      )}
    </Stack>
  );
}

type Props = {
  query: TaskListQuery;
  counts: TaskCounts['mine'];
  /** Filters narrow the groups, so the server counts (unfiltered) would not match the rows. */
  filtered: boolean;
  /** Shown when no group has a task. */
  empty: ReactNode;
};

/** Mount it with `key` = the query, so the per-group row tally starts over when the filters change. */
export function TaskGroupList({ query, counts, filtered, empty }: Props) {
  // Only groups that hold tasks at all are loaded; filters can only make a group smaller.
  const groups = SCHEDULE_GROUPS.filter((g) => counts[g] > 0);
  const [rowsByGroup, setRowsByGroup] = useState<Partial<Record<ScheduleGroup, number>>>({});
  const [onLoaded] = useState(
    () => (group: ScheduleGroup, rows: number) =>
      setRowsByGroup((prev) => (prev[group] === rows ? prev : { ...prev, [group]: rows })),
  );
  if (groups.length === 0) return <>{empty}</>;
  // Sections stay mounted (rendering nothing) so a later refetch can bring rows back.
  const allEmpty = groups.every((g) => rowsByGroup[g] === 0);
  return (
    <Stack gap="lg">
      {allEmpty && empty}
      {groups.map((group) => (
        <GroupSection
          key={group}
          group={group}
          query={query}
          count={filtered ? null : counts[group]}
          onLoaded={onLoaded}
        />
      ))}
    </Stack>
  );
}
