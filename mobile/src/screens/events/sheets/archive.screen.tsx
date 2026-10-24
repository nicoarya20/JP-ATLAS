// Events ⑪ / ⑪b Move to Archive (prototype events.sheets.jsx ArchiveSheet / ArchiveRecurringSheet): the event (or, for
// a recurring one, this occurrence or the whole series, the default) moves to Archive at once; the Events list comes
// back with the snack "Event moved to Archive" and its Undo (T1, phase1-screens.md K5).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { showSnack } from '@/components/snack/use-snack';
import { Text } from '@/components/ui/text';
import { archiveEvent, findEvent, restoreEvent } from '@/data/events.store';
import { me } from '@/data/people';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';

import { SHEETS } from '../events.strings';
import { Box } from '../parts/event-parts';
import { SheetMissing, SheetPair } from './sheet-pair';
import { WhichOne } from './which-one';

const ONLY_THIS = 0;
const ALL_RECURRING = 1;

/** The archive sheet of the event in the route param `id`. */
export function ArchiveEventScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useNotice();
  const [which, setWhich] = useState(ALL_RECURRING);
  const e = findEvent(id);
  if (!e) return <SheetMissing />;
  const archive = () => {
    archiveEvent(e.id, me(role).name, { once: !!e.repeat && which === ONLY_THIS });
    router.dismissTo('/events');
    showSnack({
      message: SHEETS.archived,
      action: SHEETS.undo,
      onAction: () => {
        restoreEvent(e.id);
        notice(SHEETS.restored);
      },
    });
  };
  return (
    <SheetFrame
      testID="event-archive"
      title={e.repeat ? SHEETS.archiveRecurringTitle : SHEETS.archiveTitle}
      sub={e.title}
      actions={<SheetPair back={SHEETS.cancel} primary={SHEETS.moveToArchive} onPress={archive} />}
    >
      {e.repeat ? (
        <WhichOne options={SHEETS.archiveWhich} value={which} onChange={setWhich} />
      ) : (
        <>
          <Text className="text-subhead text-foreground">{SHEETS.archiveLead}</Text>
          {!e.canceled && (
            <Box>
              <Text className="text-subhead text-foreground">
                {SHEETS.archiveHintBefore}
                <Text
                  accessibilityRole="link"
                  onPress={() => router.replace(`/events/${e.id}/cancel`)}
                  className="font-bold text-atlas"
                >
                  {SHEETS.archiveHintLink}
                </Text>
                {SHEETS.archiveHintAfter}
              </Text>
            </Box>
          )}
        </>
      )}
    </SheetFrame>
  );
}
