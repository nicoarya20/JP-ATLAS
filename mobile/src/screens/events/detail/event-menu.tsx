// The event detail's ⋯ menu, as the event's `can{}` allows: a capability that is `true` acts, one with a deny code stays
// in the menu and says why when picked (the menu has no disabled item), a missing one is not offered. Cancel event
// opens its sheet; Move to Trash acts at once (T1): the list comes back with "Event moved to Trash" and its Undo.
import { router } from 'expo-router';
import { useState } from 'react';

import { isApiError } from '@/api/errors';
import { ActionMenu, type MenuAction } from '@/components/menu/action-menu';
import { useNotice } from '@/components/notice/use-notice';
import { showSnack } from '@/components/snack/use-snack';
import { writeError } from '@/components/state/write-error';
import { capMessage } from '@/data/caps.messages';
import type { EventDetailView } from '@/data/events.detail';
import { restoreEvent, trashEvent } from '@/data/events.write';
import type { CapValueWire } from '@/data/tasks.wire';

import { DETAIL, SHEETS } from '../events.strings';

/** Move to Trash and its Undo; `busy` while the move is out, so a second pick does nothing. */
function useTrash(id: string) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  // The snack is already closed here, and so is the detail: the outcome goes to a notice.
  const undo = async () => {
    try {
      await restoreEvent(id);
      notice(SHEETS.restored);
    } catch (e) {
      notice(writeError(e));
      if (!isApiError(e)) throw e;
    }
  };
  const trash = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await trashEvent(id);
    } catch (e) {
      setBusy(false);
      notice(writeError(e));
      if (!isApiError(e)) throw e;
      return;
    }
    router.dismissTo('/events');
    showSnack({ message: SHEETS.trashed, action: SHEETS.undo, onAction: () => void undo() });
  };
  return trash;
}

/** The ⋯ menu of event d; nothing when the viewer may neither cancel nor trash it. */
export function EventMenu({ d }: { d: EventDetailView }) {
  const notice = useNotice();
  const trash = useTrash(d.id);
  const item = (cap: CapValueWire | undefined, label: string, go: () => void): MenuAction[] =>
    cap === undefined
      ? []
      : [{ label, onPress: cap === true ? go : () => notice(capMessage(cap)) }];
  const items = [
    ...(d.canceled
      ? []
      : item(d.can.cancel, DETAIL.cancel, () => router.push(`/events/${d.id}/cancel`))),
    ...item(d.can.trash, DETAIL.trash, () => void trash()).map((m) => ({ ...m, danger: true })),
  ];
  if (!items.length) return null;
  return <ActionMenu items={items} label={DETAIL.actions} testID="event-actions" />;
}
