// Events ①b Filter & sort (prototype events.filter.jsx): Show (upcoming or past), event type, project and group by,
// edited as a draft. Reset puts the draft back to the default; Apply saves it to the events query (the list and the
// calendar ask the server again) and closes the sheet. The calendar shows past and upcoming dates alike, so its sheet
// (param view=calendar) has no Show field. The project picks are the projects the viewer can see.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { FilterField } from '@/components/filter/filter-field';
import { FilterSheet } from '@/components/filter/filter-sheet';
import { Chips } from '@/components/form/chips';
import { RadioList } from '@/components/form/radio-list';
import { SelectField } from '@/components/form/select-field';
import { setEventsQuery, useEventsQuery } from '@/data/events.api';
import { BASE_QUERY, type EventsQuery, GROUPS, TYPE_FILTERS, WHEN } from '@/data/events.query';
import { filterProjectsResource } from '@/data/tasks.api';

import { FILTER } from '../events.strings';

/** "All projects", then each project the viewer can see; a picked one not (yet) among them keeps its place. */
function useProjectOptions(picked: string) {
  const state = filterProjectsResource.use();
  useEffect(() => {
    void filterProjectsResource.ensure();
  }, []);
  const items = state.data?.items ?? [];
  const known = !picked || items.some((p) => p.id === picked);
  return [
    { value: '', label: FILTER.allProjects },
    ...(known ? [] : [{ value: picked, label: FILTER.pickedProject }]),
    ...items.map((p) => ({ value: p.id, label: p.name })),
  ];
}

/** The Filter & sort sheet of the Events tab. */
export function EventsFilterScreen() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const current = useEventsQuery();
  const [draft, setDraft] = useState<EventsQuery>(current);
  const projects = useProjectOptions(draft.project);
  const set = (patch: Partial<EventsQuery>) => setDraft((d) => ({ ...d, ...patch }));
  const apply = () => {
    setEventsQuery(draft);
    router.back();
  };
  return (
    <FilterSheet onReset={() => setDraft(BASE_QUERY)} onApply={apply}>
      {view !== 'calendar' && (
        <FilterField label={FILTER.show}>
          <Chips
            label={FILTER.show}
            items={WHEN}
            value={draft.when ?? 0}
            onChange={(i) => set({ when: i })}
          />
        </FilterField>
      )}
      <FilterField label={FILTER.type}>
        <Chips
          label={FILTER.type}
          items={TYPE_FILTERS}
          value={draft.type}
          onChange={(i) => set({ type: i })}
        />
      </FilterField>
      <FilterField label={FILTER.project}>
        <SelectField
          label={FILTER.project}
          options={projects}
          value={draft.project}
          onChange={(project) => set({ project })}
        />
      </FilterField>
      <FilterField label={FILTER.group}>
        <RadioList
          label={FILTER.group}
          items={GROUPS}
          value={GROUPS[draft.group] ?? GROUPS[0]}
          onChange={(g) => set({ group: GROUPS.indexOf(g as (typeof GROUPS)[number]) })}
        />
      </FilterField>
    </FilterSheet>
  );
}
