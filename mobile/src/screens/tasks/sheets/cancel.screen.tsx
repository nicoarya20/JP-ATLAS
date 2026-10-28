// Tasks ⑫ Cancel (detail ⋯ › Cancel task, prototype tasks.sheets.jsx TasksCancel): a reason is required, and a note
// for Other; the task stays in its project marked Canceled, and its detail shows why with Restore. Cancel task stays
// disabled until both are given and says what is missing (UX §5): as its hint, and on screen once the note was touched.
// It sends POST /tasks/:ref/cancel with the reason's category; a refusal stays in the sheet in the server's words.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { fieldName } from '@/components/form/field-name';
import { FormError } from '@/components/form/form-error';
import { RadioList } from '@/components/form/radio-list';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Text } from '@/components/ui/text';
import { CANCEL_REASONS } from '@/data/tasks.detail';
import { CANCEL_NOTE_MAX, cancelBody, runTaskStep } from '@/data/tasks.detail.write';
import type { TaskCancelCategoryWire } from '@/data/tasks.wire';

import { Labelled } from '../parts/labelled';
import { S } from '../tasks.strings';
import { MISSING } from '../tasks.strings.added';
import { SheetPair, taskLine, useSheetTask } from './sheet-parts';
import { useSheetSend } from './use-sheet-send';

const LABELS = CANCEL_REASONS.map(([, label]) => label);

/** What Cancel task still needs: a reason, then the note Other asks for. */
const missingOf = (why: TaskCancelCategoryWire | null, text: string) =>
  !why ? MISSING.why : why === 'other' && !text.trim() ? MISSING.note : undefined;

/** Cancel sheet of the task in the route (`/tasks/<no>/cancel`); without Cancel task allowed it opens the detail. */
export function CancelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const no = Number(id);
  const task = useSheetTask(no);
  const [why, setWhy] = useState<TaskCancelCategoryWire | null>(null);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const { busy, error, send } = useSheetSend();
  if (task?.can.cancel !== true) return <Redirect href={`/tasks/${id}`} />;
  const missing = missingOf(why, text);
  const body = cancelBody(why, text);
  const actions = (
    <SheetPair
      cancel={S.sheet.back}
      primary={S.sheet.cancelAction}
      kind="danger"
      ok={!!body}
      hint={missing}
      loading={busy}
      onPress={() => body && void send(() => runTaskStep(task.id, 'cancel', body))}
      testID="cancel-send"
    />
  );
  return (
    <SheetFrame
      title={S.sheet.cancelTitle}
      sub={taskLine(task)}
      actions={actions}
      testID="screen-task-cancel"
    >
      <Labelled required label={S.sheet.why}>
        <RadioList
          label={fieldName(S.sheet.why, true)}
          items={LABELS}
          value={CANCEL_REASONS.find(([k]) => k === why)?.[1] ?? null}
          onChange={(label) => setWhy(CANCEL_REASONS.find(([, l]) => l === label)?.[0] ?? null)}
        />
        {touched && !why && <FormError testID="cancel-why-error">{MISSING.why}</FormError>}
      </Labelled>
      <Field
        multiline
        required={why === 'other'}
        label={S.sheet.note}
        placeholder={S.sheet.noteHint}
        value={text}
        onChangeText={(t) => {
          setTouched(true);
          setText(t.slice(0, CANCEL_NOTE_MAX));
        }}
        onBlur={() => setTouched(true)}
        error={touched && missing === MISSING.note ? MISSING.note : undefined}
        testID="cancel-note"
      />
      <Text className="text-footnote text-muted-foreground">{S.sheet.cancelNote}</Text>
      {error && <FormError testID="cancel-error">{error}</FormError>}
    </SheetFrame>
  );
}
