// Archive ④ Delete forever as a formSheet: what goes, that it cannot be undone, and T3 — the button
// unlocks once the item's name is typed exactly. Who may do it is the item's own `can.purge`
// (Admin and Super-admin), not a role test of this app's own.
import { router } from 'expo-router';
import { useState } from 'react';

import { nameMatches, TypeToConfirm } from '@/components/confirm/type-to-confirm';
import { useConfirmAction } from '@/components/confirm/use-confirm-action';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { deleteForever, getArchiveDelete } from '@/data/archive';

import { DELETE_FOREVER } from './archive.strings';

const errorText = (e: unknown) => DELETE_FOREVER.failed(e instanceof Error ? e.message : String(e));

/** Delete the item card `entryKey` names, for good. */
export function DeleteScreen({ entryKey }: { entryKey: string }) {
  const notice = useNotice();
  const [typed, setTyped] = useState('');
  const d = getArchiveDelete(entryKey);
  const { busy, error, run } = useConfirmAction(
    async () => {
      await deleteForever(entryKey);
    },
    () => {
      notice(DELETE_FOREVER.done);
      router.back();
    },
    errorText,
  );
  const cancel = (
    <Button variant="outline" className="flex-1" isDisabled={busy} onPress={() => router.back()}>
      <ButtonText>{DELETE_FOREVER.cancel}</ButtonText>
    </Button>
  );
  if (!d?.allowed) {
    return (
      <SheetFrame testID="screen-archive-delete" title={DELETE_FOREVER.title} actions={cancel}>
        <Text className="text-subhead">
          {!d ? DELETE_FOREVER.missing : (d.reason ?? DELETE_FOREVER.refused)}
        </Text>
      </SheetFrame>
    );
  }
  const locked = !nameMatches(typed, d.title);
  return (
    <SheetFrame
      testID="screen-archive-delete"
      title={DELETE_FOREVER.title}
      sub={d.sub}
      actions={
        <HStack className="gap-2">
          {cancel}
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
      <Text className="text-subhead">{d.message}</Text>
      <TypeToConfirm name={d.title} value={typed} onChangeText={setTyped} disabled={busy} />
      {error && (
        <Text accessibilityLiveRegion="polite" className="text-footnote text-destructive">
          {error}
        </Text>
      )}
    </SheetFrame>
  );
}
