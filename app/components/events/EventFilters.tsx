/** Tab, search, kind and project of the Events list; the state lives in the URL. */
import { Group, SegmentedControl, Select, TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { EVENT_SEARCH_MAX } from '@server/event/events.dto';
import { EVENT_KINDS, type EventKind } from '@server/pm/enums';
import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import {
  EVENT_FILTER_PARAMS,
  type EventTimeSlug,
  type EventFilters as Filters,
  timePatch,
} from '~/lib/events-filters';
import { EVENT_KIND_LABELS } from '~/lib/events-format';
import type { FilterPatch } from '~/lib/use-url-filters';
import { EVENTS_COPY } from './events.copy';

/** Typing pauses this long before the URL (and the query) changes. */
const SEARCH_DEBOUNCE_MS = 350;

export type EventOption = { value: string; label: string };

const KIND_OPTIONS = EVENT_KINDS.map((k) => ({ value: k, label: EVENT_KIND_LABELS[k] }));
const TAB_OPTIONS: { value: EventTimeSlug; label: string }[] = [
  { value: 'akan-datang', label: EVENTS_COPY.upcoming },
  { value: 'lewat', label: EVENTS_COPY.past },
];

type Props = {
  filters: Filters;
  projects: EventOption[];
  onChange: (patch: FilterPatch) => void;
};

export function EventFilters({ filters, projects, onChange }: Props) {
  const P = EVENT_FILTER_PARAMS;
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
      <SegmentedControl
        aria-label={EVENTS_COPY.tabLabel}
        value={filters.waktu}
        onChange={(v) => onChange(timePatch(v as EventTimeSlug))}
        data={TAB_OPTIONS}
      />
      <TextInput
        aria-label={EVENTS_COPY.searchLabel}
        placeholder={EVENTS_COPY.searchPlaceholder}
        leftSection={<FiSearch size="1.25em" aria-hidden />}
        value={search}
        maxLength={EVENT_SEARCH_MAX}
        onChange={(e) => {
          setSearch(e.currentTarget.value);
          commitSearch(e.currentTarget.value);
        }}
        style={{ flex: '2 1 14rem' }}
      />
      <Select
        aria-label={EVENTS_COPY.kindLabel}
        placeholder={EVENTS_COPY.allKinds}
        data={KIND_OPTIONS}
        value={filters.jenis || null}
        onChange={(v) => onChange({ [P.kind]: (v as EventKind | null) ?? null })}
        clearable
        style={{ flex: '1 1 10rem' }}
      />
      {projects.length > 0 && (
        <Select
          aria-label={EVENTS_COPY.projectLabel}
          placeholder={EVENTS_COPY.allProjects}
          data={projects}
          value={filters.proyek || null}
          onChange={(v) => onChange({ [P.project]: v })}
          clearable
          searchable
          style={{ flex: '1 1 12rem' }}
        />
      )}
    </Group>
  );
}
