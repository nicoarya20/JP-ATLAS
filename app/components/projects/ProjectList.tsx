/** Project table from `sm` up and cards below it, with "Tampilkan lebih banyak" for the next server page. */
import { Stack } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectListItem } from '@server/project/project.dto';
import { ProgressBar } from '~/components/pm/ProgressBar';
import { StatusBadge } from '~/components/pm/StatusBadge';
import { type ResponsiveColumn, ResponsiveTable } from '~/components/ui/ResponsiveTable';
import {
  CLICK_CARD,
  CLICK_ROW,
  ConditionCell,
  DueCell,
  LeadCell,
  ProjectCard,
  ProjectNameLink,
} from './ProjectCard';
import { ProjectMore, type ProjectViewProps } from './ProjectMore';
import { LIST_COPY } from './projects.copy';

function columns(today: IsoDate): ResponsiveColumn<ProjectListItem>[] {
  return [
    { key: 'name', header: LIST_COPY.colName, cell: (p) => <ProjectNameLink project={p} /> },
    {
      key: 'status',
      header: LIST_COPY.colStatus,
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'condition',
      header: LIST_COPY.colCondition,
      cell: (p) => <ConditionCell project={p} />,
    },
    {
      key: 'progress',
      header: LIST_COPY.colProgress,
      width: 180,
      cell: (p) => <ProgressBar done={p.progress.done} total={p.progress.total} />,
    },
    {
      key: 'due',
      header: LIST_COPY.colDue,
      cell: (p) => <DueCell project={p} today={today} />,
    },
    {
      key: 'lead',
      header: LIST_COPY.colLead,
      hideBelow: 'md',
      cell: (p) => <LeadCell project={p} />,
    },
  ];
}

export function ProjectList({
  items,
  total,
  today,
  empty,
  hasMore,
  loadingMore,
  onMore,
}: ProjectViewProps) {
  return (
    <Stack gap="md">
      <ResponsiveTable
        label={LIST_COPY.tableLabel}
        columns={columns(today)}
        rows={items}
        getRowKey={(p) => p.id}
        renderCard={(p) => <ProjectCard project={p} today={today} />}
        rowClassName={CLICK_ROW}
        cardClassName={CLICK_CARD}
        empty={empty}
      />
      <ProjectMore
        shown={items.length}
        total={total}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onMore={onMore}
      />
    </Stack>
  );
}
