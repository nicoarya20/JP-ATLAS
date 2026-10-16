import { Button, Text } from '@mantine/core';
import { requireUser } from '@server/guard';
import { useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Link } from 'react-router';
import { TasksBoard } from '~/components/tasks/TasksBoard';
import { TasksList } from '~/components/tasks/TasksList';
import { TasksToolbar, type TaskView } from '~/components/tasks/TasksToolbar';
import {
  type DummyTask,
  NO_FILTERS,
  TASKS,
  type TaskFilters,
} from '~/components/tasks/tasks.dummy';
import { filterTasks, isFiltered } from '~/components/tasks/tasks.filter';
import { notify } from '~/components/ui/notify';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/tasks';

export function meta() {
  return [{ title: 'Tugas — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Task list with hardcoded dummy data (tasks.dummy.ts) until S2 wires the real query. */
export default function TasksPage() {
  const [tasks, setTasks] = useState<DummyTask[]>(TASKS);
  const [filters, setFilters] = useState<TaskFilters>(NO_FILTERS);
  const [view, setView] = useState<TaskView>('list');
  const rows = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);
  const change = (patch: Partial<TaskFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const finish = (t: DummyTask) => {
    setTasks((all) =>
      all.map((x) => (x.number === t.number ? { ...x, status: 'done', note: undefined } : x)),
    );
    notify.success(`Tugas #${t.number} ditandai selesai.`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Tugas"
        actions={
          <Button
            component={Link}
            to="/app/tasks/new"
            leftSection={<FiPlus size="1.25em" aria-hidden />}
          >
            Tugas baru
          </Button>
        }
      />
      <TasksToolbar filters={filters} onChange={change} view={view} onView={setView} all={tasks} />
      {view === 'list' ? (
        <TasksList
          rows={rows}
          onDone={finish}
          onReset={() => setFilters({ ...NO_FILTERS, scope: filters.scope })}
          filtered={isFiltered(filters)}
        />
      ) : (
        <TasksBoard rows={rows} />
      )}
      {filters.scope === 'mine' && (
        <Text size="xs" c="dimmed">
          Tidak ada bagian "Menunggu diperiksa saya": Member tidak memeriksa tugas orang lain,
          kecuali ditunjuk jadi Pengelola proyek.
        </Text>
      )}
    </PageContainer>
  );
}
