// Filter & sort of a task list (prototype tasks.filter.jsx), the body of the filter formSheet: status, project (or,
// on a project's Tasks tab, assignee) and priority, then the sort order, edited as a draft. Reset puts the draft back
// to the scope's default; Apply hands it to the scope's query and closes the sheet.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FilterField } from '@/components/filter/filter-field';
import { FilterSheet } from '@/components/filter/filter-sheet';
import { Chips } from '@/components/form/chips';
import { RadioList } from '@/components/form/radio-list';
import { sortSupported } from '@/data/tasks.api.values';
import {
  ASSIGNEES,
  PRIORITIES,
  SORTS,
  STATUSES,
  type TaskQuery,
  type TaskScope,
} from '@/data/tasks.query';
import { defaultQuery, getQuery, setQuery } from '@/data/tasks.query-state';

import { S } from '../tasks.strings';

/**
 * The sorts the server can do. "Title (A–Z)" is not one of them (A16) and sorting in the client
 * would sort only the page already loaded, so the Tasks tab does not offer it. A project's tab
 * still filters the sample store in memory, where every sort is real, so it keeps all four.
 */
const SERVER_SORTS = SORTS.filter((_, i) => sortSupported(i));

type TasksFilterPanelProps = {
  scope: TaskScope;
  /** A project's Tasks tab: the project is fixed, so Assignee replaces Project. */
  inProject?: boolean;
  /** After Apply; default: close the sheet. */
  onDone?: () => void;
};

/** The Filter & sort sheet body for `scope`. */
export function TasksFilterPanel({
  scope,
  inProject = false,
  onDone = router.back,
}: TasksFilterPanelProps) {
  const [draft, setDraft] = useState<TaskQuery>(() => getQuery(scope));
  const set = (patch: Partial<TaskQuery>) => setDraft((d) => ({ ...d, ...patch }));
  const apply = () => {
    setQuery(scope, draft);
    onDone();
  };
  return (
    <FilterSheet onReset={() => setDraft(defaultQuery(scope))} onApply={apply}>
      <FilterField label={S.filter.status}>
        <Chips
          label={S.filter.status}
          items={STATUSES}
          value={draft.status}
          onChange={(status) => set({ status })}
        />
      </FilterField>
      {/*
        A project's tab filters the sample store, so it offers Assignee and every sort. The Tasks
        tab asks the server, which has no id for a sample project: Project is left out rather than
        sent as an id that would answer an empty list (see docs/phase2-gap-disembunyikan.md).
      */}
      {inProject && (
        <FilterField label={S.filter.assignee}>
          <Chips
            label={S.filter.assignee}
            items={ASSIGNEES}
            value={draft.who}
            onChange={(who) => set({ who })}
          />
        </FilterField>
      )}
      <FilterField label={S.filter.priority}>
        <Chips
          label={S.filter.priority}
          items={PRIORITIES}
          value={draft.priority}
          onChange={(priority) => set({ priority })}
        />
      </FilterField>
      <FilterField label={S.filter.sort}>
        <RadioList
          label={S.filter.sort}
          items={inProject ? SORTS : SERVER_SORTS}
          value={SORTS[draft.sort]}
          onChange={(sort) => set({ sort: SORTS.indexOf(sort as (typeof SORTS)[number]) })}
        />
      </FilterField>
    </FilterSheet>
  );
}

/** Route body of /tasks/filter?scope=mine|all. */
export function TasksFilterScreen() {
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  return <TasksFilterPanel scope={scope === 'all' ? 'all' : 'mine'} />;
}
