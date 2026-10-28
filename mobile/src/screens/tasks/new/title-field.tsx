// Title of New task · Fill form and Edit task: required, and once touched and left empty it says what Save needs; Save
// stays disabled and reads the same reason as its hint (UX §5, the Events form's pattern).
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { type FormProblem, formProblem, type TaskForm, TITLE_MAX } from '@/data/tasks.form';

import { F } from '../tasks.strings';
import { MISSING } from '../tasks.strings.added';

const PROBLEM: Record<FormProblem, string> = { title: MISSING.title, dates: MISSING.dates };

/** Why Save is disabled: a blank title, then a start after the due date; undefined when Save may send. */
export const saveHint = (f: Pick<TaskForm, 'title' | 'startDate' | 'dueDate'>) => {
  const problem = formProblem(f);
  return problem ? PROBLEM[problem] : undefined;
};

/** The task's title field, kept to the server's TITLE_MAX. */
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
        onChange(title.slice(0, TITLE_MAX));
      }}
      onBlur={() => setTouched(true)}
      error={touched && !value.trim() ? MISSING.title : undefined}
      testID="field-title"
    />
  );
}
