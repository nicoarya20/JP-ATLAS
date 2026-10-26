// Events ⑪ Move to Archive (prototype events.sheets.jsx ArchiveSheet): the event moves to the
// server's Trash at once; the Events list comes back with the snack "Event moved to Archive" and
// its Undo (T1, phase1-screens.md K5).
//
// Undo calls the restore route and shows whatever it answers. There is deliberately no local
// "can this still be restored?" check: retention, a trashed project and impersonation are the
// server's to judge (`can{}` has no `restore` key for exactly that reason, map §3), and a second
// opinion here would be a guess that disagrees with it.
//
// The recurring variant ("this occurrence or the whole series") is gone: the API has no recurrence
// and `DELETE /events/:id` takes no occurrence date (GAP-A4/A5).
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { showSnack } from '@/components/snack/use-snack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { getEventDetail } from '@/data/events';
import { eventDetailResource, restoreEvent, trashEvent } from '@/data/events.api';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { SHEETS } from '../events.strings';
import { SPOKEN } from '../events.strings.added';
import { Box, Note } from '../parts/event-parts';
import { SheetBusy, SheetMissing, SheetPair } from './sheet-pair';

/** The archive sheet of the event in the route param `id`. */
export function ArchiveEventScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const resource = eventDetailResource(id);
  const state = resource.use();
  useEffect(() => {
    void resource.ensure();
  }, [resource]);
  const d = getEventDetail(role, id);
  if (!d) return state.phase === 'failed' ? <SheetMissing /> : <SheetBusy />;
  const e = d.event;
  const allowed = d.menu.some((m) => m.action === 'archive' && m.enabled);
  const blocked = d.menu.find((m) => m.action === 'archive')?.reason ?? null;

  const undo = async () => {
    try {
      await restoreEvent(e.id);
      notice(SHEETS.restored);
    } catch (failure) {
      notice(failure instanceof Error ? failure.message : SHEETS.restoreFailed);
    }
  };

  const archive = async () => {
    setBusy(true);
    try {
      await trashEvent(e.id);
      router.dismissTo('/events');
      showSnack({
        message: SHEETS.archived,
        action: SHEETS.undo,
        onAction: () => {
          void undo();
        },
      });
    } catch (failure) {
      notice(failure instanceof Error ? failure.message : SHEETS.archiveFailed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <SheetFrame
      testID="event-archive"
      title={SHEETS.archiveTitle}
      sub={e.title}
      actions={
        <SheetPair
          back={SHEETS.cancel}
          primary={busy ? SHEETS.archiving : SHEETS.moveToArchive}
          ok={allowed && !busy}
          onPress={() => {
            void archive();
          }}
        />
      }
    >
      <Text className="text-subhead text-foreground">{SHEETS.archiveLead}</Text>
      {blocked && <Note>{blocked}</Note>}
      {!e.canceled && (
        // The whole hint is the way to Cancel (one stop, ≥ 44 pt), named apart from the sheet's Cancel (close).
        <Pressable
          testID="archive-cancel-instead"
          accessibilityRole="link"
          accessibilityLabel={SPOKEN.cancelInstead}
          accessibilityHint={`${SHEETS.archiveHintBefore}${SHEETS.archiveHintLink}${SHEETS.archiveHintAfter}`}
          onPress={() => router.replace(`/events/${e.id}/cancel`)}
          className="min-h-11 data-[active=true]:opacity-70"
        >
          <Box>
            <Text className="text-subhead text-foreground">
              {SHEETS.archiveHintBefore}
              <Text className="font-bold text-atlas">{SHEETS.archiveHintLink}</Text>
              {SHEETS.archiveHintAfter}
            </Text>
          </Box>
        </Pressable>
      )}
    </SheetFrame>
  );
}
