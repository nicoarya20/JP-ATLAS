/**
 * The ⋯ menu of an event detail: "Ubah acara" (opens the edit form), "Batalkan acara" (opens the
 * reason dialog) and "Hapus acara" (T1, no dialog, the toast offers "Urungkan"). Each item follows
 * the server's `can{}`: a missing key hides it, a deny code greys it out with the reason. An event
 * that is already canceled has no cancel item; one that has ended shows it greyed out.
 */
import { ActionIcon, Menu, Stack, Text } from '@mantine/core';
import { FiEdit2, FiMoreHorizontal, FiTrash2, FiXCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { capReason, isShown } from '~/components/tasks/task-caps';
import type { EventDetail } from '~/lib/events-api';
import { eventEditHref } from '~/lib/events-api';
import type { EventStatus } from '~/lib/events-format';
import { openCancelEventModal } from './CancelEventModal';
import { ACTION_COPY, DETAIL_COPY } from './event-detail.copy';
import { useEventActions } from './useEventActions';

export type EventMenuEvent = Pick<EventDetail, 'id' | 'can'>;

/** Whether "Batalkan acara" is listed, usable, and why not; the server never hides it for an ended event. */
export function cancelItemState(can: EventDetail['can'], status: EventStatus) {
  const shown = isShown(can.cancel) && status !== 'canceled';
  const ended = status === 'ended';
  return {
    shown,
    enabled: shown && can.cancel === true && !ended,
    reason: capReason(can.cancel) ?? (shown && ended ? ACTION_COPY.cancelEnded : null),
  };
}

/** The items this viewer is offered, in menu order; the menu is not rendered when there are none. */
export const eventMenuItems = (can: EventDetail['can'], status: EventStatus) => [
  ...(isShown(can.update) ? (['edit'] as const) : []),
  ...(cancelItemState(can, status).shown ? (['cancel'] as const) : []),
  ...(isShown(can.trash) ? (['delete'] as const) : []),
];

type Props = {
  event: EventMenuEvent;
  status: EventStatus;
  afterDelete?: () => void;
  afterRestore?: (id: string) => void;
};

export function EventDetailMenu({ event, status, afterDelete, afterRestore }: Props) {
  const { cancel, remove } = useEventActions({ afterDelete, afterRestore });
  const navigate = useNavigate();
  const items = eventMenuItems(event.can, status);
  if (items.length === 0) return null;
  const cancelState = cancelItemState(event.can, status);
  const cannotEdit = capReason(event.can.update);
  const blocked = capReason(event.can.trash);
  const openCancel = () =>
    openCancelEventModal(async (reason) => {
      const res = await cancel.run({ id: event.id, reason });
      if (!res.ok) throw res.error;
    });
  return (
    // Tooltip must not wrap Menu.Target (it swallows the click); the icon has an aria-label instead.
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          loading={remove.loading}
          aria-label={DETAIL_COPY.menuLabel}
        >
          <FiMoreHorizontal size="1.25em" aria-hidden />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown maw={320}>
        {items.includes('edit') && (
          <Menu.Item
            leftSection={<FiEdit2 size="1.25em" aria-hidden />}
            disabled={event.can.update !== true}
            onClick={() => void navigate(eventEditHref(event.id))}
          >
            <Stack gap={4}>
              <Text inherit>{ACTION_COPY.editItem}</Text>
              <Text size="xs" c="dimmed">
                {cannotEdit ?? ACTION_COPY.editHint}
              </Text>
            </Stack>
          </Menu.Item>
        )}
        {items.includes('cancel') && (
          <>
            {items.includes('edit') && <Menu.Divider />}
            <Menu.Item
              color="danger"
              leftSection={<FiXCircle size="1.25em" aria-hidden />}
              disabled={!cancelState.enabled}
              onClick={openCancel}
            >
              <Stack gap={4}>
                <Text inherit>{ACTION_COPY.cancelItem}</Text>
                <Text size="xs" c="dimmed">
                  {cancelState.reason ?? ACTION_COPY.cancelHint}
                </Text>
              </Stack>
            </Menu.Item>
          </>
        )}
        {items.includes('delete') && (
          <>
            {items.length > 1 && <Menu.Divider />}
            <Menu.Item
              color="danger"
              leftSection={<FiTrash2 size="1.25em" aria-hidden />}
              disabled={event.can.trash !== true}
              onClick={() => void remove.run({ id: event.id })}
            >
              <Stack gap={4}>
                <Text inherit>{ACTION_COPY.deleteItem}</Text>
                <Text size="xs" c="dimmed">
                  {blocked ?? ACTION_COPY.deleteHint}
                </Text>
              </Stack>
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
