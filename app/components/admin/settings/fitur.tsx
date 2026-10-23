// PRATINJAU(AD-08): curated feature list with sample states; nothing is read or saved.
/**
 * Preview of Pengaturan › Fitur. Answers "which parts of the app are switched on for this
 * office?" — a short, named list with a sentence each and the menu the switch actually hides.
 *
 * Read-only by decision (user, 23 Okt 2026): turning a feature off is an operations act, not an
 * office setting. Killing `trash` turns every Hapus in the app into a permanent delete, and a
 * feature marked "uji coba" can break — both need whoever can read `/dev/server-logs` and put it
 * back. So the switches stay with Super-admin in /dev (`FeatureFlagsCard`, one source of truth)
 * and an Admin reads here, in Indonesian, what is on and what disappears when it goes off.
 */
import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { PratinjauPanel } from '~/components/admin/pratinjau/pratinjau';
import { SettingsCard } from '~/components/settings/SettingsParts';

const OWNER = 'AD-08';

type Feature = {
  key: string;
  label: string;
  description: string;
  /** What vanishes from the app when this goes off — the sentence that makes the state readable. */
  effect: string;
  stage: 'stabil' | 'uji-coba';
  on: boolean;
};

const SAMPLE_FEATURES: Feature[] = [
  {
    key: 'leave',
    label: 'Cuti & izin',
    description: 'Anggota mengajukan cuti, atasannya menyetujui, kalender ikut menandainya.',
    effect: 'Menu Cuti hilang dari /app dan pengajuan yang sudah ada jadi hanya bisa dibaca.',
    stage: 'stabil',
    on: true,
  },
  {
    key: 'events',
    label: 'Kalender acara',
    description: 'Rapat dan tenggat dalam satu kalender bulanan per tim.',
    effect: 'Menu Agenda hilang; acara yang tersimpan tidak dihapus.',
    stage: 'stabil',
    on: true,
  },
  {
    key: 'trash',
    label: 'Sampah & pulihkan',
    description: 'Yang dihapus mampir 30 hari di Sampah sebelum benar-benar hilang.',
    effect: 'Penghapusan jadi permanen seketika — seluruh tombol Hapus kehilangan jaring pengaman.',
    stage: 'stabil',
    on: true,
  },
  {
    key: 'ask-data',
    label: 'Ask Data di Beranda',
    description: 'Pertanyaan singkat tentang data sendiri, dijawab dari aturan — tanpa AI.',
    effect: 'Kotak tanya di Beranda hilang; widget lain tetap.',
    stage: 'uji-coba',
    on: false,
  },
  {
    key: 'export',
    label: 'Ekspor CSV',
    description: 'Unduhan anggota, proyek, dan tugas dari menu Ekspor data.',
    effect: 'Menu Ekspor data hilang untuk Admin; Super-admin tetap bisa.',
    stage: 'stabil',
    on: true,
  },
  {
    key: 'api-keys',
    label: 'Kunci API',
    description: 'Anggota membuat kunci untuk menyambungkan aplikasi lain.',
    effect: 'Kunci yang sudah ada berhenti berlaku sampai fitur ini dinyalakan lagi.',
    stage: 'uji-coba',
    on: false,
  },
];

const STAGE = {
  stabil: { label: 'Stabil', color: 'ok' },
  'uji-coba': { label: 'Uji coba', color: 'yellow' },
} as const;

export function FiturPreview() {
  const on = SAMPLE_FEATURES.filter((f) => f.on).length;

  return (
    <PratinjauPanel owner={OWNER}>
      <SettingsCard
        title="Fitur yang dinyalakan"
        description="Daftar baca-saja. Menyalakan atau mematikan fitur dilakukan Super-admin di /dev › Pengaturan › Feature flags, karena mematikan fitur bisa menghilangkan jaring pengaman dan hanya terlihat akibatnya dari log server."
        aside={
          <Badge variant="light">
            {on} dari {SAMPLE_FEATURES.length} aktif
          </Badge>
        }
      >
        <Stack gap="xs">
          {SAMPLE_FEATURES.map((f) => (
            <Paper key={f.key} withBorder p="sm" radius="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                  <Group gap="xs" wrap="wrap">
                    <Text fw={600}>{f.label}</Text>
                    <Badge size="sm" variant="light" color={STAGE[f.stage].color}>
                      {STAGE[f.stage].label}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {f.description}
                  </Text>
                  <Text size="xs" c={f.on ? 'dimmed' : 'yellow'}>
                    Bila dimatikan: {f.effect}
                  </Text>
                </Stack>
                <Badge variant="light" color={f.on ? 'ok' : 'gray'} style={{ flexShrink: 0 }}>
                  {f.on ? 'Nyala' : 'Mati'}
                </Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
      </SettingsCard>
    </PratinjauPanel>
  );
}
