/** "Menampilkan n dari total" and "Tampilkan lebih banyak", shared by the list, grid and timeline views. */
import { Button, Stack, Text } from '@mantine/core';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectListItem } from '@server/project/project.dto';
import type { ReactNode } from 'react';
import { LIST_COPY } from './projects.copy';

/** Props every view of the project list takes: the loaded items plus the paging state. */
export type ProjectViewProps = {
  items: ProjectListItem[];
  total: number;
  today: IsoDate;
  /** Shown instead of the view when `items` is empty (`ProjectEmpty`). */
  empty: ReactNode;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
};

type Props = Pick<ProjectViewProps, 'total' | 'hasMore' | 'loadingMore' | 'onMore'> & {
  shown: number;
};

export function ProjectMore({ shown, total, hasMore, loadingMore, onMore }: Props) {
  if (shown === 0) return null;
  return (
    <Stack gap="xs" align="center">
      <Text size="sm" c="dimmed">
        {LIST_COPY.shown(shown, total)}
      </Text>
      {hasMore && (
        <Button variant="default" onClick={onMore} loading={loadingMore}>
          {LIST_COPY.more}
        </Button>
      )}
    </Stack>
  );
}
