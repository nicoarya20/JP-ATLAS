// PRATINJAU(AD-04): identity form with sample values; nothing is read or saved.
/**
 * Preview of Pengaturan › Identitas. Answers "where does the name in the sidebar and the browser
 * tab come from?" — one short form plus a live preview of the two places the values actually
 * show up. The real panel (AD-04) reuses `app/components/settings/BrandingCard.tsx` against
 * `PUT /api/settings/branding`, which is why the fields here match that card's three fields.
 */
import { Group, Paper, SimpleGrid, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { useState } from 'react';
import { FiZap } from 'react-icons/fi';
import { PratinjauPanel } from '~/components/admin/pratinjau/pratinjau';
import { SettingsCard } from '~/components/settings/SettingsParts';

const OWNER = 'AD-04';

/** Sample identity: the template's own defaults, so the preview reads like a real tenant. */
const SAMPLE = {
  appName: 'Simple PM',
  appTagline: 'Proyek, tugas, dan agenda satu tim',
  supportUrl: 'mailto:bantuan@contoh.co.id',
};

const FIELDS = [
  {
    key: 'appName' as const,
    label: 'Nama aplikasi',
    description: 'Tampil di sidebar, judul tab browser, dan halaman masuk. Maksimal 60 karakter.',
  },
  {
    key: 'appTagline' as const,
    label: 'Tagline',
    description: 'Satu kalimat di bawah nama; dipakai juga sebagai deskripsi meta.',
  },
  {
    key: 'supportUrl' as const,
    label: 'Tautan bantuan',
    description: 'Alamat http(s) atau mailto: yang dipakai tombol bantuan di halaman error.',
  },
];

export function IdentitasPreview() {
  const [form, setForm] = useState(SAMPLE);
  const name = form.appName.trim() || SAMPLE.appName;
  const tagline = form.appTagline.trim() || SAMPLE.appTagline;

  return (
    <PratinjauPanel owner={OWNER} action="Simpan identitas">
      <SettingsCard
        title="Identitas aplikasi"
        description="Satu-satunya tempat nama dan tagline diubah. Perubahan berlaku untuk semua orang di semua area."
      >
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Stack gap="sm">
            {FIELDS.map((f) => (
              <TextInput
                key={f.key}
                label={f.label}
                description={f.description}
                value={form[f.key]}
                inputMode={f.key === 'supportUrl' ? 'url' : undefined}
                onChange={(e) => setForm({ ...form, [f.key]: e.currentTarget.value })}
              />
            ))}
          </Stack>
          <Stack gap="sm">
            <Text size="sm" fw={500}>
              Di mana ini terlihat
            </Text>
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" c="dimmed" mb={6}>
                Kepala sidebar
              </Text>
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon variant="light" size="xl" radius="md">
                  <FiZap size="1.25em" aria-hidden />
                </ThemeIcon>
                <div style={{ minWidth: 0 }}>
                  <Text fw={700} truncate>
                    {name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    Admin · v0.2.0
                  </Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" c="dimmed" mb={6}>
                Judul tab browser
              </Text>
              <Text fw={500} truncate>
                Dashboard — {name}
              </Text>
              <Text size="sm" c="dimmed">
                {tagline}
              </Text>
            </Paper>
          </Stack>
        </SimpleGrid>
      </SettingsCard>
    </PratinjauPanel>
  );
}
