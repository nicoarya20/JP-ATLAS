/** Search, "Proyek saya / Semua proyek", status chips and sort for the project list; state lives in the URL. */
import { Chip, Group, SegmentedControl, Select, Stack, TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import {
  DEFAULT_PROJECT_FILTERS,
  type ProjectFilters as Filters,
  PROJECT_FILTER_PARAMS,
  PROJECT_SEARCH_MAX,
  type ScopeSlug,
  type SortSlug,
  type StatusSlug,
} from '~/lib/projects-filters';
import type { FilterPatch } from '~/lib/use-url-filters';
import { LIST_COPY } from './projects.copy';

/** Typing pauses this long before the URL (and the query) changes. */
const SEARCH_DEBOUNCE_MS = 350;
const ALL = '';

/** The chips of P3 §2 ①; canceled projects are reachable by search only. */
const STATUS_CHIPS: { value: StatusSlug | typeof ALL; label: string }[] = [
  { value: ALL, label: LIST_COPY.statusAll },
  { value: 'draf', label: PROJECT_STATUS_LABELS.draft.label },
  { value: 'berjalan', label: PROJECT_STATUS_LABELS.active.label },
  { value: 'ditunda', label: PROJECT_STATUS_LABELS.on_hold.label },
  { value: 'selesai', label: PROJECT_STATUS_LABELS.completed.label },
];

const SORTS: { value: SortSlug; label: string }[] = [
  { value: 'tenggat', label: LIST_COPY.sortDue },
  { value: 'terbaru', label: LIST_COPY.sortRecent },
  { value: 'nama', label: LIST_COPY.sortName },
];

const SCOPES: { value: ScopeSlug; label: string }[] = [
  { value: 'saya', label: LIST_COPY.scopeMine },
  { value: 'semua', label: LIST_COPY.scopeAll },
];

type Props = {
  filters: Filters;
  /** From the server's list policy; a Member never sees the toggle (and is clamped anyway, M11). */
  canSeeAll: boolean;
  onChange: (patch: FilterPatch) => void;
};

export function ProjectFilters({ filters, canSeeAll, onChange }: Props) {
  const P = PROJECT_FILTER_PARAMS;
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
      <Group gap="sm" wrap="wrap" align="flex-end">
        <TextInput
          label={LIST_COPY.searchLabel}
          placeholder={LIST_COPY.searchPlaceholder}
          leftSection={<FiSearch size="1.25em" aria-hidden />}
          value={search}
          maxLength={PROJECT_SEARCH_MAX}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            commitSearch(e.currentTarget.value);
          }}
          style={{ flex: '1 1 16rem' }}
        />
        <Select
          label={LIST_COPY.sortLabel}
          data={SORTS}
          value={filters.urut}
          allowDeselect={false}
          onChange={(v) => v && onChange({ [P.sort]: orDefault(v, DEFAULT_PROJECT_FILTERS.urut) })}
          style={{ flex: '0 1 14rem' }}
        />
      </Group>
      {canSeeAll && (
        <SegmentedControl
          aria-label={LIST_COPY.scopeLabel}
          data={SCOPES}
          value={filters.lingkup}
          onChange={(v) => onChange({ [P.scope]: orDefault(v, DEFAULT_PROJECT_FILTERS.lingkup) })}
          style={{ alignSelf: 'flex-start' }}
        />
      )}
      <Chip.Group
        multiple={false}
        value={filters.status ?? ALL}
        onChange={(v) => onChange({ [P.status]: v })}
      >
        <Group gap="xs" wrap="wrap" role="group" aria-label={LIST_COPY.statusLabel}>
          {STATUS_CHIPS.map((c) => (
            <Chip key={c.value || 'semua'} value={c.value}>
              {c.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
    </Stack>
  );
}
