import { Button, CloseButton, Group, Paper, Select, Text, TextInput } from '@mantine/core';
import { FiSearch, FiX } from 'react-icons/fi';
import {
  type ActivityCategory,
  type AdminActivityFilters as Filters,
  DEFAULT_ACTIVITY_FILTERS,
  hasActiveActivityFilters,
} from '~/lib/admin-activity-api';

const nf = new Intl.NumberFormat('id-ID');
const PERIODS = [
  { value: '1', label: '24 jam terakhir' },
  { value: '7', label: '7 hari terakhir' },
  { value: '30', label: '30 hari terakhir' },
  { value: 'all', label: 'Semua waktu' },
];

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  categories: ActivityCategory[];
  matchCount: number | undefined;
};

export function ActivityFilters({ filters, onChange, categories, matchCount }: Props) {
  const active = hasActiveActivityFilters(filters);
  const categoryData = categories.map((c) => ({ value: c.id, label: c.label }));
  return (
    <Paper withBorder p="sm">
      <Group gap="xs" wrap="wrap" align="center">
        <TextInput
          placeholder="Cari keterangan atau orang…"
          leftSection={<FiSearch size="1.25em" />}
          rightSection={
            filters.search ? (
              <CloseButton
                size="sm"
                aria-label="Bersihkan pencarian"
                onClick={() => onChange({ search: '' })}
              />
            ) : null
          }
          value={filters.search}
          onChange={(e) => onChange({ search: e.currentTarget.value })}
          flex="1 1 240px"
          miw={0}
          inputMode="search"
        />
        <Select
          w={{ base: '100%', sm: 180 }}
          value={filters.period}
          onChange={(v) => onChange({ period: (v as Filters['period']) ?? 'all' })}
          data={PERIODS}
          allowDeselect={false}
          aria-label="Periode"
        />
        <Select
          w={{ base: '100%', sm: 220 }}
          placeholder="Semua jenis aktivitas"
          value={filters.category}
          onChange={(v) => onChange({ category: v })}
          data={categoryData}
          clearable
          aria-label="Jenis aktivitas"
        />
        {active && (
          <Button
            variant="subtle"
            color="gray"
            leftSection={<FiX size="1.25em" />}
            onClick={() => onChange(DEFAULT_ACTIVITY_FILTERS)}
          >
            Reset filter
          </Button>
        )}
      </Group>
      {matchCount !== undefined && (
        <Text size="xs" c="dimmed" mt="xs">
          {nf.format(matchCount)} aktivitas {active ? 'cocok dengan filter' : 'tercatat'}
        </Text>
      )}
    </Paper>
  );
}
