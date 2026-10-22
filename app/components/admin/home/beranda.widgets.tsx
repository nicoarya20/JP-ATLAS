// PRATINJAU(AD-15): Beranda cards drawing sample content; no query runs behind them.
/**
 * The five preview widgets of the Admin Beranda (P11 AD-15). The sixth card — the approval queue —
 * is real and lives on the page itself, so the screen is honest about which number can be trusted.
 *
 * Each card is written the way the real one has to be: one question in the subtitle, a readable
 * answer, and a link to the menu that acts on it. AD-15 keeps the markup and swaps the sample
 * import for a `Widget { ok }` section of `GET /api/admin/overview`, adding the "Coba lagi"
 * button that a soft-failing section needs.
 */
import { Anchor, Badge, Group, Progress, Stack, Text } from '@mantine/core';
import { Link } from 'react-router';
import { PratinjauBadge } from '~/components/admin/pratinjau/pratinjau';
import { SectionCard } from '~/components/ui/SectionCard';
import {
  BERANDA_COPY as COPY,
  SAMPLE_AGENDA,
  SAMPLE_LATE_TASKS,
  SAMPLE_MEMBERS,
  SAMPLE_PROJECTS,
  SAMPLE_ROLE_CHANGES,
} from './beranda.content';

const nf = new Intl.NumberFormat('id-ID');

/** Card shell shared by the five previews: the question, the sample marker, the follow-up link. */
function PreviewCard({
  title,
  subtitle,
  to,
  linkLabel,
  children,
}: {
  title: string;
  subtitle: string;
  to: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <PratinjauBadge />
          <Anchor component={Link} to={to} size="sm">
            {linkLabel}
          </Anchor>
        </Group>
        {children}
      </Stack>
    </SectionCard>
  );
}

/** One line of a list card: a label that truncates, a short value that never wraps. */
function Row({ label, hint, value }: { label: string; hint: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
      <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
        <Text size="sm" fw={500} truncate>
          {label}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {hint}
        </Text>
      </Stack>
      <div style={{ flexShrink: 0 }}>{value}</div>
    </Group>
  );
}

export function MembersWidget() {
  const { total, inactive, roles } = SAMPLE_MEMBERS;
  return (
    <PreviewCard {...COPY.members} to="/dashboard/users" linkLabel="Buka Pengguna">
      <Group align="baseline" gap="xs">
        <Text fz={32} fw={700} lh={1}>
          {nf.format(total)}
        </Text>
        <Text size="sm" c="dimmed">
          aktif · {nf.format(inactive)} dinonaktifkan
        </Text>
      </Group>
      <Group gap="xs" wrap="wrap">
        {roles.map((r) => (
          <Badge key={r.label} variant="light" size="sm">
            {r.label} {nf.format(r.count)}
          </Badge>
        ))}
      </Group>
    </PreviewCard>
  );
}

export function ProjectsWidget() {
  const total = SAMPLE_PROJECTS.reduce((sum, s) => sum + s.count, 0);
  return (
    <PreviewCard {...COPY.projects} to="/app/projects" linkLabel="Buka Proyek">
      <Progress.Root size="xl" radius="md">
        {SAMPLE_PROJECTS.map((s) => (
          <Progress.Section key={s.label} value={(s.count / total) * 100} color={s.color} />
        ))}
      </Progress.Root>
      <Stack gap={6}>
        {SAMPLE_PROJECTS.map((s) => (
          <Row
            key={s.label}
            label={s.label}
            hint={`${Math.round((s.count / total) * 100)}% dari ${nf.format(total)} proyek`}
            value={
              <Badge variant="light" color={s.color} size="sm">
                {nf.format(s.count)}
              </Badge>
            }
          />
        ))}
      </Stack>
    </PreviewCard>
  );
}

export function LateTasksWidget() {
  return (
    <PreviewCard {...COPY.late} to="/app/tasks" linkLabel="Buka Tugas">
      <Stack gap="sm">
        {SAMPLE_LATE_TASKS.map((t) => (
          <Row
            key={t.title}
            label={t.title}
            hint={`${t.project} · ${t.assignee}`}
            value={
              <Badge color="danger" variant="light" size="sm">
                {t.days} hari
              </Badge>
            }
          />
        ))}
      </Stack>
    </PreviewCard>
  );
}

export function AgendaWidget() {
  return (
    <PreviewCard {...COPY.agenda} to="/app/events" linkLabel="Buka Agenda">
      <Stack gap="sm">
        {SAMPLE_AGENDA.map((a) => (
          <Row
            key={a.title}
            label={a.title}
            hint={`${a.project} · ${a.attendees} peserta`}
            value={
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {a.when}
              </Text>
            }
          />
        ))}
      </Stack>
    </PreviewCard>
  );
}

export function RoleChangesWidget() {
  return (
    <PreviewCard {...COPY.roles} to="/dashboard/permissions" linkLabel="Buka Peran & izin">
      <Stack gap="sm">
        {SAMPLE_ROLE_CHANGES.map((c) => (
          <Row
            key={`${c.who}-${c.when}`}
            label={`${c.who}: ${c.from} → ${c.to}`}
            hint={`oleh ${c.by}`}
            value={
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {c.when}
              </Text>
            }
          />
        ))}
      </Stack>
    </PreviewCard>
  );
}
