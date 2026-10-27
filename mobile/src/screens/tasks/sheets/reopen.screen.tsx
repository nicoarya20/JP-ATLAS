// Reopen (detail › Reopen): a reason is required, because the server requires one — 3 to 200 characters, refused with
// REASON_REQUIRED when it is missing. The prototype reopened a task with a plain button, so this sheet is new; it is
// shaped like Return and Cancel, and the task goes back to In progress with the reason in its history.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import { useTaskDetailView } from '@/data/tasks.api.detail';
import { reopenTask } from '@/data/tasks.api.write';

import { whyFailed } from '../parts/write-failed';
import { S } from '../tasks.strings';
import { MISSING } from '../tasks.strings.added';
import { SheetPair, taskLine } from './sheet-parts';

/** The shortest reason the server takes (`REVIEW_NOTE_MIN_LENGTH`). */
const REASON_MIN = 3;

/** Reopen sheet of the task in the route (`/tasks/<no>/reopen`); a task the server will not reopen goes home. */
export function ReopenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ref = id ?? '';
  const notice = useNotice();
  const view = useTaskDetailView(ref);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const missing = reason.trim().length >= REASON_MIN ? undefined : MISSING.reopen;
  const task = view.task;
  // While the detail is still loading there is nothing to reopen yet; once it has arrived without
  // the capability, the step is not this viewer's to take and the sheet has no business being open.
  // Not while the reopen is out, though: it succeeds by taking the task out of Done, which drops
  // the very capability this guard reads, and the sheet must close with `back()` rather than be
  // sent home by its own success.
  if (view.missing || (task && !sending && !task.actions.some((a) => a.key === 'reopen')))
    return <Redirect href="/" />;
  const send = async () => {
    setSending(true);
    try {
      await reopenTask(ref, reason.trim());
      notice(S.detail.done.reopen);
      router.back();
    } catch (cause) {
      // Only a refusal gives the sheet back: on success it is closing, and clearing `sending`
      // would hand the guard above a task that no longer offers Reopen and send it home.
      notice(whyFailed(cause));
      setSending(false);
    }
  };
  const actions = (
    <SheetPair
      cancel={S.sheet.cancel}
      primary={S.sheet.reopenAction}
      ok={!missing}
      busy={sending}
      hint={missing}
      onPress={() => void send()}
      testID="reopen-send"
    />
  );
  return (
    <SheetFrame
      title={S.sheet.reopenTitle}
      sub={task ? taskLine(task) : ''}
      actions={actions}
      testID="screen-task-reopen"
    >
      <Field
        multiline
        required
        label={S.sheet.reason}
        placeholder={S.sheet.reopenHint}
        value={reason}
        onChangeText={(text) => {
          setTouched(true);
          setReason(text);
        }}
        onBlur={() => setTouched(true)}
        error={touched ? missing : undefined}
        testID="reopen-reason"
      />
      <Text className="text-footnote text-muted-foreground">{S.sheet.reopenNote}</Text>
    </SheetFrame>
  );
}
