import { Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { EXPORT_META, type ExportKind } from '@server/api/admin-export.kinds';
import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { notify } from '~/components/ui/notify';
import { describeApiError } from '~/lib/http';
import { EXPORT_ITEMS, EXPORT_PANEL_COPY, type ExportItem } from './ekspor-data.content';
import { downloadExport } from './ekspor-data.download';

/** Used only when the response carries no file name; the server normally dates the file itself. */
const fallbackName = (kind: ExportKind) => `${EXPORT_META[kind].slug}.csv`;

/**
 * Ekspor data tab of /dashboard/settings (P11 AD-10): one card per CSV download. Exports read
 * nothing from the page loader — the tab shell keeps that loader empty on purpose — so each card
 * fetches on press, shows `loading` while the file streams, and reports the outcome in a toast.
 * Nothing is destroyed here, so there is no confirmation dialog.
 */
export function EksporDataPanel() {
  const [busy, setBusy] = useState<ExportKind | null>(null);

  async function run(item: ExportItem) {
    setBusy(item.kind);
    try {
      const filename = await downloadExport(item.kind, fallbackName(item.kind));
      notify.success(`CSV ${item.label.toLowerCase()} diunduh sebagai ${filename}.`);
    } catch (err) {
      notify.error(
        `${EXPORT_PANEL_COPY.failTitle} CSV ${item.label.toLowerCase()}`,
        describeApiError(err),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {EXPORT_PANEL_COPY.intro}
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        {EXPORT_ITEMS.map((item) => (
          <Paper key={item.kind} withBorder p="md" radius="md">
            <Stack gap="sm" h="100%" justify="space-between">
              <Stack gap={4}>
                <Group gap="xs" wrap="nowrap">
                  <ThemeIcon variant="light" color="gray" radius="md">
                    <FiDownload size="1.25em" aria-hidden />
                  </ThemeIcon>
                  <Text fw={600}>{item.label}</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {item.description}
                </Text>
              </Stack>
              <Button
                variant="light"
                fullWidth
                leftSection={<FiDownload size="1.25em" aria-hidden />}
                loading={busy === item.kind}
                // One export at a time: each one is a full table read on the server.
                disabled={busy !== null && busy !== item.kind}
                onClick={() => void run(item)}
              >
                {item.action}
              </Button>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>

      <Text size="xs" c="dimmed">
        {EXPORT_PANEL_COPY.auditNote}
      </Text>
    </Stack>
  );
}
