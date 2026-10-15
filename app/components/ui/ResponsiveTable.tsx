import { Box, Paper, Stack, Table } from '@mantine/core';
import type { ReactNode } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg';

export type ResponsiveColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Hides the column below this breakpoint (tablet portrait); mobile uses the card instead. */
  hideBelow?: Breakpoint;
  align?: 'left' | 'right' | 'center';
  /** Keep short, secondary columns narrow so the primary one gets the width. */
  width?: number | string;
};

type Props<T> = {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Mobile layout of one row: primary data first, secondary data dimmed, actions last (CLAUDE.md mobile §2). */
  renderCard: (row: T) => ReactNode;
  /** Shown instead of table and cards when `rows` is empty; pass an `EmptyState`. */
  empty: ReactNode;
  /** Accessible name of the table for screen readers. */
  label: string;
};

/**
 * Table from `sm` up and a card list below it. Both are always in the markup and CSS picks one, so
 * server and client render the same HTML and there is no hydration flash (R05 §3.4 #11).
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  renderCard,
  empty,
  label,
}: Props<T>) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <>
      <Box style={{ overflowX: 'auto' }} visibleFrom="sm">
        <Table aria-label={label} highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              {columns.map((c) => (
                <Table.Th key={c.key} visibleFrom={c.hideBelow} ta={c.align} w={c.width}>
                  {c.header}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={getRowKey(row)}>
                {columns.map((c) => (
                  <Table.Td key={c.key} visibleFrom={c.hideBelow} ta={c.align}>
                    {c.cell(row)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
      <Stack gap="xs" hiddenFrom="sm" aria-label={label} role="list">
        {rows.map((row) => (
          <Paper key={getRowKey(row)} withBorder p="sm" radius="md" role="listitem">
            {renderCard(row)}
          </Paper>
        ))}
      </Stack>
    </>
  );
}
