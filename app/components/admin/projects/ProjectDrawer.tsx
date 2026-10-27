/** Detail drawer for one project opened from the Admin list (AD-12); `footer` carries AD-13's action. */
import { Divider, Drawer, Group, Stack, Text, Title } from '@mantine/core';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import type { ProjectListItem } from '@server/project/project.dto';
import type { ReactNode } from 'react';
import { ConditionBadge, PriorityBadge, StatusBadge } from './ProjectBadges';
import { ADMIN_PROJECTS_COPY } from './projects.copy';

type Props = {
  item: ProjectListItem | null;
  onClose: () => void;
  /** AD-13 slot: the "Ganti Pengelola" action, rendered under the detail. */
  footer?: ReactNode;
};

const fmtDate = (value: string | null, fallback: string) =>
  value ? dayjs(value).locale('id').format('D MMMM YYYY') : fallback;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Group gap="xs" justify="flex-end" miw={0}>
        {children}
      </Group>
    </Group>
  );
}

export function ProjectDrawer({ item, onClose, footer }: Props) {
  return (
    <Drawer
      opened={item !== null}
      onClose={onClose}
      position="right"
      title={<Title order={3}>{ADMIN_PROJECTS_COPY.drawerTitle}</Title>}
    >
      {item && (
        <Stack gap="md">
          <Title order={4}>{item.name}</Title>
          <Stack gap="sm">
            <Row label={ADMIN_PROJECTS_COPY.detailStatus}>
              <StatusBadge status={item.status} size="md" />
            </Row>
            <Row label={ADMIN_PROJECTS_COPY.detailCondition}>
              <ConditionBadge condition={item.condition} size="md" />
            </Row>
            <Row label={ADMIN_PROJECTS_COPY.detailPriority}>
              <PriorityBadge priority={item.priority} size="md" />
            </Row>
            <Row label={ADMIN_PROJECTS_COPY.detailManager}>
              <Text size="sm">{item.lead ? item.lead.name : ADMIN_PROJECTS_COPY.noManager}</Text>
            </Row>
            <Row label={ADMIN_PROJECTS_COPY.detailProgress}>
              <Text size="sm">
                {item.progress.done}/{item.progress.total}
                {item.progress.percent === null ? '' : ` · ${item.progress.percent}%`}
              </Text>
            </Row>
            <Row label={ADMIN_PROJECTS_COPY.detailStart}>
              <Text size="sm">{fmtDate(item.startDate, '—')}</Text>
            </Row>
            <Row label={ADMIN_PROJECTS_COPY.detailDue}>
              <Text size="sm">{fmtDate(item.dueDate, ADMIN_PROJECTS_COPY.noDue)}</Text>
            </Row>
          </Stack>
          {footer && (
            <>
              <Divider />
              {footer}
            </>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
