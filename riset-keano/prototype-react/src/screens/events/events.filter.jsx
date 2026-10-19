// Events ①b: the Filter & sort overlay (full-height, same as Tasks) opened from the icon next to the search field.
// The query lives in the list / calendar screen's params (events.query); Apply re-opens that screen with it.
import { useState } from 'react';
import { Radio } from '@react-cupertino-ui/radio';
import { Chips, FilterPanel, Label, SearchFilter, Select } from '../../kit';
import { useApp } from '../../core/app.context';
import { BASE_QUERY, GROUPS, TYPE_FILTERS, WHEN, isFiltered, projectOptions, queryOf } from './events.query';

/** Search field with the Filter & sort icon; its dot shows when the screen's query filters the events. */
export function EventsSearch() {
  const { params, openSheet } = useApp();
  return <SearchFilter placeholder="Search title or location…" on={isFiltered(queryOf(params))}
    onFilter={() => openSheet('events.filter')} />;
}

/** ①b Filter & sort: upcoming (default) or past, event type and project filters, then how the list is grouped, edited as a draft. Reset puts the
 *  draft back to the default; Apply re-opens the screen underneath with the draft as its params, which closes the overlay. */
export function EventsFilter() {
  const { current, params: screen, go } = useApp();
  const [draft, setDraft] = useState(() => queryOf(screen));
  const [resets, setResets] = useState(0);   // remounts the chip rows, which keep their own picked index
  const set = patch => setDraft(d => ({ ...d, ...patch }));
  const reset = () => { setDraft(BASE_QUERY); setResets(n => n + 1); };
  return (
    <FilterPanel onReset={reset} onApply={() => go(current, { params: { ...screen, ...draft } })}>
      <div className="field">
        <Label>Show</Label>
        <Chips key={`when-${resets}`} items={WHEN} on={draft.when} onPick={i => set({ when: i })} />
      </div>
      <div className="field">
        <Label>Event type</Label>
        <Chips key={`type-${resets}`} items={TYPE_FILTERS} on={draft.type} onPick={i => set({ type: i })} />
      </div>
      <div className="field">
        <Label>Project</Label>
        <Select block label="Project" options={projectOptions()} value={draft.project} onChange={v => set({ project: v })} />
      </div>
      <div className="field">
        <Label>Group by</Label>
        <div className="stack sm" role="radiogroup" aria-label="Group by">
          {GROUPS.map((g, i) => <Radio key={g} variant="solid" name="ev-group" size="sm" label={g}
            checked={draft.group === i} onChange={() => set({ group: i })} />)}
        </div>
      </div>
    </FilterPanel>
  );
}
