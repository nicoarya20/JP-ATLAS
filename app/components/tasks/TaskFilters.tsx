/**
 * Search, "Tugas saya / Semua tugas", status chips, Proyek · Orang · Prioritas and sort for the task
 * list (P3 §2 Tugas ①②); the state lives in the URL. No Papan toggle, CSV or Tag filter in S2.
 */
import {
  Chip,
  Group,
  MultiSelect,
  SegmentedControl,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { TASK_SEARCH_MAX } from '@server/task/task.limits';
import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import {
  DEFAULT_TASK_FILTERS,
  type TaskFilters as Filters,
  PERSON_ME,
  PRIORITY_SLUGS,
  type PrioritySlug,
  TASK_FILTER_PARAMS,
  type TaskScopeSlug,
  type TaskSortSlug,
  type TaskStatusSlug,
} from '~/lib/tasks-filters';
import type { FilterPatch } from '~/lib/use-url-filters';
import { FILTER_COPY } from './tasks.copy';

/** Typing pauses this long before the URL (and the query) changes. */
const SEARCH_DEBOUNCE_MS = 350;
/** Select value of "any project" / "anyone"; an empty value leaves the URL. */
const ANY = '';

const SCOPES: { value: TaskScopeSlug; label: string }[] = [
  { value: 'saya', label: FILTER_COPY.scopeMine },
  { value: 'semua', label: FILTER_COPY.scopeAll },
];

const STATUS_CHIPS: { value: TaskStatusSlug; label: string }[] = [
  { value: 'aktif', label: FILTER_COPY.statusActive },
  { value: 'selesai', label: FILTER_COPY.statusDone },
  { value: 'dibatalkan', label: FILTER_COPY.statusCanceled },
];

const SORTS: { value: TaskSortSlug; label: string }[] = [
  { value: 'tenggat', label: FILTER_COPY.sortDue },
  { value: 'prioritas', label: FILTER_COPY.sortPriority },
  { value: 'terbaru', label: FILTER_COPY.sortUpdated },
  { value: 'dibuat', label: FILTER_COPY.sortCreated },
];

const PRIORITIES = (Object.keys(PRIORITY_SLUGS) as PrioritySlug[]).map((slug) => ({
  value: slug,
  label: PRIORITY_LABELS[PRIORITY_SLUGS[slug]].label,
}));

/** One option of the Proyek or Orang filter. */
export type FilterOption = { value: string; label: string };

type Props = {
  filters: Filters;
  onChange: (patch: FilterPatch) => void;
  /** Projects the viewer may see. */
  projects: FilterOption[];
  /** People the viewer may pick; "Saya" is always offered first. */
  people: FilterOption[];
  /** Project tab: the list is pinned to one project, so the scope toggle and Proyek filter are left out. */
  locked?: boolean;
};

export function TaskFilters({ filters, onChange, projects, people, locked }: Props) {
  const P = TASK_FILTER_PARAMS;
  const D = DEFAULT_TASK_FILTERS;
  const [search, setSearch] = useState(filters.q);
  const commitSearch = useDebouncedCallback(
    (q: string) => onChange({ [P.q]: q }),
    SEARCH_DEBOUNCE_MS,
  );
  // "Hapus saringan" navigates without remounting; keep the box unless it already shows that query.
  useEffect(() => {
    setSearch((current) => (current.trim() === filters.q ? current : filters.q));
  }, [filters.q]);
  // Defaults leave the URL, so a clean list keeps a clean address.
  const orDefault = (v: string, d: string) => (v === d ? null : v);
  const personData = [
    { value: ANY, label: FILTER_COPY.personAny },
    { value: PERSON_ME, label: FILTER_COPY.personMe },
    ...people,
  ];
  const projectData = [{ value: ANY, label: FILTER_COPY.projectAny }, ...projects];
  return (
    <Stack gap="sm">
      {!locked && (
        <SegmentedControl
          aria-label={FILTER_COPY.scopeLabel}
          data={SCOPES}
          value={filters.lingkup}
          onChange={(v) => onChange({ [P.scope]: orDefault(v, D.lingkup) })}
          style={{ alignSelf: 'flex-start' }}
        />
      )}
      <Group gap="sm" wrap="wrap" align="flex-end">
        <TextInput
          label={FILTER_COPY.searchLabel}
          placeholder={FILTER_COPY.searchPlaceholder}
          leftSection={<FiSearch size="1.25em" aria-hidden />}
          value={search}
          maxLength={TASK_SEARCH_MAX}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            commitSearch(e.currentTarget.value);
          }}
          style={{ flex: '1 1 16rem' }}
        />
        <Select
          label={FILTER_COPY.sortLabel}
          data={SORTS}
          value={filters.urut}
          allowDeselect={false}
          onChange={(v) => v && onChange({ [P.sort]: orDefault(v, D.urut) })}
          style={{ flex: '0 1 14rem' }}
        />
      </Group>
      <Chip.Group
        multiple={false}
        value={filters.status}
        onChange={(v) => onChange({ [P.status]: orDefault(v, D.status) })}
      >
        <Group gap="xs" wrap="wrap" role="group" aria-label={FILTER_COPY.statusLabel}>
          {STATUS_CHIPS.map((c) => (
            <Chip key={c.value} value={c.value}>
              {c.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      <Group gap="sm" wrap="wrap" align="flex-end">
        {!locked && (
          <Select
            label={FILTER_COPY.projectLabel}
            data={projectData}
            value={filters.proyek ?? ANY}
            searchable
            allowDeselect={false}
            onChange={(v) => onChange({ [P.project]: v || null })}
            style={{ flex: '1 1 12rem' }}
          />
        )}
        <Select
          label={FILTER_COPY.personLabel}
          data={personData}
          value={filters.orang ?? ANY}
          searchable
          allowDeselect={false}
          onChange={(v) => onChange({ [P.person]: v || null })}
          style={{ flex: '1 1 12rem' }}
        />
        <MultiSelect
          label={FILTER_COPY.priorityLabel}
          placeholder={filters.prioritas.length === 0 ? FILTER_COPY.priorityAny : undefined}
          data={PRIORITIES}
          value={filters.prioritas}
          clearable
          onChange={(v) => onChange({ [P.priority]: v })}
          style={{ flex: '1 1 12rem' }}
        />
      </Group>
    </Stack>
  );
}
