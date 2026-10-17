/** Starting values of the task form in `edit` mode, read from the task detail the page loaded. */
import type { TaskDetail } from '~/lib/tasks-api';
import type { TaskFormValues } from './task-form';

export function editTaskValues(task: TaskDetail): TaskFormValues {
  return {
    projectId: task.project.id,
    title: task.title,
    assigneeId: task.assignee?.id ?? null,
    priority: task.priority,
    dueDate: task.dueDate,
    description: task.description ?? '',
    kindId: task.kind.id,
    startDate: task.startDate,
    steps: [],
  };
}
