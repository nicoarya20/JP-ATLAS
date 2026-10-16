import { Button, Group, Menu, ScrollArea, TextInput } from '@mantine/core';
import { FiAlertTriangle, FiChevronDown, FiGrid, FiList, FiSearch } from 'react-icons/fi';
import { ViewToggle } from '~/components/ui/ViewToggle';
import { type ProjectSort, SORTS, STATUS_FILTERS, type StatusFilter } from './projects.dummy';

export type ProjectView = 'list' | 'grid';

type Props = {
  q: string;
  onQ: (v: string) => void;
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  sort: ProjectSort;
  onSort: (v: ProjectSort) => void;
  view: ProjectView;
  onView: (v: ProjectView) => void;
};

/** Search box, view switch, status chips and sort menu above the project list. */
export function ProjectsToolbar(p: Props) {
  const sortLabel = SORTS.find((s) => s.value === p.sort)?.label;
  return (
    <>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <TextInput
          style={{ flex: '1 1 260px', maxWidth: 420 }}
          placeholder="Cari nama atau deskripsi proyek..."
          aria-label="Cari proyek"
          leftSection={<FiSearch size="1.25em" aria-hidden />}
          value={p.q}
          onChange={(e) => p.onQ(e.currentTarget.value)}
        />
        <ViewToggle
          value={p.view}
          onChange={p.onView}
          ariaLabel="Pilih tampilan proyek"
          options={[
            { value: 'list', label: 'List', icon: FiList },
            { value: 'grid', label: 'Grid', icon: FiGrid },
          ]}
        />
      </Group>
      <Group justify="space-between" wrap="wrap" gap="sm">
        <ScrollArea type="never" style={{ maxWidth: '100%' }}>
          <Group gap="xs" wrap="nowrap" role="group" aria-label="Saring menurut status">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                radius="xl"
                variant={p.status === f.value ? 'filled' : 'default'}
                aria-pressed={p.status === f.value}
                leftSection={
                  f.value === 'attention' ? (
                    <FiAlertTriangle size="1.25em" aria-hidden />
                  ) : undefined
                }
                onClick={() => p.onStatus(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </Group>
        </ScrollArea>
        <Menu position="bottom-end">
          <Menu.Target>
            <Button variant="subtle" rightSection={<FiChevronDown size="1.25em" aria-hidden />}>
              {`Urutkan: ${sortLabel}`}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {SORTS.map((s) => (
              <Menu.Item key={s.value} onClick={() => p.onSort(s.value)}>
                {s.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>
    </>
  );
}
