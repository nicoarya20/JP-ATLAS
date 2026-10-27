/**
 * Pengaturan › Akses masuk, the real panel (AD-06). An Admin owns three sign-in decisions: whether
 * a new account waits for approval, which role a self-registered account gets, and how long an
 * invitation stays usable. Reads/writes `GET/PUT /api/settings/access-policy` (Admin, AD-03) on top
 * of `upsertAccessPolicy`.
 *
 * Each field keeps the module's "bawaan" (NULL) idea: a field reads as its built-in default until
 * the Admin changes it, and "Kembalikan ke bawaan" puts all three back to NULL. The preview's
 * "Pendaftaran mandiri" switch is deliberately absent — that is `signupEnabled`, an auth toggle
 * Super-admin owns (settings.ts), not part of the policy an Admin may write.
 */
import { Button, Group, List, NumberInput, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { OverrideBadge, SettingsCard } from '~/components/settings/SettingsParts';
import { EmptyState } from '~/components/ui/EmptyState';
import { type AccessPolicy, fetchAccessPolicy, saveAccessPolicy } from '~/lib/settings-api';

/**
 * The two roles a self-registered account may be given — the client mirror of the server's
 * SIGNUP_ROLES, which stays the real gate (admin/super-admin are refused there). Product defaults
 * (approval required, role member) are stable constants; the TTL default is left to the server, so
 * an empty invitation field means "bawaan" rather than a number guessed on the client.
 */
const ROLE_OPTIONS = [
  { value: 'member', label: 'Member — hanya pekerjaan yang ditugaskan' },
  { value: 'project_manager', label: 'Project manager — boleh membuat proyek' },
] as const;
const DEFAULT_APPROVAL = true;
const DEFAULT_ROLE = 'member';

type Form = { approval: boolean; role: string; ttl: number | string };

/** Stored nullable settings → the shape the controls bind to, filling NULLs with the display default. */
function toForm(p: AccessPolicy): Form {
  return {
    approval: p.requiresApproval ?? DEFAULT_APPROVAL,
    role: p.defaultRole ?? DEFAULT_ROLE,
    ttl: p.invitationTtlDays ?? '',
  };
}

/** The path a newcomer walks, recomputed from the controls so the policy reads as a story. */
function journey(approval: boolean, role: string): string[] {
  const label = ROLE_OPTIONS.find((r) => r.value === role)?.label.split(' — ')[0] ?? 'Member';
  return [
    'Orang mengisi form daftar, atau menerima undangan dari Admin.',
    approval
      ? 'Akun dibuat tetapi terkunci di halaman tunggu sampai Admin menyetujui.'
      : 'Akun langsung aktif tanpa persetujuan siapa pun.',
    `Setelah masuk, perannya ${label} — bisa diubah per orang di menu Pengguna.`,
  ];
}

export function AksesMasukPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['access-policy'], queryFn: fetchAccessPolicy });
  const [form, setForm] = useState<Form>({ approval: DEFAULT_APPROVAL, role: DEFAULT_ROLE, ttl: '' });
  useEffect(() => {
    if (q.isSuccess) setForm(toForm(q.data));
  }, [q.isSuccess, q.data]);

  const stored = q.data ?? { requiresApproval: null, defaultRole: null, invitationTtlDays: null };
  const storedForm = toForm(stored);
  const dirty = JSON.stringify(form) !== JSON.stringify(storedForm);
  const onDefaults =
    stored.requiresApproval === null &&
    stored.defaultRole === null &&
    stored.invitationTtlDays === null;

  const toPayload = (f: Form): AccessPolicy => ({
    requiresApproval: f.approval,
    defaultRole: f.role,
    invitationTtlDays: f.ttl === '' ? null : Number(f.ttl),
  });

  const save = useMutation({
    mutationFn: (p: AccessPolicy) => saveAccessPolicy(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-policy'] });
      notifications.show({ color: 'teal', message: 'Kebijakan masuk disimpan.' });
    },
    onError: (e: Error) =>
      notifications.show({ color: 'red', title: 'Gagal menyimpan kebijakan', message: e.message }),
  });

  if (q.isPending)
    return (
      <Group gap="xs" justify="center" py="xl">
        <Text size="sm" c="dimmed">
          Memuat kebijakan masuk…
        </Text>
      </Group>
    );

  if (q.isError)
    return (
      <EmptyState
        icon={FiRefreshCw}
        title="Gagal memuat kebijakan masuk"
        description="Setelan tidak bisa dibaca dari server. Coba lagi."
        action={{ label: 'Coba lagi', onClick: () => void q.refetch() }}
      />
    );

  const label = (text: string, overridden: boolean) => (
    <Group component="span" gap="xs">
      {text}
      <OverrideBadge overridden={overridden} />
    </Group>
  );

  return (
    <Stack gap="md">
      <SettingsCard
        title="Cara orang masuk"
        description="Kebijakan pintu depan. Cara teknis penyedia login (Google, SMTP) dan tampil-tidaknya form daftar tetap diatur Super-admin di area /dev."
      >
        <Stack gap="md" maw={480}>
          <Select
            label={label('Wajib disetujui Admin?', stored.requiresApproval !== null)}
            description="Nyala = pendaftar menunggu di halaman tunggu dan muncul di menu Pengguna. Mati = akun langsung aktif."
            data={[
              { value: 'true', label: 'Ya — tunggu persetujuan' },
              { value: 'false', label: 'Tidak — langsung aktif' },
            ]}
            value={String(form.approval)}
            onChange={(v) => setForm({ ...form, approval: v === 'true' })}
            allowDeselect={false}
          />
          <Select
            label={label('Peran bawaan pendaftar baru', stored.defaultRole !== null)}
            description="Admin dan super-admin tidak bisa dipilih di sini — peran itu hanya diberikan lewat menu Pengguna."
            data={[...ROLE_OPTIONS]}
            value={form.role}
            onChange={(v) => setForm({ ...form, role: v ?? DEFAULT_ROLE })}
            allowDeselect={false}
          />
          <NumberInput
            label={label('Masa berlaku undangan (hari)', stored.invitationTtlDays !== null)}
            description="Kosongkan untuk memakai bawaan. Setelah lewat, tautan undangan mati dan harus dikirim ulang."
            placeholder="Bawaan"
            min={1}
            max={365}
            value={form.ttl}
            onChange={(v) => setForm({ ...form, ttl: v })}
            inputMode="numeric"
            maw={240}
          />
        </Stack>

        <Group justify="space-between" gap="xs" wrap="wrap">
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() =>
              save.mutate({ requiresApproval: null, defaultRole: null, invitationTtlDays: null })
            }
            loading={save.isPending && onDefaults}
            disabled={onDefaults}
          >
            Kembalikan ke bawaan
          </Button>
          <Group gap="xs" wrap="wrap" justify="flex-end">
            {dirty && (
              <Button variant="subtle" color="gray" size="sm" onClick={() => setForm(storedForm)}>
                Batalkan
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => save.mutate(toPayload(form))}
              loading={save.isPending && !onDefaults}
              disabled={!dirty}
            >
              Simpan kebijakan
            </Button>
          </Group>
        </Group>
      </SettingsCard>

      <SettingsCard
        title="Yang terjadi pada orang baru"
        description="Dibaca ulang dari setelan di atas — ubah satu pilihan dan langkahnya ikut berubah."
      >
        <List
          spacing="xs"
          icon={<FiArrowRight size="1.25em" aria-hidden />}
          styles={{ itemWrapper: { alignItems: 'flex-start' } }}
        >
          {journey(form.approval, form.role).map((step) => (
            <List.Item key={step}>
              <Text size="sm">{step}</Text>
            </List.Item>
          ))}
        </List>
      </SettingsCard>
    </Stack>
  );
}
