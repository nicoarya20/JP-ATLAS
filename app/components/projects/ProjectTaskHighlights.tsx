/**
 * "Tugas terlambat dan penting" card on the project summary.
 * HAND-OVER(S2-14, lane L3b): placeholder until the task list exists; S2-14 fills it with at most
 * five overdue or high-priority tasks and owns this file from then on (P3 §3, SP-M).
 */
import { Paper, Stack, Text } from '@mantine/core';
import { FiStar } from 'react-icons/fi';
import { EmptyState } from '~/components/ui/EmptyState';
import { SUMMARY_COPY } from './projects.copy';

export function ProjectTaskHighlights() {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="xs">
        <Text fw={600}>{SUMMARY_COPY.highlightsTitle}</Text>
        <EmptyState
          icon={FiStar}
          title={SUMMARY_COPY.highlightsEmpty}
          description={SUMMARY_COPY.highlightsEmptyHint}
        />
      </Stack>
    </Paper>
  );
}
