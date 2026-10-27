/**
 * Pengaturan › Pengumuman, the real panel (AD-05). An Admin posts one office-wide banner that the
 * signed-in areas render through `frameInfo()` — never the landing or login page. Reads and writes
 * `GET/PUT/DELETE /api/settings/announcement` (Admin, AD-03).
 *
 * One field departs from the AD-05 preview on purpose: the preview had a "boleh ditutup" switch
 * *and* a "berhenti tayang" date, but the stored model has a single `dismissibleUntil` and no
 * boolean for "never closable". So this panel offers that one field honestly — empty means
 * "readers may always close it", a date means "closable until then, after which it stays pinned",
 * which is exactly how the server expresses an unmissable deadline notice.
 */
import {
  Alert,
  Button,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiInfo, FiRefreshCw, FiXOctagon } from 'react-icons/fi';
import { SettingRow, SettingsCard } from '~/components/settings/SettingsParts';
import { EmptyState } from '~/components/ui/EmptyState';
import {
  type Announcement,
  type AnnouncementLevel,
  clearAnnouncement,
  fetchAnnouncement,
  saveAnnouncement,
} from '~/lib/settings-api';

/** The three tones, with the Mantine colour (role-aliased) and icon each maps to. */
const LEVELS: { value: AnnouncementLevel; label: string; color: string; icon: typeof FiInfo }[] = [
  { value: 'info', label: 'Kabar', color: 'blue', icon: FiInfo },
  { value: 'warn', label: 'Perhatian', color: 'yellow', icon: FiAlertTriangle },
  { value: 'danger', label: 'Penting', color: 'red', icon: FiXOctagon },
];

type Form = { text: string; level: AnnouncementLevel; active: boolean; until: string | null };
const EMPTY: Form = { text: '', level: 'info', active: false, until: null };

/** Stored banner → form; `dismissibleUntil` is an ISO instant but the DateInput wants `YYYY-MM-DD`. */
function toForm(a: Announcement | null): Form {
  if (!a) return EMPTY;
  return { text: a.text, level: a.level, active: a.active, until: a.dismissibleUntil?.slice(0, 10) ?? null };
}

export function PengumumanPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['announcement'], queryFn: fetchAnnouncement });
  const [form, setForm] = useState<Form>(EMPTY);
  // Seed the form once the banner loads, and again whenever a save/clear refetches it.
  useEffect(() => {
    if (q.isSuccess) setForm(toForm(q.data));
  }, [q.isSuccess, q.data]);

  const stored = toForm(q.data ?? null);
  const dirty = JSON.stringify(form) !== JSON.stringify(stored);
  const hasText = Boolean(form.text.trim());

  const save = useMutation({
    mutationFn: () =>
      saveAnnouncement({
        text: form.text,
        level: form.level,
        active: form.active,
        dismissibleUntil: form.until,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcement'] });
      notifications.show({
        color: 'teal',
        message: form.active
          ? 'Pengumuman disimpan dan tayang untuk semua orang.'
          : 'Pengumuman disimpan. Nyalakan "Tayangkan" saat siap menampilkannya.',
      });
    },
    onError: (e: Error) =>
      notifications.show({ color: 'red', title: 'Gagal menyimpan pengumuman', message: e.message }),
  });

  const remove = useMutation({
    mutationFn: clearAnnouncement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcement'] });
      notifications.show({ color: 'teal', message: 'Pengumuman dihapus. Banner tidak lagi tayang.' });
    },
    onError: (e: Error) =>
      notifications.show({ color: 'red', title: 'Gagal menghapus pengumuman', message: e.message }),
  });

  const confirmRemove = () =>
    modals.openConfirmModal({
      title: 'Hapus pengumuman?',
      children: (
        <Text size="sm">
          Banner akan hilang untuk semua orang di semua area. Isinya tidak disimpan — kamu perlu
          menulis ulang bila ingin menayangkannya lagi.
        </Text>
      ),
      labels: { confirm: 'Hapus pengumuman', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: () => remove.mutate(),
    });

  if (q.isPending)
    return (
      <Group gap="xs" justify="center" py="xl">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Memuat pengumuman…
        </Text>
      </Group>
    );

  if (q.isError)
    return (
      <EmptyState
        icon={FiRefreshCw}
        title="Gagal memuat pengumuman"
        description="Setelan pengumuman tidak bisa dibaca dari server. Coba lagi."
        action={{ label: 'Coba lagi', onClick: () => void q.refetch() }}
      />
    );

  const tone = LEVELS.find((l) => l.value === form.level) ?? LEVELS[0];
  const Icon = tone.icon;

  return (
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
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.currentTarget.checked })}
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
          maxLength={500}
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.currentTarget.value })}
        />
        {/* A Stack carries the label/control gap, so it comes off the spacing scale (was 6px). */}
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Nada
          </Text>
          <SegmentedControl
            value={form.level}
            onChange={(v) => setForm({ ...form, level: v as AnnouncementLevel })}
            data={LEVELS.map((l) => ({ value: l.value, label: l.label }))}
          />
        </Stack>
        <DateInput
          label="Boleh ditutup pembaca sampai"
          description="Kosongkan agar pembaca selalu bisa menutup. Diisi = setelah tanggal itu banner terkunci di layar (pengumuman yang tak boleh dilewatkan)."
          valueFormat="D MMMM YYYY"
          clearable
          value={form.until}
          onChange={(v) => setForm({ ...form, until: v })}
          maw={320}
        />

        {/* What the reader sees, so the Admin need not go hunting for it on another page. */}
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Yang dilihat pembaca
          </Text>
          {form.active && hasText ? (
            <Alert
              color={tone.color}
              variant="light"
              radius="md"
              icon={<Icon size="1.25em" aria-hidden />}
              withCloseButton={form.until === null}
              closeButtonLabel="Tutup pengumuman"
            >
              {form.text}
            </Alert>
          ) : (
            <Text size="sm" c="dimmed">
              Tidak ada banner yang tayang: pengumuman dimatikan atau isinya kosong.
            </Text>
          )}
        </Stack>

        <Group justify="space-between" gap="xs" wrap="wrap">
          <Button
            variant="subtle"
            color="red"
            size="sm"
            onClick={confirmRemove}
            loading={remove.isPending}
            disabled={!q.data}
          >
            Hapus pengumuman
          </Button>
          <Group gap="xs" wrap="wrap" justify="flex-end">
            {dirty && (
              <Button variant="subtle" color="gray" size="sm" onClick={() => setForm(stored)}>
                Batalkan
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => save.mutate()}
              loading={save.isPending}
              disabled={!dirty || !hasText}
            >
              Simpan pengumuman
            </Button>
          </Group>
        </Group>
      </Stack>
    </SettingsCard>
  );
}
