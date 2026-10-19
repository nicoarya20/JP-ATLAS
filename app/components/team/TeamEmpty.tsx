/** Empty team list: nobody yet, or the project/search matched nobody (with a way to clear it). */
import { FiFilter, FiUsers } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { TEAM_COPY } from './team.copy';

export function TeamEmpty({ filtered, clearTo }: { filtered: boolean; clearTo: string }) {
  if (filtered) {
    return (
      <EmptyState
        icon={FiFilter}
        title={TEAM_COPY.filteredTitle}
        description={TEAM_COPY.filteredBody}
        action={{ label: TEAM_COPY.clear, to: clearTo }}
      />
    );
  }
  return (
    <EmptyState icon={FiUsers} title={TEAM_COPY.emptyTitle} description={TEAM_COPY.emptyBody} />
  );
}
