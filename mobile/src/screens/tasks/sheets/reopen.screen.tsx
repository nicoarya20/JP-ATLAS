// Reopen (detail › Reopen, new in Phase 2): the server takes a Done task back to In progress only with a reason of 3 to
// 200 characters (REASON_REQUIRED), so the sheet asks for one. Reopen stays disabled until the reason is long enough
// and says what is missing (UX §5), as its hint and under the field once it was touched; a refusal stays in the sheet
// in the server's words (K5).
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import { REOPEN_REASON, reopenReason, runTaskStep } from '@/data/tasks.detail.write';

import { S } from '../tasks.strings';
import { MISSING } from '../tasks.strings.added';
import { SheetPair, taskLine, useSheetTask } from './sheet-parts';
import { useSheetSend } from './use-sheet-send';

/** Reopen sheet of the task in the route (`/tasks/<no>/reopen`); without Reopen allowed it opens the detail. */
export function ReopenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useSheetTask(Number(id));
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const { busy, error, send } = useSheetSend();
  if (task?.can.reopen !== true) return <Redirect href={`/tasks/${id}`} />;
  const reason = reopenReason(text);
  const actions = (
    <SheetPair
      cancel={S.sheet.back}
      primary={S.sheet.reopenAction}
      ok={!!reason}
      hint={reason ? undefined : MISSING.reopen}
      loading={busy}
      onPress={() => reason && void send(() => runTaskStep(task.id, 'reopen', { reason }))}
      testID="reopen-send"
    />
  );
  return (
    <SheetFrame
      title={S.sheet.reopenTitle}
      sub={taskLine(task)}
      actions={actions}
      testID="screen-task-reopen"
    >
      <Field
        multiline
        required
        label={S.sheet.reason}
        placeholder={S.sheet.reopenHint}
        value={text}
        onChangeText={(t) => {
          setTouched(true);
          setText(t.slice(0, REOPEN_REASON.max));
        }}
        onBlur={() => setTouched(true)}
        error={touched && !reason ? MISSING.reopen : undefined}
        testID="reopen-reason"
      />
      <Text className="text-footnote text-muted-foreground">{S.sheet.reopenNote}</Text>
      {error && <FormError testID="reopen-error">{error}</FormError>}
    </SheetFrame>
  );
}
