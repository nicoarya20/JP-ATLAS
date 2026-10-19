/** The Tenggat · Proyek · Orang · Prioritas row of the task list filters (P3 §2 Tugas ①②, Proyek ⑨). */
import { Group, MultiSelect, Select } from '@mantine/core';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import { DUE_SLUGS, dueApplies, type TaskDueSlug } from '~/lib/tasks-filter-slugs';
import {
  type TaskFilters as Filters,
  PERSON_ME,
  PRIORITY_SLUGS,
  type PrioritySlug,
  personApplies,
  TASK_FILTER_PARAMS,
} from '~/lib/tasks-filters';
import type { FilterPatch } from '~/lib/use-url-filters';
import { FILTER_COPY, SCHEDULE_GROUP_LABELS } from './tasks.copy';

/** Select value of "any project" / "anyone" / "any due date"; an empty value leaves the URL. */
const ANY = '';

const PRIORITIES = (Object.keys(PRIORITY_SLUGS) as PrioritySlug[]).map((slug) => ({
  value: slug,
  label: PRIORITY_LABELS[PRIORITY_SLUGS[slug]].label,
}));

const DUES = [
  { value: ANY, label: FILTER_COPY.dueAny },
  ...(Object.keys(DUE_SLUGS) as TaskDueSlug[]).map((slug) => ({
    value: slug,
    label: SCHEDULE_GROUP_LABELS[DUE_SLUGS[slug]],
  })),
];

/** One option of the Proyek or Orang filter. */
export type FilterOption = { value: string; label: string };

type Props = {
  filters: Filters;
  onChange: (patch: FilterPatch) => void;
  /** Projects the viewer may see. */
  projects: FilterOption[];
  /** People the viewer may pick; "Saya" is always offered first. */
  people: FilterOption[];
  /** Project tab: the Proyek filter is left out because the list is pinned to one project. */
  locked?: boolean;
};

export function TaskFilterSelects({ filters, onChange, projects, people, locked }: Props) {
  const P = TASK_FILTER_PARAMS;
  const personData = [
    { value: ANY, label: FILTER_COPY.personAny },
    { value: PERSON_ME, label: FILTER_COPY.personMe },
    ...people,
  ];
  const projectData = [{ value: ANY, label: FILTER_COPY.projectAny }, ...projects];
  return (
    <Group gap="sm" wrap="wrap" align="flex-end">
      {dueApplies(filters.status) && (
        <Select
          label={FILTER_COPY.dueLabel}
          data={DUES}
          value={filters.tenggat ?? ANY}
          allowDeselect={false}
          onChange={(v) => onChange({ [P.due]: v || null })}
          style={{ flex: '1 1 12rem' }}
        />
      )}
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
      {personApplies(filters, Boolean(locked)) && (
        <Select
          label={FILTER_COPY.personLabel}
          data={personData}
          value={filters.orang ?? ANY}
          searchable
          allowDeselect={false}
          onChange={(v) => onChange({ [P.person]: v || null })}
          style={{ flex: '1 1 12rem' }}
        />
      )}
      <MultiSelect
        label={FILTER_COPY.priorityLabel}
        placeholder={filters.prioritas.length === 0 ? FILTER_COPY.priorityAny : undefined}
        data={PRIORITIES}
        value={filters.prioritas}
        clearable
        // The theme sizes the other inputs `lg` but has no MultiSelect default, so match them here.
        size="lg"
        onChange={(v) => onChange({ [P.priority]: v })}
        style={{ flex: '1 1 12rem' }}
      />
    </Group>
  );
}
