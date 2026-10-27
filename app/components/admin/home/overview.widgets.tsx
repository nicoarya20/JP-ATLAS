/**
 * Five of the six cards of the Admin Beranda (P11 AD-15); the sixth, the approval queue, is in
 * `antrean.tsx` because its state depends on its data. Each card is one `Widget { ok }` of
 * `GET /api/admin/overview`: it shows its answer when the section loaded and a "Coba lagi" button
 * (shared with the Beranda produk via `HomeSection`) when it did not.
 *
 * Every number comes from the server; this file only lays it out and links to the menu that acts on
 * it. Labels and colours reuse the shared PM/role maps so a status reads the same here as elsewhere.
 */
import { Anchor, Badge, Box, Group, Progress, Stack, Text } from '@mantine/core';
import type {
  AgendaSummary,
  MembersSummary,
  OverdueTasksSummary,
  ProjectsSummary,
  RoleChangesSummary,
  Widget,
} from '@server/admin/overview/overview.dto';
import { FiCalendar, FiCheckCircle, FiFolder, FiUserCheck, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router';
import { HomeSection, type Retry } from '~/components/home/HomeSection';
import { EmptyState } from '~/components/ui/EmptyState';
import { ROLE_LABEL } from '~/lib/admin-users-api';
import { EVENT_KIND_LABELS } from '~/lib/events-format';
import { PROJECT_STATUS_LABELS } from '~/lib/pm-labels';
import { useTimeFormat } from '~/lib/time-format';
import { OVERVIEW_COPY } from './overview.copy';

const nf = new Intl.NumberFormat('id-ID');
const roleLabel = (role: string) => ROLE_LABEL[role] ?? role;

/** `Sen, 27 Okt · 09.00` in the team zone; the day and time always stay on one line. */
function agendaWhen(iso: string, timeZone: string): string {
  const day = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(new Date(iso));
  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(iso));
  return `${day} · ${time}`;
}

/** Right-aligned link to the menu a card sends you to; shared header of every list card. */
function CardLink({ to, label }: { to: string; label: string }) {
  return (
    <Group justify="flex-end" wrap="wrap" gap="xs">
      <Anchor component={Link} to={to} size="sm">
        {label}
      </Anchor>
    </Group>
  );
}

/** One row of a list card: a label that truncates, a short value that never wraps beside it. */
function Row({ label, hint, value }: { label: string; hint: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
      <Stack gap={0} miw={0} flex={1}>
        <Text size="sm" fw={500} truncate>
          {label}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {hint}
        </Text>
      </Stack>
      <Box flex="0 0 auto">{value}</Box>
    </Group>
  );
}

export function MembersWidget({ widget, retry }: { widget: Widget<MembersSummary>; retry: Retry }) {
  const COPY = OVERVIEW_COPY.members;
  return (
    <HomeSection title={COPY.title} subtitle={COPY.subtitle} widget={widget} retry={retry}>
      {(d) =>
        d.active === 0 && d.inactive === 0 ? (
          <EmptyState icon={FiUsers} title={COPY.empty} description={COPY.emptyHint} />
        ) : (
          <Stack gap="sm">
            <CardLink {...COPY.link} />
            <Group align="baseline" gap="xs">
              <Text fz={32} fw={700} lh={1}>
                {nf.format(d.active)}
              </Text>
              <Text size="sm" c="dimmed">
                {COPY.activeSuffix(nf.format(d.inactive))}
              </Text>
            </Group>
            <Group gap="xs" wrap="wrap">
              {d.roles
                .filter((r) => r.count > 0)
                .map((r) => (
                  <Badge key={r.role} variant="light" size="sm">
                    {roleLabel(r.role)} {nf.format(r.count)}
                  </Badge>
                ))}
            </Group>
          </Stack>
        )
      }
    </HomeSection>
  );
}

