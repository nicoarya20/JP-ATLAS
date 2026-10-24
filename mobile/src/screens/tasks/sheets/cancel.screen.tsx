// Tasks ⑫ Cancel (detail ⋯ › Cancel task, prototype tasks.sheets.jsx TasksCancel): a reason is required, and a note
// for Other; the task stays in its project marked Canceled, and its detail shows why with Restore.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { RadioList } from '@/components/form/radio-list';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getTaskDetail } from '@/data/tasks';
import { CANCEL_REASONS, cancelReason, cancelTask } from '@/data/tasks.actions';

import { Labelled } from '../new/form-fields';
import { S } from '../tasks.strings';
import { SheetPair, taskLine } from './sheet-parts';

/** Cancel sheet of the task in the route (`/tasks/<no>/cancel`); without Cancel in its ⋯ menu it goes home. */
export function CancelScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const no = Number(id);
  const notice = useNotice();
  // Read once: canceling drops Cancel from the menu, which must not redirect the sheet while it closes.
  const [view] = useState(() => getTaskDetail(role, no));
  const [why, setWhy] = useState(-1);
  const [text, setText] = useState('');
  if (!view?.menu.includes('cancel')) return <Redirect href="/" />;
  const send = () => {
    notice(cancelTask(role, no, why, text));
    router.back();
  };
  const actions = (
    <SheetPair
      cancel={S.sheet.back}
      primary={S.sheet.cancelAction}
      kind="danger"
      ok={!!cancelReason(why, text)}
      onPress={send}
      testID="cancel-send"
    />
  );
  return (
    <SheetFrame
      title={S.sheet.cancelTitle}
      sub={taskLine(view)}
      actions={actions}
      testID="screen-task-cancel"
    >
      <Labelled label={S.sheet.why}>
        <RadioList
          label={S.sheet.whyLabel}
          items={CANCEL_REASONS}
          value={CANCEL_REASONS[why] ?? null}
          onChange={(r) => setWhy((CANCEL_REASONS as readonly string[]).indexOf(r))}
        />
      </Labelled>
      <Field
        multiline
        label={S.sheet.note}
        placeholder={S.sheet.noteHint}
        value={text}
        onChangeText={setText}
        testID="cancel-note"
      />
      <Text className="text-footnote text-muted-foreground">{S.sheet.cancelNote}</Text>
    </SheetFrame>
  );
}
