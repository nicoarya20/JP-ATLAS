/** Failed load of the Inbox: one clear sentence and a way to try again. */
import { Alert, Button, Stack } from '@mantine/core';
import { FiAlertCircle } from 'react-icons/fi';
import { INBOX_COPY } from './inbox.copy';

type Props = { message: string; retrying: boolean; onRetry: () => void };

export function InboxLoadError({ message, retrying, onRetry }: Props) {
  return (
    <Alert
      color="red"
      variant="light"
      title={INBOX_COPY.loadFailed}
      icon={<FiAlertCircle size="1.25em" aria-hidden />}
    >
      <Stack gap="xs" align="flex-start">
        {message}
        <Button size="sm" variant="light" color="red" loading={retrying} onClick={onRetry}>
          {INBOX_COPY.retry}
        </Button>
      </Stack>
    </Alert>
  );
}
