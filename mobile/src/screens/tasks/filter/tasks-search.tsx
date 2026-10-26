// Search field with the Filter & sort icon above a task list (prototype TasksSearch); its dot shows while the scope's
// query narrows the list. Shared with a project's Tasks tab (W4), which opens its own filter route.
import { router } from 'expo-router';

import { SearchFilter } from '@/components/filter/filter-button';
import { isApiFiltered } from '@/data/tasks.api.view';
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
export function TasksSearchField({
  scope,
  inProject = false,
  value,
  onChangeText,
  onFilter,
}: TasksSearchFieldProps) {
  const query = useQuery(scope);
  const open = onFilter ?? (() => router.push({ pathname: '/tasks/filter', params: { scope } }));
  // The dot must mean "this list is narrowed", so it counts the filters that are actually applied:
  // the project tab applies all of them to the sample store, the Tasks tab sends only the ones the
  // server takes. The placeholder follows the same line — the server matches the title or an exact
  // number, not a prefix and not a tag (A15).
  return (
    <SearchFilter
      testID="tasks-filter"
      placeholder={inProject ? S.search : S.searchServer}
      value={value}
      onChangeText={onChangeText}
      on={inProject ? isFiltered(query) : isApiFiltered(query)}
      onPress={open}
    />
  );
}
