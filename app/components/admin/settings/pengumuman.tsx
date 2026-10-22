// PRATINJAU(AD-05): announcement editor with a sample banner; nothing is read or saved.
/**
 * Preview of Pengaturan › Pengumuman. Answers "how do I tell everyone something without emailing
 * them?" — the editor on the left, the banner exactly as readers will see it below it.
 *
 * The real panel (AD-05) stores `{ text, level, active, dismissibleUntil }` in the new `settings`
 * column of migration 0022 and hangs the banner off `frameInfo()` the way maintenance already
 * does, so it shows in the signed-in areas only — never on the landing or login page (Q4).
 */
import { Alert, Divider, SegmentedControl, Stack, Switch, Text, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useState } from 'react';
import { FiAlertTriangle, FiInfo, FiXOctagon } from 'react-icons/fi';
import { PratinjauPanel } from '~/components/admin/pratinjau/pratinjau';
import { SettingRow, SettingsCard } from '~/components/settings/SettingsParts';

const OWNER = 'AD-05';

/** The three tones the banner can take, with the Mantine colour each maps to. */
const LEVELS = [
  { value: 'info', label: 'Kabar', color: 'blue', icon: FiInfo },
  { value: 'warn', label: 'Perhatian', color: 'yellow', icon: FiAlertTriangle },
  { value: 'danger', label: 'Penting', color: 'red', icon: FiXOctagon },
];

const SAMPLE_TEXT =
  'Kantor libur Jumat, 25 Desember 2026. Tenggat tugas yang jatuh hari itu mundur ke Senin berikutnya.';

export function PengumumanPreview() {
  const [active, setActive] = useState(true);
  const [text, setText] = useState(SAMPLE_TEXT);
  const [level, setLevel] = useState('warn');
  const [dismissible, setDismissible] = useState(true);
  const [until, setUntil] = useState<string | null>('2026-12-26');
  const tone = LEVELS.find((l) => l.value === level) ?? LEVELS[0];
  const Icon = tone.icon;

  return (
    <PratinjauPanel owner={OWNER} action="Simpan pengumuman">
      <SettingsCard
        title="Pengumuman untuk semua orang"
        description="Satu banner di atas setiap halaman yang sudah login. Halaman depan dan halaman masuk tidak dipasangi pengumuman internal."
      >
        <Stack gap="md">
          <SettingRow
            label="Tayangkan pengumuman"
            description="Mati = banner hilang untuk semua orang, isinya tetap tersimpan."
            control={
              <Switch
                checked={active}
                onChange={(e) => setActive(e.currentTarget.checked)}
                aria-label="Tayangkan pengumuman"
              />
            }
          />
          <Textarea
            label="Isi pengumuman"
            description="Satu sampai dua kalimat. Sebut dampaknya ke pekerjaan, bukan hanya kabarnya."
            autosize
            minRows={2}
            maxRows={5}
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
          />
          <div>
            <Text size="sm" fw={500} mb={6}>
              Nada
            </Text>
            <SegmentedControl
              value={level}
              onChange={setLevel}
              data={LEVELS.map((l) => ({ value: l.value, label: l.label }))}
            />
          </div>
          <SettingRow
            label="Boleh ditutup pembaca"
            description="Setelah ditutup, banner tidak muncul lagi untuk orang itu sampai isinya diubah."
            control={
              <Switch
                checked={dismissible}
                onChange={(e) => setDismissible(e.currentTarget.checked)}
                aria-label="Boleh ditutup pembaca"
              />
            }
          />
          <DateInput
            label="Berhenti tayang pada"
            description="Kosongkan bila pengumuman harus tayang sampai dimatikan manual."
            valueFormat="D MMMM YYYY"
            clearable
            value={until}
            onChange={setUntil}
            maw={320}
          />
          <Divider label="Yang dilihat pembaca" labelPosition="left" />
          {active && text.trim() ? (
            <Alert
              color={tone.color}
              variant="light"
              radius="md"
              icon={<Icon size="1.25em" aria-hidden />}
              withCloseButton={dismissible}
              closeButtonLabel="Tutup pengumuman"
            >
              {text}
            </Alert>
          ) : (
            <Text size="sm" c="dimmed">
              Tidak ada banner yang tayang: pengumuman dimatikan atau isinya kosong.
            </Text>
          )}
        </Stack>
      </SettingsCard>
    </PratinjauPanel>
  );
}
