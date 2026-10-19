/** Project, search and sort of the Team list; the state lives in the URL. */
import { Group, Select, Text, TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import {
  DEFAULT_TEAM_FILTERS,
  type TeamFilters as Filters,
  TEAM_FILTER_PARAMS,
  TEAM_SEARCH_MAX,
  type TeamSortSlug,
} from '~/lib/team-filters';
import type { FilterPatch } from '~/lib/use-url-filters';
import { TEAM_COPY } from './team.copy';

/** Typing pauses this long before the URL (and the query) changes. */
const SEARCH_DEBOUNCE_MS = 350;
const SORT_LABEL_ID = 'team-sort-label';

export type TeamOption = { value: string; label: string };

/** "Tugas aktif terbanyak" is offered only to those who may see other people's numbers. */
export function sortOptions(canSortByLoad: boolean): { value: TeamSortSlug; label: string }[] {
  const byName = { value: 'nama' as const, label: TEAM_COPY.sortName };
  return canSortByLoad ? [byName, { value: 'aktif', label: TEAM_COPY.sortActive }] : [byName];
}

type Props = {
  filters: Filters;
  projects: TeamOption[];
  canSortByLoad: boolean;
  onChange: (patch: FilterPatch) => void;
};

export function TeamFilters({ filters, projects, canSortByLoad, onChange }: Props) {
  const P = TEAM_FILTER_PARAMS;
  const [search, setSearch] = useState(filters.q);
  const commitSearch = useDebouncedCallback(
    (q: string) => onChange({ [P.q]: q }),
    SEARCH_DEBOUNCE_MS,
  );
  // "Hapus saringan" navigates without remounting; keep the box unless it already shows that query.
  useEffect(() => {
    setSearch((current) => (current.trim() === filters.q ? current : filters.q));
  }, [filters.q]);
  return (
    <Group gap="sm" wrap="wrap" align="center">
      <Select
        aria-label={TEAM_COPY.projectLabel}
        placeholder={TEAM_COPY.allProjects}
        data={projects}
        value={filters.proyek || null}
        onChange={(v) => onChange({ [P.project]: v })}
        clearable
        searchable
        nothingFoundMessage={TEAM_COPY.filteredTitle}
        style={{ flex: '1 1 12rem' }}
      />
      <TextInput
        aria-label={TEAM_COPY.searchLabel}
        placeholder={TEAM_COPY.searchPlaceholder}
        leftSection={<FiSearch size="1.25em" aria-hidden />}
        value={search}
        maxLength={TEAM_SEARCH_MAX}
        onChange={(e) => {
          setSearch(e.currentTarget.value);
          commitSearch(e.currentTarget.value);
        }}
        style={{ flex: '2 1 14rem' }}
      />
      <Group gap="xs" wrap="wrap">
        <Text id={SORT_LABEL_ID} size="sm" c="dimmed">
          {TEAM_COPY.sortPrefix}
        </Text>
        <Select
          aria-labelledby={SORT_LABEL_ID}
          data={sortOptions(canSortByLoad)}
          value={filters.urut}
          allowDeselect={false}
          onChange={(v) => v && onChange({ [P.sort]: v === DEFAULT_TEAM_FILTERS.urut ? null : v })}
          style={{ flex: '0 1 14rem' }}
        />
      </Group>
    </Group>
  );
}
