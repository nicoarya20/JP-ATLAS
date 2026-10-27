// PRATINJAU(P9 G-02): notification switches with sample defaults; nothing is read or saved.
/**
 * Preview of Pengaturan › Pemberitahuan. Answers "what does this app send people, and through
 * which channel?" — one row per kind of notice, one column per channel.
 *
 * P11 only holds the place: the working panel belongs to P9 G-02, which owns the sending side.
 * What an Admin sets here is the organisation default; each person can still narrow it for
 * themselves under /app/settings, which the note at the foot of the card says out loud.
 */
import { Box, Group, Paper, Stack, Switch, Table, Text } from '@mantine/core';
import { useState } from 'react';
import { PratinjauPanel } from '~/components/admin/pratinjau/pratinjau';
import { SettingsCard } from '~/components/settings/SettingsParts';

const OWNER = 'P9 G-02';

type Channel = 'app' | 'email';
type Kind = { key: string; label: string; description: string; app: boolean; email: boolean };

/** Sample defaults: in-app on for everything, email reserved for what people miss offline. */
const SAMPLE_KINDS: Kind[] = [
  {
    key: 'task-assigned',
    label: 'Tugas ditugaskan ke saya',
    description: 'Saat seseorang menunjuk orang ini sebagai pelaksana.',
    app: true,
    email: true,
  },
  {
    key: 'task-due',
    label: 'Tugas mendekati tenggat',
    description: 'Sehari sebelum tenggat, sekali per tugas.',
    app: true,
    email: false,
  },
  {
    key: 'task-late',
    label: 'Tugas lewat tenggat',
    description: 'Dikirim ke pelaksana dan pengelola proyeknya.',
    app: true,
    email: true,
  },
  {
    key: 'comment',
    label: 'Komentar baru',
    description: 'Pada tugas atau proyek yang diikuti orang ini.',
    app: true,
    email: false,
  },
  {
    key: 'project-invite',
    label: 'Diundang ke proyek',
    description: 'Saat ditambahkan sebagai anggota proyek.',
    app: true,
    email: true,
  },
  {
    key: 'leave',
    label: 'Pengajuan cuti perlu keputusan',
    description: 'Hanya untuk yang berhak menyetujui.',
    app: true,
    email: true,
  },
  {
    key: 'approval',
    label: 'Akun menunggu persetujuan',
    description: 'Hanya untuk Admin dan Super-admin.',
    app: true,
    email: false,
  },
];

const COLUMNS: { key: Channel; label: string }[] = [
  { key: 'app', label: 'Dalam aplikasi' },
  { key: 'email', label: 'Email' },
];

export function PemberitahuanPreview() {
  const [kinds, setKinds] = useState(SAMPLE_KINDS);
  const toggle = (key: string, channel: Channel) =>
    setKinds((prev) => prev.map((k) => (k.key === key ? { ...k, [channel]: !k[channel] } : k)));

  const control = (k: Kind, c: Channel, label: string) => (
    <Switch
      size="sm"
      checked={k[c]}
      onChange={() => toggle(k.key, c)}
      aria-label={`${k.label} — ${label}`}
    />
  );

  return (
    <PratinjauPanel owner={OWNER} action="Simpan pemberitahuan">
      <SettingsCard
        title="Saklar pemberitahuan"
        description="Nilai bawaan untuk seluruh organisasi. Tiap orang masih bisa mematikannya untuk diri sendiri di Pengaturan akun, tetapi tidak bisa menyalakan yang dimatikan di sini."
      >
        {/* Desktop: one row per notice. Mantine has no `overflowX` prop, so the scroll wrapper
            stays a `style` — three columns scroll rather than widening the card. */}
        <Box style={{ overflowX: 'auto' }} visibleFrom="sm">
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Jenis pemberitahuan</Table.Th>
                {COLUMNS.map((c) => (
                  <Table.Th key={c.key} w={160}>
                    {c.label}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {kinds.map((k) => (
                <Table.Tr key={k.key}>
                  <Table.Td>
                    <Text fw={500}>{k.label}</Text>
                    <Text size="xs" c="dimmed">
                      {k.description}
                    </Text>
                  </Table.Td>
                  {COLUMNS.map((c) => (
                    <Table.Td key={c.key}>{control(k, c.key, c.label)}</Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>

        {/* Mobile: a card per notice — switches in a sideways-scrolling table are unusable. */}
        <Stack gap="xs" hiddenFrom="sm">
          {kinds.map((k) => (
            <Paper key={k.key} withBorder p="sm">
              <Stack gap="xs">
                <Box>
                  <Text fw={500}>{k.label}</Text>
                  <Text size="xs" c="dimmed">
                    {k.description}
                  </Text>
                </Box>
                <Group gap="lg" wrap="wrap">
                  {COLUMNS.map((c) => (
                    <Group key={c.key} gap="xs">
                      {control(k, c.key, c.label)}
                      <Text size="sm">{c.label}</Text>
                    </Group>
                  ))}
                </Group>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </SettingsCard>
    </PratinjauPanel>
  );
}
