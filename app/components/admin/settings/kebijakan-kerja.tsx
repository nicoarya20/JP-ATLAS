// PRATINJAU(AD-07): working-days policy with a sample holiday list; nothing is read or saved.
/**
 * Preview of Pengaturan › Kebijakan kerja. Answers "which days does this office actually work,
 * and what counts as a holiday?" — the working week, the holiday list, the default event
 * reminder, and whether leave needs approval.
 *
 * Phase 1 of the real panel (AD-07) only stores and displays these: the deadline arithmetic that
 * S1/S2 already ship is deliberately left alone (plan Q5, risk R4), and the card below says so on
 * screen so nobody expects a stored holiday to move a due date yet.
 */
import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { PratinjauPanel } from '~/components/admin/pratinjau/pratinjau';
import { SettingRow, SettingsCard } from '~/components/settings/SettingsParts';

const OWNER = 'AD-07';

const DAYS = [
  { value: 'mon', label: 'Senin' },
  { value: 'tue', label: 'Selasa' },
  { value: 'wed', label: 'Rabu' },
  { value: 'thu', label: 'Kamis' },
  { value: 'fri', label: 'Jumat' },
  { value: 'sat', label: 'Sabtu' },
  { value: 'sun', label: 'Minggu' },
];

/** Sample holidays: a few 2026 national dates, enough to show the list has a shape. */
const SAMPLE_HOLIDAYS = [
  { date: '2026-12-25', name: 'Hari Natal' },
  { date: '2026-12-31', name: 'Cuti bersama akhir tahun' },
  { date: '2027-01-01', name: 'Tahun Baru' },
];

const REMINDER_OPTIONS = 'Dipakai sebagai nilai awal setiap kali seseorang membuat acara baru.';

const fmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' });
const showDate = (iso: string) => fmt.format(new Date(`${iso}T00:00:00`));

export function KebijakanKerjaPreview() {
  const [workDays, setWorkDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [reminder, setReminder] = useState<string | number>(30);
  const [leaveApproval, setLeaveApproval] = useState(true);
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  return (
    <PratinjauPanel owner={OWNER} action="Simpan kebijakan kerja">
      <SettingsCard
        title="Hari kerja"
        description="Hari yang dihitung sebagai hari kerja kantor ini. Fase pertama hanya menyimpan dan menampilkannya — perhitungan tenggat yang sudah jalan belum ikut berubah."
      >
        <Checkbox.Group value={workDays} onChange={setWorkDays}>
          <Group gap="md" wrap="wrap">
            {DAYS.map((d) => (
              <Checkbox key={d.value} value={d.value} label={d.label} />
            ))}
          </Group>
        </Checkbox.Group>
        <Text size="sm" c="dimmed">
          {workDays.length} hari kerja per pekan.
        </Text>
      </SettingsCard>

      <SettingsCard
        title="Hari libur"
        description="Tanggal yang diperlakukan seperti akhir pekan: dipakai nanti untuk menghitung tenggat dan menandai kalender."
      >
        <Stack gap="sm">
          <Group align="flex-end" gap="sm" wrap="wrap">
            <DateInput
              label="Tanggal"
              placeholder="Pilih tanggal"
              valueFormat="D MMMM YYYY"
              value={newDate}
              onChange={setNewDate}
              style={{ flex: '1 1 220px' }}
            />
            <TextInput
              label="Keterangan"
              placeholder="mis. Cuti bersama"
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              style={{ flex: '2 1 260px' }}
            />
            <Button variant="light" disabled>
              Tambah
            </Button>
          </Group>
          {/* Three columns: a scroll wrapper is enough, no mobile card list needed (CLAUDE.md §2). */}
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Tanggal</Table.Th>
                  <Table.Th>Keterangan</Table.Th>
                  <Table.Th w={64} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {SAMPLE_HOLIDAYS.map((h) => (
                  <Table.Tr key={h.date}>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>{showDate(h.date)}</Table.Td>
                    <Table.Td>{h.name}</Table.Td>
                    <Table.Td>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        disabled
                        aria-label={`Hapus ${h.name}`}
                      >
                        <FiTrash2 size="1.25em" aria-hidden />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Stack>
      </SettingsCard>

      <SettingsCard
        title="Acara dan cuti"
        description="Dua nilai bawaan yang berlaku untuk seluruh organisasi."
      >
        <Stack gap="md">
          <SettingRow
            label="Pengingat acara bawaan"
            description={REMINDER_OPTIONS}
            control={
              <NumberInput
                value={reminder}
                onChange={setReminder}
                min={0}
                max={1440}
                step={5}
                suffix=" menit"
                inputMode="numeric"
                w={180}
                aria-label="Pengingat acara bawaan dalam menit"
              />
            }
          />
          <SettingRow
            label="Pengajuan cuti wajib disetujui"
            description="Mati = pengajuan cuti langsung tercatat sebagai disetujui tanpa menunggu siapa pun."
            control={
              <Switch
                checked={leaveApproval}
                onChange={(e) => setLeaveApproval(e.currentTarget.checked)}
                aria-label="Pengajuan cuti wajib disetujui"
              />
            }
          />
        </Stack>
      </SettingsCard>
    </PratinjauPanel>
  );
}
