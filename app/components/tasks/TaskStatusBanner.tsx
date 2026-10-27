/**
 * Notes under a task header: the project is finished, canceled or on hold (tasks may still be added,
 * Q12), and why a canceled task was canceled.
 */
import { Alert, Stack } from '@mantine/core';
import type { ProjectStatus } from '@server/pm/enums';
import type { TaskDetail } from '@server/task/task.dto';
import { FiInfo, FiXCircle } from 'react-icons/fi';
import { BANNER_COPY } from '~/components/projects/projects.copy';
import { PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import { CANCEL_CATEGORY_LABELS, DETAIL_COPY } from './tasks.copy';

/** Project statuses that get the "Proyek ini sudah …" note. */
export const CLOSED_PROJECT_STATUSES: readonly ProjectStatus[] = [
  'completed',
  'canceled',
  'on_hold',
];

export type TaskBannerTask = Pick<TaskDetail, 'status' | 'project' | 'cancel'>;

/** "Dibatalkan: Tugas dobel — catatan", or null for a task that is not canceled. */
export function cancelNote(task: TaskBannerTask): string | null {
  if (task.status !== 'canceled' || !task.cancel) return null;
  const label = CANCEL_CATEGORY_LABELS[task.cancel.category];
  return task.cancel.note ? `${label} — ${task.cancel.note}` : label;
}

export function TaskStatusBanner({ task }: { task: TaskBannerTask }) {
  const closed = CLOSED_PROJECT_STATUSES.includes(task.project.status);
  const canceled = cancelNote(task);
  if (!closed && !canceled) return null;
  return (
    <Stack gap="xs">
      {canceled && (
        <Alert
          color="gray"
          variant="light"
          icon={<FiXCircle size="1.25em" aria-hidden />}
          title={DETAIL_COPY.cancelReason}
          // Notes are user text: keep line breaks, never render HTML. Mantine has no prop for it.
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {canceled}
        </Alert>
      )}
      {closed && (
        <Alert color="gray" variant="light" icon={<FiInfo size="1.25em" aria-hidden />}>
          {BANNER_COPY.closed(PROJECT_STATUS_LABELS[task.project.status].label)}
        </Alert>
      )}
    </Stack>
  );
}
