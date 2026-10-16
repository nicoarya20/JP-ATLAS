import {
  Button,
  Group,
  Menu,
  ScrollArea,
  SegmentedControl,
  Select,
  TextInput,
} from '@mantine/core';
import { FiChevronDown, FiColumns, FiList, FiSearch } from 'react-icons/fi';
import { ViewToggle } from '~/components/ui/ViewToggle';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import {
  type DummyTask,
  KIND_LABELS,
  STATUS_CHIPS,
  type TaskFilters,
  type TaskScope,
  type TaskSort,
} from './tasks.dummy';
import { distinct } from './tasks.filter';

export type TaskView = 'list' | 'board';

type Props = {
  filters: TaskFilters;
  onChange: (patch: Partial<TaskFilters>) => void;
  view: TaskView;
  onView: (v: TaskView) => void;
  all: readonly DummyTask[];
};

const SORT_LABELS: Record<TaskSort, string> = { due: 'Tenggat', priority: 'Prioritas' };

/** Scope tabs, search, view switch, status chips, dropdown filters and sort for Tugas. */
export function TasksToolbar({ filters: f, onChange, view, onView, all }: Props) {
  const drop = (
    label: string,
    key: 'project' | 'person' | 'kind' | 'priority' | 'tag',
    data: { value: string; label: string }[],
  ) => (
    <Select
      key={key}
      aria-label={label}
      placeholder={label}
      data={data}
      value={f[key]}
      onChange={(v) => onChange({ [key]: v })}
      clearable
      w={{ base: '46%', sm: 150 }}
    />
  );
  const plain = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
  return (
    <>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm" wrap="wrap" style={{ flex: 1 }}>
          <SegmentedControl
            aria-label="Cakupan tugas"
            value={f.scope}
            onChange={(v) => onChange({ scope: v as TaskScope })}
            data={[
              { value: 'mine', label: 'Tugas saya' },
              { value: 'all', label: 'Semua tugas' },
            ]}
          />
          <TextInput
            style={{ flex: '1 1 220px', maxWidth: 360 }}
            placeholder="Cari judul, #nomor, atau tag..."
            aria-label="Cari tugas"
            leftSection={<FiSearch size="1.25em" aria-hidden />}
            value={f.q}
            onChange={(e) => onChange({ q: e.currentTarget.value })}
          />
        </Group>
        <ViewToggle
          value={view}
          onChange={onView}
          ariaLabel="Pilih tampilan tugas"
          options={[
            { value: 'list', label: 'List', icon: FiList },
            { value: 'board', label: 'Papan', icon: FiColumns },
          ]}
        />
      </Group>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <ScrollArea type="never" style={{ maxWidth: '100%' }}>
          <Group gap="xs" wrap="nowrap" role="group" aria-label="Saring menurut status">
            {STATUS_CHIPS.map((c) => (
              <Button
                key={c.value}
                radius="xl"
                variant={f.status === c.value ? 'filled' : 'default'}
                aria-pressed={f.status === c.value}
                onClick={() => onChange({ status: c.value })}
              >
                {c.label}
              </Button>
            ))}
          </Group>
        </ScrollArea>
        <Menu position="bottom-end">
          <Menu.Target>
            <Button variant="subtle" rightSection={<FiChevronDown size="1.25em" aria-hidden />}>
              {`Urutkan: ${SORT_LABELS[f.sort]}`}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {(Object.keys(SORT_LABELS) as TaskSort[]).map((s) => (
              <Menu.Item key={s} onClick={() => onChange({ sort: s })}>
                {SORT_LABELS[s]}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>
      <Group gap="xs" wrap="wrap">
        {drop('Proyek', 'project', plain(distinct(all, (t) => [t.project])))}
        {drop('Orang', 'person', plain(distinct(all, (t) => [t.assignee])))}
        {drop(
          'Jenis',
          'kind',
          Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label })),
        )}
        {drop(
          'Prioritas',
          'priority',
          Object.entries(PRIORITY_LABELS).map(([value, p]) => ({ value, label: p.label })),
        )}
        {drop('Tag', 'tag', plain(distinct(all, (t) => t.tags)))}
      </Group>
    </>
  );
}
