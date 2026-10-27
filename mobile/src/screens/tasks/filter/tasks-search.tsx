// Search field with the Filter & sort icon above a task list (prototype TasksSearch); its dot shows while the scope's
// query narrows the list. Shared with a project's Tasks tab (W4), which opens its own filter route.
import { router } from 'expo-router';

import { SearchFilter } from '@/components/filter/filter-button';
import { isFiltered, type TaskScope } from '@/data/tasks.query';
import { useQuery } from '@/data/tasks.query-state';

import { S } from '../tasks.strings';

type TasksSearchFieldProps = {
  scope: TaskScope;
  /** A project's Tasks tab: its filter swaps Project for Assignee (TasksFilterPanel inProject). */
  inProject?: boolean;
  /** Search text (title, #number or tag); the list filters by it. */
  value: string;
  onChangeText: (text: string) => void;
  /** Opens the filter sheet; default: the Tasks tab's /tasks/filter. A project's tab passes its task-filter route. */
  onFilter?: () => void;
};

/** "Search title, #number, or tag…" with the filter icon on its right. */
export function TasksSearchField({ scope, value, onChangeText, onFilter }: TasksSearchFieldProps) {
  const query = useQuery(scope);
  const open = onFilter ?? (() => router.push({ pathname: '/tasks/filter', params: { scope } }));
  return (
    <SearchFilter
      testID="tasks-filter"
      placeholder={S.search}
      value={value}
      onChangeText={onChangeText}
      on={isFiltered(query)}
      onPress={open}
    />
  );
}
