// Projects ①b Filter & sort (prototype projects.filter.jsx): status, attention, then the sort order, edited as a
// draft. Reset puts the draft back to the default; Apply saves it to the projects query store and closes the sheet.
//
// Every option here is a parameter the server has. Health per level (On track / At risk / Off track apart) is not one
// — the list has a single `perhatian=1` that merges at risk and late, so that is what "Needs attention" is — and
// "Lowest progress" is not a sort the server offers. Both are in docs/phase2-gap-disembunyikan.md.
import { router } from 'expo-router';
import { useState } from 'react';

import { FilterField } from '@/components/filter/filter-field';
import { FilterSheet } from '@/components/filter/filter-sheet';
import { Chips } from '@/components/form/chips';
import { RadioList } from '@/components/form/radio-list';
import { ATTENTION, BASE_QUERY, type ProjectsQuery, SORTS, STATUSES } from '@/data/projects.query';
import { setProjectsQuery, useProjectsQuery } from '@/data/projects.store';

import { FILTER } from '../projects.strings';

/** The Filter & sort sheet of the Projects tab. */
export function ProjectsFilterScreen() {
  const current = useProjectsQuery();
  const [draft, setDraft] = useState<ProjectsQuery>(current);
  const set = (patch: Partial<ProjectsQuery>) => setDraft((d) => ({ ...d, ...patch }));
  const apply = () => {
    setProjectsQuery(draft);
    router.back();
  };
  return (
    <FilterSheet onReset={() => setDraft(BASE_QUERY)} onApply={apply}>
      <FilterField label={FILTER.status}>
        <Chips
          label={FILTER.status}
          items={STATUSES}
          value={draft.status}
          onChange={(status) => set({ status })}
        />
      </FilterField>
      <FilterField label={FILTER.attention}>
        <Chips
          label={FILTER.attention}
          items={ATTENTION}
          value={draft.attention}
          onChange={(attention) => set({ attention })}
        />
      </FilterField>
      <FilterField label={FILTER.sort}>
        <RadioList
          label={FILTER.sort}
          items={SORTS}
          value={SORTS[draft.sort] ?? SORTS[0]}
          onChange={(s) => set({ sort: Math.max(0, SORTS.indexOf(s as (typeof SORTS)[number])) })}
        />
      </FilterField>
    </FilterSheet>
  );
}
