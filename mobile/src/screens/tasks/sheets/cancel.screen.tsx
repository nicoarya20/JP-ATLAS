// Tasks ⑫ Cancel (detail ⋯ › Cancel task, prototype tasks.sheets.jsx TasksCancel): a reason is required, and a note
// for Other; the task stays in its project marked Canceled, and its detail shows why with Restore. Cancel task stays
// disabled until both are given and says what is missing (UX §5): as its hint, and on screen once the note was touched.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { fieldName } from '@/components/form/field-name';
import { FormError } from '@/components/form/form-error';
import { RadioList } from '@/components/form/radio-list';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { getTaskDetail } from '@/data/tasks';
import { CANCEL_OTHER, CANCEL_REASONS, cancelReason, cancelTask } from '@/data/tasks.actions';

import { Labelled } from '../parts/labelled';
import { S } from '../tasks.strings';
import { MISSING } from '../tasks.strings.added';
import { SheetPair, taskLine } from './sheet-parts';

/** What Cancel task still needs: a reason, then the note Other asks for. */
const missingOf = (why: number, text: string) =>
  why < 0 ? MISSING.why : why === CANCEL_OTHER && !text.trim() ? MISSING.note : undefined;

/** Cancel sheet of the task in the route (`/tasks/<no>/cancel`); without Cancel in its ⋯ menu it goes home. */
export function CancelScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const no = Number(id);
  const notice = useNotice();
  // Read once: canceling drops Cancel from the menu, which must not redirect the sheet while it closes.
  const [view] = useState(() => getTaskDetail(role, no));
  const [why, setWhy] = useState(-1);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  if (!view?.menu.includes('cancel')) return <Redirect href="/" />;
  const missing = missingOf(why, text);
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
      hint={missing}
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
      <Labelled required label={S.sheet.why}>
        <RadioList
          label={fieldName(S.sheet.why, true)}
          items={CANCEL_REASONS}
          value={CANCEL_REASONS[why] ?? null}
          onChange={(r) => setWhy((CANCEL_REASONS as readonly string[]).indexOf(r))}
        />
        {touched && why < 0 && <FormError testID="cancel-why-error">{MISSING.why}</FormError>}
      </Labelled>
      <Field
        multiline
        required={why === CANCEL_OTHER}
        label={S.sheet.note}
        placeholder={S.sheet.noteHint}
        value={text}
        onChangeText={(t) => {
          setTouched(true);
          setText(t);
        }}
        onBlur={() => setTouched(true)}
        error={touched && missing === MISSING.note ? MISSING.note : undefined}
        testID="cancel-note"
      />
      <Text className="text-footnote text-muted-foreground">{S.sheet.cancelNote}</Text>
    </SheetFrame>
  );
}
