/**
 * The matrix itself, as a pure view over what `GET /api/admin/permissions-matrix` answered.
 * Five columns never fit 375px, so the desktop table scrolls sideways and the phone gets one
 * card per capability — every answer stays readable without a horizontal swipe.
 */
import { Badge, Box, Code, Group, Paper, Stack, Table, Text } from '@mantine/core';
import type { MatrixCell, PermissionsMatrix } from '@server/api/admin-permissions.matrix';
import { FiCheck, FiMinus } from 'react-icons/fi';

export const MATRIX_COPY = {
  yes: 'Ya',
  no: 'Tidak',
  capabilityHeader: 'Kemampuan',
  tableLabel: 'Matriks peran dan kemampuan',
} as const;

/** Text first, colour second: the answer must survive a screenshot in grayscale. */
function CellValue({ cell }: { cell: MatrixCell }) {
  if (cell.granted === null) return <Code>{cell.note}</Code>;
  return cell.granted ? (
    <Badge variant="light" color="teal" leftSection={<FiCheck size="1.25em" aria-hidden />}>
      {MATRIX_COPY.yes}
    </Badge>
  ) : (
    <Badge variant="light" color="gray" leftSection={<FiMinus size="1.25em" aria-hidden />}>
      {MATRIX_COPY.no}
    </Badge>
  );
}

function CapabilityLabel({ label, description }: { label: string; description: string }) {
  return (
    <Stack gap={2} style={{ minWidth: 0 }}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      <Text size="xs" c="dimmed">
        {description}
      </Text>
    </Stack>
  );
}

function MatrixTable({ matrix }: { matrix: PermissionsMatrix }) {
  return (
    <Paper withBorder radius="md" visibleFrom="sm" style={{ overflow: 'hidden' }}>
      <Box style={{ overflowX: 'auto' }}>
        <Table
          highlightOnHover
          verticalSpacing="sm"
          fz="sm"
          style={{ minWidth: 720 }}
          aria-label={MATRIX_COPY.tableLabel}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: 260 }}>{MATRIX_COPY.capabilityHeader}</Table.Th>
              {matrix.roles.map((role) => (
                <Table.Th key={role.id}>{role.label}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {matrix.capabilities.map((cap) => (
              <Table.Tr key={cap.id}>
                <Table.Td>
                  <CapabilityLabel label={cap.label} description={cap.description} />
                </Table.Td>
                {cap.cells.map((cell) => (
                  <Table.Td key={cell.role}>
                    <CellValue cell={cell} />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    </Paper>
  );
}

function MatrixCards({ matrix }: { matrix: PermissionsMatrix }) {
  const labelOf = (role: string) => matrix.roles.find((r) => r.id === role)?.label ?? role;
  return (
    <Stack gap="xs" hiddenFrom="sm">
      {matrix.capabilities.map((cap) => (
        <Paper key={cap.id} withBorder p="sm" radius="md">
          <Stack gap="xs">
            <CapabilityLabel label={cap.label} description={cap.description} />
            {cap.cells.map((cell) => (
              <Group key={cell.role} justify="space-between" wrap="nowrap" gap="xs">
                <Text size="sm" style={{ minWidth: 0 }} truncate>
                  {labelOf(cell.role)}
                </Text>
                <Box style={{ flexShrink: 0 }}>
                  <CellValue cell={cell} />
                </Box>
              </Group>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

/** Who each column is, kept out of the header so the table stays narrow enough to read. */
function RoleLegend({ matrix }: { matrix: PermissionsMatrix }) {
  return (
    <Stack gap={4}>
      {matrix.roles.map((role) => (
        <Text key={role.id} size="xs" c="dimmed">
          <Text span fw={600} inherit>
            {role.label}
          </Text>
          {` — ${role.description}`}
        </Text>
      ))}
    </Stack>
  );
}

export function PermissionsMatrixView({ matrix }: { matrix: PermissionsMatrix }) {
  return (
    <Stack gap="md">
      <MatrixTable matrix={matrix} />
      <MatrixCards matrix={matrix} />
      <RoleLegend matrix={matrix} />
    </Stack>
  );
}
