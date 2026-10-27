/**
 * The approval-queue card of the Admin Beranda — the one card that was already real before AD-14,
 * now one of the six `Widget { ok }` sections of `GET /api/admin/overview` (AD-15). It keeps its own
 * file because it is the only card with an accent border (warn while someone waits) and a call to
 * action, so its state depends on the data in a way the list cards do not.
 */
import { Anchor, Box, Button, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import type { PendingApprovals, Widget } from '@server/admin/overview/overview.dto';
import { FiClock } from 'react-icons/fi';
import { Link } from 'react-router';
import { type Retry, WidgetError } from '~/components/home/HomeSection';
import { SectionCard } from '~/components/ui/SectionCard';
import { OVERVIEW_COPY } from './overview.copy';

const nf = new Intl.NumberFormat('id-ID');
const COPY = OVERVIEW_COPY.pending;

export function AntreanWidget({
  widget,
  retry,
}: {
  widget: Widget<PendingApprovals>;
  retry: Retry;
}) {
  const waiting = widget.ok && widget.data.count > 0;
  return (
    <SectionCard title={COPY.title} subtitle={COPY.subtitle} accent={waiting ? 'warn' : undefined}>
      {widget.ok ? (
        <Stack gap="sm">
          <Group justify="flex-end" wrap="wrap" gap="xs">
            <Anchor component={Link} to="/dashboard/users" size="sm">
              {COPY.open}
            </Anchor>
          </Group>
          <Group gap="sm" wrap="nowrap" miw={0}>
            <ThemeIcon variant="light" color={waiting ? 'yellow' : 'gray'} size="xl" radius="md">
              <FiClock size="1.25em" aria-hidden />
            </ThemeIcon>
            <Box miw={0}>
              <Text fw={600}>
                {waiting ? COPY.waiting(nf.format(widget.data.count)) : COPY.empty}
              </Text>
              <Text size="sm" c="dimmed">
                {waiting ? COPY.waitingHint : COPY.emptyHint}
              </Text>
            </Box>
          </Group>
          {waiting && (
            <Button component={Link} to="/dashboard/users?tab=pending" size="sm">
              {COPY.review}
            </Button>
          )}
        </Stack>
      ) : (
        <WidgetError {...retry} />
      )}
    </SectionCard>
  );
}
