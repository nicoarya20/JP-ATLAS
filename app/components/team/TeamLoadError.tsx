/** Failed load of the Team list: one clear sentence and a way to try again. */
import { Alert, Button, Stack } from '@mantine/core';
import { FiAlertCircle } from 'react-icons/fi';
import { TEAM_COPY } from './team.copy';

type Props = { message: string; retrying: boolean; onRetry: () => void };

export function TeamLoadError({ message, retrying, onRetry }: Props) {
  return (
    <Alert
      color="red"
      variant="light"
      title={TEAM_COPY.loadFailed}
      icon={<FiAlertCircle size="1.25em" aria-hidden />}
    >
      <Stack gap="xs" align="flex-start">
        {message}
        <Button size="sm" variant="light" color="red" loading={retrying} onClick={onRetry}>
          {TEAM_COPY.retry}
        </Button>
      </Stack>
    </Alert>
  );
}
