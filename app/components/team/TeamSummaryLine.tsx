/** The one bold line above the list: project, number of people and, only where allowed, their open work. */
import { Text } from '@mantine/core';
import { TEAM_COPY } from './team.copy';

type Props = {
  /** Name of the chosen project, or "Semua proyek". */
  scope: string;
  people: number;
  /** Absent when the viewer may not see other people's numbers: then the line carries no counts. */
  work?: { active: number; overdue: number };
  /** People on screen when the list is longer than what is loaded, so the sums are not read as the whole team's. */
  shownOf?: number;
};

export function TeamSummaryLine({ scope, people, work, shownOf }: Props) {
  const parts = [scope, TEAM_COPY.people(people)];
  if (work) parts.push(TEAM_COPY.active(work.active), TEAM_COPY.overdue(work.overdue));
  return (
    <Text fw={700}>
      {parts.join(' · ')}
      {work && shownOf !== undefined && (
        <Text span size="sm" c="dimmed" fw={400}>{` (${TEAM_COPY.partial(shownOf)})`}</Text>
      )}
    </Text>
  );
}
