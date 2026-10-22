// PRATINJAU(AD-08): curated feature list with sample states; nothing is read or saved.
/**
 * Preview of Pengaturan › Fitur. Answers "which parts of the app are switched on for this
 * office?" — a short, named list with a sentence each and the menu the switch actually hides.
 *
 * The point of AD-08 is that this is NOT the free key/value flag editor: that one stays in /dev
 * for whoever wrote the flag. Here an Admin reads a known feature, in Indonesian, and the screen
 * says what disappears when it goes off.
 */
import { Badge, Group, Paper, Stack, Switch, Text } from '@mantine/core';
import { useState } from 'react';
import { PratinjauPanel } from '~/components/admin/pratinjau/pratinjau';
import { SettingsCard } from '~/components/settings/SettingsParts';

const OWNER = 'AD-08';

type Feature = {
  key: string;
  label: string;
  description: string;
  /** What vanishes from the app when this goes off — the sentence that makes the switch safe. */
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
    effect: 'Penghapusan jadi permanen seketika. Matikan hanya bila memang diinginkan.',
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
  const [features, setFeatures] = useState(SAMPLE_FEATURES);
  const on = features.filter((f) => f.on).length;
  const toggle = (key: string) =>
    setFeatures((prev) => prev.map((f) => (f.key === key ? { ...f, on: !f.on } : f)));

  return (
    <PratinjauPanel owner={OWNER} action="Simpan fitur">
      <SettingsCard
        title="Fitur yang dinyalakan"
        description="Daftar terkurasi, bukan editor key/value. Penyunting flag bebas tetap milik Super-admin di /dev."
        aside={
          <Badge variant="light">
            {on} dari {features.length} aktif
          </Badge>
        }
      >
        <Stack gap="xs">
          {features.map((f) => (
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
                <Switch
                  checked={f.on}
                  onChange={() => toggle(f.key)}
                  aria-label={f.label}
                  style={{ flexShrink: 0 }}
                />
              </Group>
            </Paper>
          ))}
        </Stack>
      </SettingsCard>
    </PratinjauPanel>
  );
}
