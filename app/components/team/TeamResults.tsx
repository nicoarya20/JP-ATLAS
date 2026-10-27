/** Summary line plus the list; dimmed while a changed filter is still loading the new answer. */
import { Stack } from '@mantine/core';
import type { TeamPerson } from '@server/team/team.dto';
import type { ReactNode } from 'react';
import { TeamList } from './TeamList';
import { TeamSummaryLine } from './TeamSummaryLine';
import { TEAM_COPY } from './team.copy';

/** The previous answer stays readable but visibly out of date while the new one loads. */
const STALE_OPACITY = 0.6;

/** Open-task sums of the people on screen; null when the viewer may not count other people's work. */
export function workOf(people: readonly TeamPerson[], mayCount: boolean, summaryHasWork: boolean) {
  if (!mayCount || !summaryHasWork) return null;
  return {
    active: people.reduce((n, x) => n + (x.load?.active ?? 0), 0),
    overdue: people.reduce((n, x) => n + (x.load?.overdue ?? 0), 0),
  };
}

type Props = {
  people: TeamPerson[];
  total: number;
  /** Name of the chosen project, or undefined for every project. */
  scopeName?: string;
  work: ReturnType<typeof workOf>;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
  /** The previous answer is still on screen while the new one loads. */
  stale: boolean;
  empty: ReactNode;
};

export function TeamResults({ scopeName, work, stale, ...list }: Props) {
  return (
    <Stack gap="md" aria-busy={stale} opacity={stale ? STALE_OPACITY : 1}>
      <TeamSummaryLine
        scope={scopeName ?? TEAM_COPY.allProjects}
        people={list.total}
        work={work ?? undefined}
        shownOf={list.hasMore ? list.people.length : undefined}
      />
      <TeamList {...list} />
    </Stack>
  );
}
