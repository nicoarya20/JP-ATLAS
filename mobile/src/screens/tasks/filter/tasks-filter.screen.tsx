// Filter & sort of a task list (prototype tasks.filter.jsx), the body of the filter formSheet: status, project (or,
// on a project's Tasks tab, assignee) and priority, then the sort order, edited as a draft. Reset puts the draft back
// to the scope's default; Apply hands it to the scope's query and closes the sheet.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FilterField } from '@/components/filter/filter-field';
import { FilterSheet } from '@/components/filter/filter-sheet';
import { Chips } from '@/components/form/chips';
import { RadioList } from '@/components/form/radio-list';
import { SelectField } from '@/components/form/select-field';
import { useProjectsState } from '@/data/projects.state';
import {
  ASSIGNEES,
  baseQuery,
  PRIORITIES,
  SORTS,
  STATUSES,
  type TaskQuery,
  type TaskScope,
} from '@/data/tasks.query';
import { getQuery, setQuery } from '@/data/tasks.query-state';

import { S } from '../tasks.strings';

/** All projects, then each listed one by its current name (one in Archive is not offered). */
const projectOptions = (list: readonly { id: string; name: string }[]) => [
  { value: '', label: S.filter.allProjects },
  ...list.map((p) => ({ value: p.id, label: p.name })),
];

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
  const projects = useProjectsState().list;
  const set = (patch: Partial<TaskQuery>) => setDraft((d) => ({ ...d, ...patch }));
  const apply = () => {
    setQuery(scope, draft);
    onDone();
  };
  return (
    <FilterSheet onReset={() => setDraft(baseQuery(scope))} onApply={apply}>
      <FilterField label={S.filter.status}>
        <Chips
          label={S.filter.status}
          items={STATUSES}
          value={draft.status}
          onChange={(status) => set({ status })}
        />
      </FilterField>
      {inProject ? (
        <FilterField label={S.filter.assignee}>
          <Chips
            label={S.filter.assignee}
            items={ASSIGNEES}
            value={draft.who}
            onChange={(who) => set({ who })}
          />
        </FilterField>
      ) : (
        <FilterField label={S.filter.project}>
          <SelectField
            testID="filter-project"
            label={S.filter.project}
            options={projectOptions(projects)}
            value={draft.project}
            onChange={(project) => set({ project })}
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
          items={SORTS}
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
