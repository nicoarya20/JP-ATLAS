// Settings ③ Leave (prototype settings.leave.jsx) as a formSheet: Members and PMs request leave, an Admin sets it.
// Phase 1 sends nothing yet, only says so.
import { router } from 'expo-router';
import { useState } from 'react';

import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { SectionLabel } from '@/components/form/section-label';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getLeave } from '@/data/settings';

import { LEAVE_SHEET as L } from './settings.strings';

/** The leave sheet. role: who is signed in (K12). */
export function LeaveScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const notice = useNotice();
  const d = getLeave(role);
  const [from, setFrom] = useState(d.from);
  const [to, setTo] = useState(d.to);
  const [note, setNote] = useState(d.note);
  const pickFrom = (iso: string) => {
    setFrom(iso);
    if (iso > to) setTo(iso);
  };
  const save = () => {
    notice(d.notice);
    router.back();
  };
  return (
    <SheetFrame
      testID="screen-leave"
      title={d.title}
      sub={d.hint}
      actions={
        <HStack className="gap-2">
          <Button variant="outline" className="flex-1" onPress={() => router.back()}>
            <ButtonText>{L.cancel}</ButtonText>
          </Button>
          <Button className="flex-1" onPress={save}>
            <ButtonText>{d.save}</ButtonText>
          </Button>
        </HStack>
      }
    >
      <HStack className="gap-3">
        <VStack className="flex-1 gap-2">
          <SectionLabel>{L.from}</SectionLabel>
          <DateField
            label={L.from}
            value={from}
            onChange={pickFrom}
            initial={d.from}
            testID="leave-from"
          />
        </VStack>
        <VStack className="flex-1 gap-2">
          <SectionLabel>{L.to}</SectionLabel>
          <DateField
            label={L.to}
            value={to}
            onChange={setTo}
            initial={d.to}
            min={from}
            testID="leave-to"
          />
        </VStack>
      </HStack>
      <Field label={L.note} multiline value={note} onChangeText={setNote} />
    </SheetFrame>
  );
}
