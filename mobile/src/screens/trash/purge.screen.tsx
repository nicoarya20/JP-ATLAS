// Trash ④ Delete forever (prototype archive.delete.jsx) as a formSheet, for an item whose `can.purge` is `true`
// (Admin, Super-admin): what goes, that it cannot be undone, and T3 — the button unlocks once the item's name is typed
// exactly. Anyone else, or an item no longer on a loaded page, gets a sheet that says so.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { nameMatches, TypeToConfirm } from '@/components/confirm/type-to-confirm';
import { useConfirmAction } from '@/components/confirm/use-confirm-action';
import { FormError } from '@/components/form/form-error';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { writeError } from '@/components/state/write-error';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { findTrashItem, trashResource } from '@/data/trash.api';
import { KIND_NAME, purgeMessage, titleOf } from '@/data/trash.view';
import type { TrashItemWire } from '@/data/trash.wire';
import { purgeTrashItem } from '@/data/trash.write';

import { DELETE_FOREVER } from './trash.strings';

const Cancel = ({ busy = false }: { busy?: boolean }) => (
  <Button variant="outline" className="flex-1" isDisabled={busy} onPress={() => router.back()}>
    <ButtonText>{DELETE_FOREVER.cancel}</ButtonText>
  </Button>
);

function Purge({ item }: { item: TrashItemWire }) {
  const notice = useNotice();
  const [typed, setTyped] = useState('');
  const title = titleOf(item);
  const { busy, error, run } = useConfirmAction(
    () => purgeTrashItem(item).then(() => undefined),
    () => {
      notice(DELETE_FOREVER.done);
      router.back();
    },
    writeError,
  );
  const locked = !nameMatches(typed, title);
  return (
    <SheetFrame
      testID="screen-trash-delete"
      title={DELETE_FOREVER.title}
      sub={`${KIND_NAME[item.kind]} · ${title}`}
      actions={
        <HStack className="gap-2">
          <Cancel busy={busy} />
          <Button
            testID="confirm-action"
            variant="destructive"
            className="flex-1"
            isDisabled={busy || locked}
            accessibilityState={{ busy, disabled: busy || locked }}
            onPress={() => void run()}
          >
            {busy && <ButtonSpinner />}
            <ButtonText>{DELETE_FOREVER.action}</ButtonText>
          </Button>
        </HStack>
      }
    >
      <Text className="text-subhead">{purgeMessage(item)}</Text>
      <TypeToConfirm name={title} value={typed} onChangeText={setTyped} disabled={busy} />
      {error && <FormError testID="purge-error">{error}</FormError>}
    </SheetFrame>
  );
}

/** Delete forever for the Trash row in the route param `key` ("task-<id>"). */
export function PurgeScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  trashResource.useSnapshot();
  useEffect(() => {
    void trashResource.ensure();
  }, []);
  // Kept once found: after the delete the Trash is read again without it, while this sheet is still closing.
  const held = useRef<TrashItemWire | undefined>(undefined);
  held.current = findTrashItem(key) ?? held.current;
  const item = held.current;
  if (item?.can.purge === true) return <Purge item={item} />;
  return (
    <SheetFrame testID="screen-trash-delete" title={DELETE_FOREVER.title} actions={<Cancel />}>
      <Text className="text-subhead">{DELETE_FOREVER.missing}</Text>
    </SheetFrame>
  );
}
