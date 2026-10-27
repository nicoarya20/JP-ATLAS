/**
 * The approval-queue card of the Admin Beranda — the one card on that screen holding real data
 * (`adminUserStats()`), which is why it carries no Pratinjau marker while its five neighbours do.
 *
 * It keeps the shape of the preview cards around it so AD-15 can drop the others into the same
 * grid without the real one looking like a stranger.
 */
import { Anchor, Button, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { FiClock } from 'react-icons/fi';
import { Link } from 'react-router';
import { SectionCard } from '~/components/ui/SectionCard';

const nf = new Intl.NumberFormat('id-ID');

export const ANTREAN_COPY = {
  title: 'Antrean persetujuan',
  subtitle: 'Ada yang menunggu dipersilakan masuk?',
  empty: 'Tidak ada yang menunggu persetujuan',
  emptyHint: 'Pendaftar baru akan muncul di sini.',
  waitingHint: 'Orang yang baru mendaftar belum bisa memakai aplikasi sampai kamu menyetujuinya.',
  review: 'Tinjau sekarang',
  open: 'Buka halaman Pengguna',
} as const;

export function AntreanWidget({ pending }: { pending: number }) {
  const waiting = pending > 0;
  return (
    <SectionCard
      title={ANTREAN_COPY.title}
      subtitle={ANTREAN_COPY.subtitle}
      accent={waiting ? 'warn' : undefined}
    >
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="sm" c="dimmed">
            Data sungguhan
          </Text>
          <Anchor component={Link} to="/dashboard/users" size="sm">
            {ANTREAN_COPY.open}
          </Anchor>
        </Group>
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon variant="light" color={waiting ? 'yellow' : 'gray'} size="xl" radius="md">
            <FiClock size="1.25em" aria-hidden />
          </ThemeIcon>
          <div style={{ minWidth: 0 }}>
            <Text fw={600}>
              {waiting ? `${nf.format(pending)} menunggu persetujuan` : ANTREAN_COPY.empty}
            </Text>
            <Text size="sm" c="dimmed">
              {waiting ? ANTREAN_COPY.waitingHint : ANTREAN_COPY.emptyHint}
            </Text>
          </div>
        </Group>
        {waiting && (
          <Button component={Link} to="/dashboard/users?tab=pending" size="sm">
            {ANTREAN_COPY.review}
          </Button>
        )}
      </Stack>
    </SectionCard>
  );
}