export function ProjectsWidget({
  widget,
  retry,
}: {
  widget: Widget<ProjectsSummary>;
  retry: Retry;
}) {
  const COPY = OVERVIEW_COPY.projects;
  return (
    <HomeSection title={COPY.title} subtitle={COPY.subtitle} widget={widget} retry={retry}>
      {(d) =>
        d.total === 0 ? (
          <EmptyState icon={FiFolder} title={COPY.empty} description={COPY.emptyHint} />
        ) : (
          <Stack gap="sm">
            <CardLink {...COPY.link} />
            <Progress.Root size="xl" radius="md">
              {d.byStatus
                .filter((s) => s.count > 0)
                .map((s) => (
                  <Progress.Section
                    key={s.status}
                    value={(s.count / d.total) * 100}
                    color={PROJECT_STATUS_LABELS[s.status].color}
                  />
                ))}
            </Progress.Root>
            <Stack gap="xs">
              {d.byStatus
                .filter((s) => s.count > 0)
                .map((s) => (
                  <Row
                    key={s.status}
                    label={PROJECT_STATUS_LABELS[s.status].label}
                    hint={`${Math.round((s.count / d.total) * 100)}% dari ${nf.format(d.total)} proyek`}
                    value={
                      <Badge
                        variant="light"
                        color={PROJECT_STATUS_LABELS[s.status].color}
                        size="sm"
                      >
                        {nf.format(s.count)}
                      </Badge>
                    }
                  />
                ))}
            </Stack>
          </Stack>
        )
      }
    </HomeSection>
  );
}

export function LateTasksWidget({
  widget,
  retry,
}: {
  widget: Widget<OverdueTasksSummary>;
  retry: Retry;
}) {
  const COPY = OVERVIEW_COPY.overdue;
  return (
    <HomeSection title={COPY.title} subtitle={COPY.subtitle} widget={widget} retry={retry}>
      {(d) =>
        d.total === 0 ? (
          <EmptyState icon={FiCheckCircle} title={COPY.empty} description={COPY.emptyHint} />
        ) : (
          <Stack gap="sm">
            <CardLink {...COPY.link} />
            {d.items.map((t) => (
              <Row
                key={t.id}
                label={t.title}
                hint={`${t.projectName} · ${t.assigneeName ?? COPY.noAssignee}`}
                value={
                  <Badge color="danger" variant="light" size="sm">
                    {COPY.unit(t.overdueDays)}
                  </Badge>
                }
              />
            ))}
            {d.total > d.items.length && (
              <Anchor component={Link} to={COPY.link.to} size="sm">
                {COPY.more(d.total)}
              </Anchor>
            )}
          </Stack>
        )
      }
    </HomeSection>
  );
}

export function AgendaWidget({
  widget,
  retry,
  timeZone,
}: {
  widget: Widget<AgendaSummary>;
  retry: Retry;
  timeZone: string;
}) {
  const COPY = OVERVIEW_COPY.agenda;
  return (
    <HomeSection title={COPY.title} subtitle={COPY.subtitle} widget={widget} retry={retry}>
      {(d) =>
        d.total === 0 ? (
          <EmptyState icon={FiCalendar} title={COPY.empty} description={COPY.emptyHint} />
        ) : (
          <Stack gap="sm">
            <CardLink {...COPY.link} />
            {d.items.map((e) => (
              <Row
                key={e.id}
                label={e.title}
                hint={`${EVENT_KIND_LABELS[e.kind]}${e.projectName ? ` · ${e.projectName}` : ''}`}
                value={
                  <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    {agendaWhen(e.startsAt, timeZone)}
                  </Text>
                }
              />
            ))}
            {d.total > d.items.length && (
              <Anchor component={Link} to={COPY.link.to} size="sm">
                {COPY.more(d.total)}
              </Anchor>
            )}
          </Stack>
        )
      }
    </HomeSection>
  );
}

export function RoleChangesWidget({
  widget,
  retry,
}: {
  widget: Widget<RoleChangesSummary>;
  retry: Retry;
}) {
  const COPY = OVERVIEW_COPY.roles;
  // Format through the root clock, not the runtime zone, so SSR and the browser agree.
  const { relative: formatRelative } = useTimeFormat();
  return (
    <HomeSection title={COPY.title} subtitle={COPY.subtitle} widget={widget} retry={retry}>
      {(d) =>
        d.items.length === 0 ? (
          <EmptyState icon={FiUserCheck} title={COPY.empty} description={COPY.emptyHint} />
        ) : (
          <Stack gap="sm">
            <CardLink {...COPY.link} />
            {d.items.map((c) => {
              const who = c.targetName ?? c.targetEmail ?? COPY.unknownPerson;
              const by = c.byName ?? c.byEmail ?? COPY.unknownPerson;
              const from = c.from ? roleLabel(c.from) : '—';
              const to = c.to ? roleLabel(c.to) : '—';
              return (
                <Row
                  key={c.id}
                  label={`${who}: ${from} → ${to}`}
                  hint={COPY.by(by)}
                  value={
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {formatRelative(c.at)}
                    </Text>
                  }
                />
              );
            })}
          </Stack>
        )
      }
    </HomeSection>
  );
}
