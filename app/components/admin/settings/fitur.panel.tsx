/**
 * Pengaturan › Fitur, the real panel (RD-09). Answers "which parts of /app are switched on for
 * this office?" from `GET /api/settings` — the public read, so this screen needs no extra guard
 * beyond the Admin guard on the page itself.
 *
 * Read-only by decision (user, 23 Okt 2026; plan §3 D5): turning a feature off is an operations
 * act. Killing `trash` turns every Hapus in the app into a permanent delete, and the consequences
 * are only readable from /dev/server-logs, so the switches stay with Super-admin in
 * `FeatureFlagsCard`. One writer, one audit trail. Nothing here mutates, and there is no save row.
 *
 * ⚠️ What the badge reports is the *flag status in the database*, not behaviour: real gating was
 * RD-10 and it was dropped (plan §3 D5, §9 R3), so a flag reading Mati disables nothing today.
 * The copy below says exactly that, and must not be softened into a claim that the feature
 * itself has stopped working while the debt is open.
 */
import { Alert, Badge, Group, Loader, Paper, Stack, Text } from '@mantine/core';
import { readFeatureStatus } from '@server/features.catalog';
import { useQuery } from '@tanstack/react-query';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { SettingsCard } from '~/components/settings/SettingsParts';
import { EmptyState } from '~/components/ui/EmptyState';
import { fetchPublicSettings } from '~/lib/settings-api';

const COPY = {
  title: 'Fitur yang dinyalakan',
  description:
    'Daftar baca-saja. Menyalakan atau mematikan fitur dilakukan Super-admin di /dev › Pengaturan › Feature flags, karena mematikan fitur bisa menghilangkan jaring pengaman dan akibatnya hanya terbaca dari log server.',
  honesty:
    'Yang ditampilkan di sini adalah status flag di basis data, bukan janji perilaku: belum ada fitur yang membaca flag-nya, jadi fitur yang flag-nya Mati pun masih berjalan seperti biasa. Kalimat "Bila dimatikan" menjelaskan apa yang akan hilang setelah penyaringan fitur dibangun.',
  honestyTitle: 'Status flag, bukan tombol mati-hidup',
  loading: 'Memuat status fitur…',
  errorTitle: 'Gagal memuat status fitur',
  errorHint: 'Status flag tidak bisa dibaca dari server. Coba lagi.',
  retry: 'Coba lagi',
  on: 'Nyala',
  off: 'Mati',
  whenOff: 'Bila dimatikan:',
  /** A key nobody has saved in /dev yet: `isFeatureEnabled()` answers off for it. */
  unsetHint: (defaultEnabled: boolean) =>
    `Belum pernah disetel di /dev — bawaan katalog: ${defaultEnabled ? 'Nyala' : 'Mati'}.`,
  aside: (on: number, total: number) => `${on} dari ${total} flag nyala`,
} as const;

export function FiturPanel() {
  const q = useQuery({ queryKey: ['public-settings'], queryFn: fetchPublicSettings });
  const rows = readFeatureStatus(q.data?.features);
  const on = rows.filter((f) => f.enabled).length;

  return (
    <Stack gap="md">
      <Alert
        color="yellow"
        variant="light"
        radius="md"
        icon={<FiAlertTriangle size="1.25em" aria-hidden />}
        title={COPY.honestyTitle}
      >
        {COPY.honesty}
      </Alert>

      <SettingsCard
        title={COPY.title}
        description={COPY.description}
        aside={q.isSuccess ? <Badge variant="light">{COPY.aside(on, rows.length)}</Badge> : null}
      >
        {q.isPending && (
          <Group gap="xs" justify="center" py="md">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {COPY.loading}
            </Text>
          </Group>
        )}

        {q.isError && (
          <EmptyState
            icon={FiRefreshCw}
            title={COPY.errorTitle}
            description={COPY.errorHint}
            action={{ label: COPY.retry, onClick: () => void q.refetch() }}
          />
        )}

        {q.isSuccess && (
          <Stack gap="xs">
            {rows.map((f) => (
              <Paper key={f.key} withBorder p="sm">
                <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                  <Stack gap={4} miw={0} flex={1}>
                    <Text fw={600}>{f.label}</Text>
                    <Text size="sm" c="dimmed">
                      {f.description}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {COPY.whenOff} {f.whenOff}
                    </Text>
                    {f.unset && (
                      <Text size="xs" c="dimmed">
                        {COPY.unsetHint(f.defaultEnabled)}
                      </Text>
                    )}
                  </Stack>
                  {/* Text as well as colour: the state must survive a colour-blind reader. */}
                  <Badge variant="light" color={f.enabled ? 'ok' : 'gray'} flex="0 0 auto">
                    {f.enabled ? COPY.on : COPY.off}
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </SettingsCard>
    </Stack>
  );
}
