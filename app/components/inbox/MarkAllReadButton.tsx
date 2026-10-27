/** "Tandai semua dibaca" of the news tab; disabled with its reason when nothing is unread. */
import { Box, Button, Tooltip } from '@mantine/core';
import { FiCheck } from 'react-icons/fi';
import { INBOX_COPY } from './inbox.copy';

type Props = { unread: number; loading: boolean; onClick: () => void };

export function MarkAllReadButton({ unread, loading, onClick }: Props) {
  const none = unread === 0;
  return (
    <Tooltip label={INBOX_COPY.markAllNone} disabled={!none} withArrow>
      {/* Mantine does not show a tooltip on a disabled button itself, so the wrapper carries it. */}
      <Box component="span">
        <Button
          variant="default"
          leftSection={<FiCheck size="1.25em" aria-hidden />}
          loading={loading}
          disabled={none}
          onClick={onClick}
        >
          {INBOX_COPY.markAll}
        </Button>
      </Box>
    </Tooltip>
  );
}
