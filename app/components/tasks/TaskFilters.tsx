/**
 * Search, "Tugas saya / Semua tugas", status chips, Tenggat · Proyek · Orang · Prioritas and sort
 * for the task list (P3 §2 Tugas ①②); the state lives in the URL. No Papan toggle, CSV or Tag
 * filter in S2.
 */
import { Chip, Group, SegmentedControl, Select, Stack, TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { TASK_SEARCH_MAX } from '@server/task/task.limits';
import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { dueApplies } from '~/lib/tasks-filter-slugs';
import {
  DEFAULT_TASK_FILTERS,
  type TaskFilters as Filters,
  TASK_FILTER_PARAMS,
  type TaskScopeSlug,
  type TaskSortSlug,
  type TaskStatusSlug,
} from '~/lib/tasks-filters';
import type { FilterPatch } from '~/lib/use-url-filters';
import type { FilterOption } from './TaskFilterSelects';
import { TaskFilterSelects } from './TaskFilterSelects';
import { FILTER_COPY } from './tasks.copy';

/** Typing pauses this long before the URL (and the query) changes. */
const SEARCH_DEBOUNCE_MS = 350;

const SCOPES: { value: TaskScopeSlug; label: string }[] = [
  { value: 'saya', label: FILTER_COPY.scopeMine },
  { value: 'semua', label: FILTER_COPY.scopeAll },
];

const STATUS_CHIPS: { value: TaskStatusSlug; label: string }[] = [
  { value: 'aktif', label: FILTER_COPY.statusActive },
  { value: 'belum', label: FILTER_COPY.statusTodo },
  { value: 'dikerjakan', label: FILTER_COPY.statusDoing },
  { value: 'selesai', label: FILTER_COPY.statusDone },
  { value: 'dibatalkan', label: FILTER_COPY.statusCanceled },
];

const SORTS: { value: TaskSortSlug; label: string }[] = [
  { value: 'tenggat', label: FILTER_COPY.sortDue },
  { value: 'prioritas', label: FILTER_COPY.sortPriority },
  { value: 'terbaru', label: FILTER_COPY.sortUpdated },
  { value: 'dibuat', label: FILTER_COPY.sortCreated },
];

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
  return (
    <Stack gap="sm">
      {!locked && (
        <SegmentedControl
          aria-label={FILTER_COPY.scopeLabel}
          // The theme sets no size for these, and the default is under the 44 px touch target of /app.
          size="lg"
          data={SCOPES}
          value={filters.lingkup}
          // "Tugas saya" is already one person, so leaving an Orang filter behind would empty it.
          onChange={(v) =>
            onChange({
              [P.scope]: orDefault(v, D.lingkup),
              ...(v === 'saya' ? { [P.person]: null } : {}),
            })
          }
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
        // A finished or canceled task has no due date group, so that filter goes with the chip.
        onChange={(v) =>
          onChange({
            [P.status]: orDefault(v, D.status),
            ...(dueApplies((v || D.status) as TaskStatusSlug) ? {} : { [P.due]: null }),
          })
        }
      >
        <Group gap="xs" wrap="wrap" role="group" aria-label={FILTER_COPY.statusLabel}>
          {STATUS_CHIPS.map((c) => (
            <Chip key={c.value} value={c.value} size="xl">
              {c.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      <TaskFilterSelects
        filters={filters}
        onChange={onChange}
        projects={projects}
        people={people}
        locked={locked}
      />
    </Stack>
  );
}
