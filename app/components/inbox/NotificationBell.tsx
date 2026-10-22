/** The bell in the shell: a link to the Inbox with the number of open "Perlu Anda tanggapi" cards. */
import { ActionIcon, Indicator, Tooltip } from '@mantine/core';
import { FiBell } from 'react-icons/fi';
import { Link } from 'react-router';
import { INBOX_PATH } from '~/lib/inbox-api';
import { BELL_COPY, BELL_MAX } from './inbox.copy';

/** The number on the bell: `99+` past the limit, nothing at zero (the dot disappears). */
export const bellLabel = (count: number): string | null =>
  count <= 0 ? null : count > BELL_MAX ? `${BELL_MAX}+` : String(count);

export function NotificationBell({ count }: { count: number }) {
  const label = bellLabel(count);
  return (
    <Tooltip label={BELL_COPY.label(count)} withArrow>
      <Indicator label={label} disabled={label === null} color="red" size={18} offset={6} inline>
        <ActionIcon
          component={Link}
          to={INBOX_PATH}
          prefetch="intent"
          variant="subtle"
          color="gray"
          aria-label={BELL_COPY.label(count)}
        >
          <FiBell size="1.25em" aria-hidden />
        </ActionIcon>
      </Indicator>
    </Tooltip>
  );
}
