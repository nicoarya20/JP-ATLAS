// Events ①b Filter & sort (prototype events.filter.jsx): Show (upcoming or past), event type, project and group by,
// edited as a draft. Reset puts the draft back to the default; Apply saves it to the events query store and closes the
// sheet. The calendar shows past and upcoming dates alike, so its sheet (param view=calendar) has no Show field.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FilterField } from '@/components/filter/filter-field';
import { FilterSheet } from '@/components/filter/filter-sheet';
import { Chips } from '@/components/form/chips';
import { RadioList } from '@/components/form/radio-list';
import { SelectField } from '@/components/form/select-field';
import {
  BASE_QUERY,
  type EventsQuery,
  GROUPS,
  projectOptions,
  TYPE_FILTERS,
  WHEN,
} from '@/data/events.query';
import { setEventsQuery, useEventsQuery } from '@/data/events.store';

import { FILTER } from '../events.strings';

/** The Filter & sort sheet of the Events tab. */
export function EventsFilterScreen() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const current = useEventsQuery();
  const [draft, setDraft] = useState<EventsQuery>(current);
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
          options={projectOptions()}
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
