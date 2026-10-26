// Title of New task · Fill form and Edit task: required, and once touched and left empty it says what Save needs; Save
// stays disabled and reads the same reason as its hint (UX §5, the Events form's pattern).
import { useState } from 'react';

import { Field } from '@/components/form/field';
import type { TaskForm } from '@/data/tasks.form';

import { F } from '../tasks.strings';
import { MISSING } from '../tasks.strings.added';

/** Why Save is disabled: the title first, then the assignee (whose own "Pick at least one person." is on screen). */
export const saveHint = (f: Pick<TaskForm, 'title' | 'who'>) =>
  !f.title.trim() ? MISSING.title : !f.who.length ? F.pickOne : undefined;

/** The task's title field. */
export function TitleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (title: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  return (
    <Field
      required
      label={F.title}
      value={value}
      onChangeText={(title) => {
        setTouched(true);
        onChange(title);
      }}
      onBlur={() => setTouched(true)}
      error={touched && !value.trim() ? MISSING.title : undefined}
      testID="field-title"
    />
  );
}
