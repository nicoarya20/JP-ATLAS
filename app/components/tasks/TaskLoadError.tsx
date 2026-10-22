/** A task list that could not load, or load its next page: what went wrong in plain words and a retry button. */
import { Alert, Button, Stack, Text } from '@mantine/core';
import { taskErrorMessage } from '~/lib/tasks-api';
import { LIST_COPY } from './tasks.copy';

type Props = {
  error: unknown;
  onRetry: () => void;
  /** Heading; defaults to "Daftar tugas gagal dimuat." */
  title?: string;
  retrying?: boolean;
};

export function TaskLoadError({ error, onRetry, title = LIST_COPY.loadFailed, retrying }: Props) {
  return (
    <Alert color="danger" title={title}>
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{taskErrorMessage(error)}</Text>
        <Button variant="light" loading={retrying} onClick={onRetry}>
          {LIST_COPY.retry}
        </Button>
      </Stack>
    </Alert>
  );
}
