/** Empty project list (P3 §2 ①②): creator without projects, Member without projects, or filters matching nothing. */
import { FiCheckCircle, FiFilter, FiFolder, FiUsers } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { type ProjectFilters, projectFiltersToParams } from '~/lib/projects-filters';
import { ATTENTION_COPY } from './attention.copy';
import { EMPTY_COPY } from './projects.copy';

export type ProjectEmptyKind = 'creator' | 'member' | 'filtered' | 'attention';

/**
 * Filters win over "no data": an empty search must offer to clear it, whoever is looking.
 * `attentionOnly` (just "Perlu perhatian", no search) gets its own good-news message.
 */
export function emptyKind(
  filtered: boolean,
  canCreate: boolean,
  attentionOnly = false,
): ProjectEmptyKind {
  if (filtered && attentionOnly) return 'attention';
  if (filtered) return 'filtered';
  return canCreate ? 'creator' : 'member';
}

/** Address of the list without search, status or "Perlu perhatian"; the chosen scope, sort and view stay. */
export function clearFiltersHref(f: ProjectFilters): string {
  const qs = projectFiltersToParams({
    ...f,
    q: '',
    status: null,
    perhatian: false,
    hal: 1,
  }).toString();
  return qs ? `/app/projects?${qs}` : '/app/projects';
}

type Props = {
  kind: ProjectEmptyKind;
  /** Where "Buat proyek" leads (creator). */
  createTo: string;
  /** The list address without search or status (filtered). */
  clearTo: string;
};

export function ProjectEmpty({ kind, createTo, clearTo }: Props) {
  if (kind === 'attention') {
    return (
      <EmptyState
        icon={FiCheckCircle}
        title={ATTENTION_COPY.emptyTitle}
        description={ATTENTION_COPY.emptyBody}
        action={{ label: EMPTY_COPY.filteredAction, to: clearTo }}
      />
    );
  }
  if (kind === 'filtered') {
    return (
      <EmptyState
        icon={FiFilter}
        title={EMPTY_COPY.filteredTitle}
        description={EMPTY_COPY.filteredBody}
        action={{ label: EMPTY_COPY.filteredAction, to: clearTo }}
      />
    );
  }
  if (kind === 'creator') {
    return (
      <EmptyState
        icon={FiFolder}
        title={EMPTY_COPY.creatorTitle}
        description={EMPTY_COPY.creatorBody}
        action={{ label: EMPTY_COPY.creatorAction, to: createTo }}
      />
    );
  }
  // A Member cannot create projects, so there is no button: only who can help (②).
  return (
    <EmptyState icon={FiUsers} title={EMPTY_COPY.memberTitle} description={EMPTY_COPY.memberBody} />
  );
}
