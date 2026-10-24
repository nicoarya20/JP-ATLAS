// Tasks ⑪ Return (review detail › Return, prototype tasks.sheets.jsx TasksReturn): a reason is required, a quick pick
// fills it; the task goes back to In progress and the count is logged. Managers and Admins only.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Chips } from '@/components/form/chips';
import { Field } from '@/components/form/field';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getTaskDetail } from '@/data/tasks';
import { nextReturnCount, RETURN_QUICK, returnTask } from '@/data/tasks.actions';
import { allowedScreen } from '@/navigation/screen-roles';

import { Labelled } from '../new/form-fields';
import { S } from '../tasks.strings';
import { SheetPair, taskLine } from './sheet-parts';

/** Return sheet of the task in the route (`/tasks/<no>/return`); anyone else, or a task not in review, goes home. */
export function ReturnScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const no = Number(id);
  const notice = useNotice();
  // Read once: returning moves the task out of review, which must not redirect the sheet while it closes.
  const [view] = useState(() => getTaskDetail(role, no));
  const [n] = useState(() => nextReturnCount(no));
  const [reason, setReason] = useState('');
  if (!view?.canReturn || !allowedScreen('tasks.return', role)) return <Redirect href="/" />;
  const send = () => {
    notice(returnTask(role, no, reason));
    router.back();
  };
  const actions = (
    <SheetPair
      cancel={S.sheet.cancel}
      primary={S.sheet.returnAction}
      ok={!!reason.trim()}
      onPress={send}
      testID="return-send"
    />
  );
  return (
    <SheetFrame
      title={S.sheet.returnTitle}
      sub={taskLine(view)}
      actions={actions}
      testID="screen-task-return"
    >
      <Labelled label={S.sheet.quick}>
        <Chips
          label={S.sheet.quick}
          items={RETURN_QUICK}
          value={(RETURN_QUICK as readonly string[]).indexOf(reason)}
          onChange={(i) => setReason(RETURN_QUICK[i] ?? reason)}
        />
      </Labelled>
      <Field
        multiline
        required
        label={S.sheet.reason}
        placeholder={S.sheet.reasonHint}
        value={reason}
        onChangeText={setReason}
        testID="return-reason"
      />
      <Text className="text-footnote text-muted-foreground">
        {S.sheet.returnNote(n, view.task.who)}
      </Text>
    </SheetFrame>
  );
}
