// Projects ①b Filter & sort (prototype projects.filter.jsx), as the server can answer it: a status, the one
// "Needs attention" toggle and the server's sorts, edited as a draft. Reset puts the draft back to the default;
// Apply reloads the list from page one and closes the sheet (the search box keeps its text).
import { router } from 'expo-router';
import { useState } from 'react';

import { FilterField } from '@/components/filter/filter-field';
import { FilterSheet } from '@/components/filter/filter-sheet';
import { Chips } from '@/components/form/chips';
import { RadioList } from '@/components/form/radio-list';
import { SwitchRow } from '@/components/form/switch-row';
import { getProjectsQuery, setProjectsQuery } from '@/data/projects.api';
import {
  BASE_QUERY,
  type ProjectsQuery,
  SORTS,
  STATUS_LABEL,
  STATUSES,
} from '@/data/projects.query';

import { FILTER } from '../projects.strings';

const STATUS_ITEMS = STATUSES.map((s) => (s ? STATUS_LABEL[s] : FILTER.statusAll));
const SORT_ITEMS = SORTS.map((s) => s.label);

type Draft = Omit<ProjectsQuery, 'q'>;

/** The Filter & sort sheet of the Projects tab. */
export function ProjectsFilterScreen() {
  const [draft, setDraft] = useState<Draft>(() => {
    const { q: _, ...rest } = getProjectsQuery();
    return rest;
  });
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const apply = () => {
    void setProjectsQuery(draft);
    router.back();
  };
  const reset = () => {
    const { q: _, ...base } = BASE_QUERY;
    setDraft(base);
  };
  const sortLabel = SORTS.find((s) => s.wire === draft.sort)?.label ?? SORT_ITEMS[0];
  return (
    <FilterSheet onReset={reset} onApply={apply}>
      <FilterField label={FILTER.status}>
        <Chips
          label={FILTER.status}
          items={STATUS_ITEMS}
          value={Math.max(0, STATUSES.indexOf(draft.status))}
          onChange={(i) => set({ status: STATUSES[i] ?? null })}
        />
      </FilterField>
      <SwitchRow
        label={FILTER.attention}
        sub={FILTER.attentionSub}
        value={draft.attention}
        onChange={(attention) => set({ attention })}
      />
      <FilterField label={FILTER.sort}>
        <RadioList
          label={FILTER.sort}
          items={SORT_ITEMS}
          value={sortLabel}
          onChange={(label) => set({ sort: SORTS.find((s) => s.label === label)?.wire ?? 'due' })}
        />
      </FilterField>
    </FilterSheet>
  );
}
