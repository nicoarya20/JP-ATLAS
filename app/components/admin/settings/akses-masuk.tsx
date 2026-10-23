// PRATINJAU(AD-06): sign-in policy with sample values; nothing is read or saved.
/**
 * Preview of Pengaturan › Akses masuk. Answers "who can get in, and what happens the moment they
 * try?" — the three policy switches, then a plain reading of the path a newcomer walks, so the
 * effect of each switch is visible without testing it on a real person.
 *
 * The real panel (AD-06) reuses `app/components/settings/AuthSettingsCard.tsx` with the technical
 * half (provider wiring) left behind in /dev: an Admin decides policy, not transport.
 */
import { List, NumberInput, Select, Stack, Switch, Text } from '@mantine/core';
import { useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { PratinjauPanel } from '~/components/admin/pratinjau/pratinjau';
import { SettingRow, SettingsCard } from '~/components/settings/SettingsParts';

const OWNER = 'AD-06';

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member — hanya pekerjaan yang ditugaskan' },
  { value: 'project_manager', label: 'Project manager — boleh membuat proyek' },
];

/** The path a newcomer walks, recomputed from the switches so the policy is readable as a story. */
function journey(open: boolean, approval: boolean, role: string): string[] {
  const label = ROLE_OPTIONS.find((r) => r.value === role)?.label.split(' — ')[0] ?? 'Member';
  if (!open)
    return [
      'Form daftar tidak tampil di halaman masuk.',
      'Orang baru hanya bisa masuk lewat undangan dari Admin.',
      `Undangan yang diterima langsung memberi peran ${label}.`,
    ];
  return [
    'Orang mengisi form daftar di halaman masuk.',
    approval
      ? 'Akun dibuat tetapi terkunci di halaman tunggu sampai Admin menyetujui.'
      : 'Akun langsung aktif tanpa persetujuan siapa pun.',
    `Setelah masuk, perannya ${label}.`,
  ];
}

export function AksesMasukPreview() {
  const [open, setOpen] = useState(true);
  const [approval, setApproval] = useState(true);
  const [role, setRole] = useState<string>('member');
  const [expiry, setExpiry] = useState<string | number>(7);

  return (
    <PratinjauPanel owner={OWNER} action="Simpan kebijakan masuk">
      <SettingsCard
        title="Cara orang masuk"
        description="Kebijakan pintu depan. Cara teknis penyedia login (Google, SMTP) tetap diatur Super-admin di area /dev."
      >
        <Stack gap="md">
          <SettingRow
            label="Pendaftaran mandiri"
            description="Mati = form daftar hilang dari halaman masuk dan hanya undangan yang bisa menambah orang."
            control={
              <Switch
                checked={open}
                onChange={(e) => setOpen(e.currentTarget.checked)}
                aria-label="Pendaftaran mandiri"
              />
            }
          />
          <SettingRow
            label="Akun baru wajib disetujui Admin"
            description="Nyala = pendaftar menunggu di halaman tunggu dan muncul di menu Pengguna."
            control={
              <Switch
                checked={approval}
                onChange={(e) => setApproval(e.currentTarget.checked)}
                aria-label="Akun baru wajib disetujui Admin"
              />
            }
          />
          <Select
            label="Peran bawaan pendaftar baru"
            description="Peran bisa diubah per orang di menu Pengguna setelah mereka masuk."
            data={ROLE_OPTIONS}
            value={role}
            onChange={(v) => setRole(v ?? 'member')}
            allowDeselect={false}
            maw={420}
          />
          <NumberInput
            label="Masa berlaku undangan (hari)"
            description="Setelah lewat, tautan undangan mati dan harus dikirim ulang."
            min={1}
            max={90}
            value={expiry}
            onChange={setExpiry}
            inputMode="numeric"
            maw={240}
          />
        </Stack>
      </SettingsCard>

      <SettingsCard
        title="Yang terjadi pada orang baru"
        description="Dibaca ulang dari setelan di atas — ubah satu saklar dan langkahnya ikut berubah."
      >
        <List
          spacing="xs"
          icon={<FiArrowRight size="1.25em" aria-hidden />}
          styles={{ itemWrapper: { alignItems: 'flex-start' } }}
        >
          {journey(open, approval, role).map((step) => (
            <List.Item key={step}>
              <Text size="sm">{step}</Text>
            </List.Item>
          ))}
        </List>
      </SettingsCard>
    </PratinjauPanel>
  );
}
