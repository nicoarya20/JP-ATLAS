import { useState } from 'react';
import { FiCheckSquare } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { notify } from '~/components/ui/notify';
import { TasksList } from '../tasks/TasksList';
import { type DummyTask, TASKS } from '../tasks/tasks.dummy';
import { DETAIL_COPY as C } from './project-detail.copy';

/** The Tugas tab (flow ⑧): this project's tasks, split by due date, over the dummy tasks. */
export function ProjectTasksTab({ projectName }: { projectName: string }) {
  const [tasks, setTasks] = useState<DummyTask[]>(() =>
    TASKS.filter((t) => t.project === projectName),
  );

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={FiCheckSquare}
        title={C.tasksEmptyTitle}
        description={C.tasksEmptyBody}
        action={{ label: C.tasksNew, to: '/app/tasks/new' }}
      />
    );
  }
  const finish = (t: DummyTask) => {
    setTasks((all) =>
      all.map((x) => (x.number === t.number ? { ...x, status: 'done', note: undefined } : x)),
    );
    notify.success(`Tugas #${t.number} ditandai selesai.`);
  };
  return <TasksList rows={tasks} onDone={finish} onReset={() => undefined} filtered={false} />;
}
