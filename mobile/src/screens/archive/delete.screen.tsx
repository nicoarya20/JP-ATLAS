// Archive ④ Delete forever (Admin; prototype archive.delete.jsx) as a formSheet: what goes, that it cannot be undone,
// and T3 — the button unlocks once the item's name is typed exactly.
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
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { DELETE_FOREVER } from './archive.strings';

const note = <Text className="rounded-card bg-muted p-3 text-footnote">{DELETE_FOREVER.note}</Text>;

const errorText = (e: unknown) => DELETE_FOREVER.failed(e instanceof Error ? e.message : String(e));

/** Delete entry `entryKey` forever. role: who is signed in (K12); only an Admin gets the action. */
export function DeleteScreen({ entryKey, role = SESSION_ROLE }: { entryKey: string; role?: Role }) {
  const notice = useNotice();
  const [typed, setTyped] = useState('');
  const d = getArchiveDelete(entryKey);
  const { busy, error, run } = useConfirmAction(
    () => deleteForever(entryKey),
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
  if (!d || !allowedScreen('archive.delete', role)) {
    return (
      <SheetFrame testID="screen-archive-delete" title={DELETE_FOREVER.title} actions={cancel}>
        <Text className="text-subhead">{d ? DELETE_FOREVER.note : DELETE_FOREVER.missing}</Text>
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
      {note}
      <TypeToConfirm name={d.title} value={typed} onChangeText={setTyped} disabled={busy} />
      {error && (
        <Text accessibilityLiveRegion="polite" className="text-footnote text-destructive">
          {error}
        </Text>
      )}
    </SheetFrame>
  );
}
