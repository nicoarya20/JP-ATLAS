/**
 * Empty task list (K8): first use says where tasks will come from; a filter that matches nothing
 * says so and offers "Hapus saringan" instead (P3 §2 Tugas ①②④, Proyek ⑨).
 */
import { FiCheckSquare, FiFilter } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { EMPTY_COPY } from './tasks.copy';

/** Which list is empty: my tasks, every task I may see, or one project's tab. */
export type TaskEmptyVariant = 'mine' | 'all' | 'project';

const FIRST_USE = {
  mine: { title: EMPTY_COPY.mineTitle, description: EMPTY_COPY.mineHint },
  all: { title: EMPTY_COPY.allTitle, description: EMPTY_COPY.allHint },
  project: { title: EMPTY_COPY.projectTitle, description: EMPTY_COPY.projectHint },
} as const;

type Props = {
  variant: TaskEmptyVariant;
  /** The list is empty because of the filters, not because there are no tasks. */
  filtered: boolean;
  onResetFilters: () => void;
  /** Link to the task form, only when the server says the viewer may create one (`caps.createTask`). */
  createTo?: string | null;
};

export function TaskEmpty({ variant, filtered, onResetFilters, createTo }: Props) {
  if (filtered) {
    return (
      <EmptyState
        icon={FiFilter}
        title={EMPTY_COPY.filteredTitle}
        description={EMPTY_COPY.filteredHint}
        action={{ label: EMPTY_COPY.resetFilters, onClick: onResetFilters }}
      />
    );
  }
  const label = variant === 'project' ? EMPTY_COPY.createInProject : EMPTY_COPY.create;
  return (
    <EmptyState
      icon={FiCheckSquare}
      {...FIRST_USE[variant]}
      action={createTo ? { label, to: createTo } : undefined}
    />
  );
}
