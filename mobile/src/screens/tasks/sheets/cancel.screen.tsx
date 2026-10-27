// Tasks ⑫ Cancel (detail ⋯ › Cancel task, prototype tasks.sheets.jsx TasksCancel): a reason is required, and a note for
// Other; the task stays in its project marked Canceled, and its detail shows why with Restore. Cancel task stays
// disabled until both are given and says what is missing (UX §5): as its hint, and on screen once the note was touched.
//
// The reason goes to the server as two fields — a category from its enum and the note — never as the one joined
// sentence the prototype logged, which there is no column for.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Field } from '@/components/form/field';
import { fieldName } from '@/components/form/field-name';
import { FormError } from '@/components/form/form-error';
import { RadioList } from '@/components/form/radio-list';
import { useNotice } from '@/components/notice/use-notice';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import { ensureTaskDetailView, useTaskDetailView } from '@/data/tasks.api.detail';
import { CANCEL_WORDS, cancelCategoryOf } from '@/data/tasks.api.values';
import { cancelTaskOnServer } from '@/data/tasks.api.write';

import { Labelled } from '../parts/labelled';
import { whyFailed } from '../parts/write-failed';
import { S } from '../tasks.strings';
import { MISSING } from '../tasks.strings.added';
import { SheetPair, taskLine } from './sheet-parts';

/** The last reason ("Other") is the one the server insists on a note for. */
const OTHER = CANCEL_WORDS.length - 1;

/** What Cancel task still needs: a reason, then the note Other asks for. */
const missingOf = (why: number, text: string) =>
  why < 0 ? MISSING.why : why === OTHER && !text.trim() ? MISSING.note : undefined;

/** Cancel sheet of the task in the route (`/tasks/<no>/cancel`); a task the server will not cancel goes home. */
export function CancelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ref = id ?? '';
  const notice = useNotice();
  const view = useTaskDetailView(ref);
  const [why, setWhy] = useState(-1);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const task = view.task;
  // A sheet can be opened straight from a link, with nothing read yet. Idempotent by rule 1: this
  // joins the detail screen's request when there is one and makes it when there is not — without it
  // the guard below never sees a task and the sheet would act on one it knows nothing about.
  useEffect(() => {
    void ensureTaskDetailView(ref);
  }, [ref]);
  // Canceling drops Cancel from the menu, so the sheet must not read the menu while it closes: it
  // turns away only a task the server has answered about and does not offer it for.
  if (view.missing || (task && !sending && !task.menu.includes('cancel')))
    return <Redirect href="/" />;
  const missing = task ? missingOf(why, text) : MISSING.loading;
  const send = async () => {
    const category = cancelCategoryOf(why);
    if (!category) return;
    setSending(true);
    try {
      await cancelTaskOnServer(ref, category, text);
      notice(S.detail.done.canceled);
      router.back();
    } catch (cause) {
      notice(whyFailed(cause));
      setSending(false);
    }
  };
  const actions = (
    <SheetPair
      cancel={S.sheet.back}
      primary={S.sheet.cancelAction}
      kind="danger"
      ok={!missing}
      busy={sending}
      hint={missing}
      onPress={() => void send()}
      testID="cancel-send"
    />
  );
  return (
    <SheetFrame
      title={S.sheet.cancelTitle}
      sub={task ? taskLine(task) : ''}
      actions={actions}
      testID="screen-task-cancel"
    >
      <Labelled required label={S.sheet.why}>
        <RadioList
          label={fieldName(S.sheet.why, true)}
          items={CANCEL_WORDS}
          value={CANCEL_WORDS[why] ?? null}
          onChange={(r) => setWhy((CANCEL_WORDS as readonly string[]).indexOf(r))}
        />
        {touched && why < 0 && <FormError testID="cancel-why-error">{MISSING.why}</FormError>}
      </Labelled>
      <Field
        multiline
        required={why === OTHER}
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
