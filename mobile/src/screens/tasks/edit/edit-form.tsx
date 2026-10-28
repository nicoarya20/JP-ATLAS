// The fields of Edit task, opened on the task as the server sent it: title, assignee (the project's people, the
// current one kept), due date, priority, type and phase of its project, start date and description. Save sends
// PATCH /tasks/:ref with only what changed, so it stays off until something did; a refusal stays on the form in the
// server's words, and once saved the detail shows the task again from the server.
import { router } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { useNotice } from '@/components/notice/use-notice';
import { Text } from '@/components/ui/text';
import type { TaskDetailWire } from '@/data/tasks.detail.wire';
import {
  DESCRIPTION_MAX,
  editChanges,
  editFormOf,
  kindOptions,
  phaseOptions,
} from '@/data/tasks.form';
import type { FormProjectWire } from '@/data/tasks.form.api';
import { updateTask } from '@/data/tasks.form.write';
import { STATUS_LABEL } from '@/data/tasks.wire';

import {
  AssigneeEdit,
  DateEdit,
  PriorityEdit,
  TypePhaseEdit,
  useTaskForm,
} from '../new/form-choices';
import { saveHint, TitleField } from '../new/title-field';
import { TaskPage } from '../parts/task-page';
import { Act, Foot } from '../parts/task-parts';
import { useFormSave } from '../parts/use-form-save';
import { useTaskPeople } from '../parts/use-task-people';
import { F } from '../tasks.strings';
import { MISSING } from '../tasks.strings.added';

type Props = { task: TaskDetailWire; project: FormProjectWire };

export function EditForm({ task, project }: Props) {
  const notice = useNotice();
  const [before] = useState(() => editFormOf(task));
  const { f, set } = useTaskForm(() => before);
  const people = useTaskPeople(project.id, task.assignee);
  const { busy, error, save } = useFormSave();
  const changes = editChanges(before, f);
  const hint = saveHint(f) ?? (changes ? undefined : MISSING.nothing);
  const send = () =>
    changes &&
    save(
      () => updateTask(task.id, project.id, changes),
      () => {
        notice(F.updated);
        router.back();
      },
    );
  const foot = (
    <Foot>
      <Act grow label={F.cancel} onPress={() => router.back()} />
      <Act
        wide
        kind="primary"
        label={F.save}
        disabled={!!hint}
        hint={hint}
        loading={busy}
        onPress={() => void send()}
        testID="edit-save"
      />
    </Foot>
  );
  const meta = [`#${task.number}`, task.project.name, STATUS_LABEL[task.status]].join(' · ');
  return (
    <TaskPage title={F.editTitle} foot={foot} testID="screen-task-edit">
      <Text className="text-footnote text-muted-foreground">{meta}</Text>
      <TitleField value={f.title} onChange={set('title')} />
      <AssigneeEdit
        people={people.people}
        value={f.assigneeId}
        onChange={set('assigneeId')}
        hint={people.hint}
      />
      <DateEdit label={F.due} value={f.dueDate} onChange={set('dueDate')} testID="field-due" />
      <PriorityEdit value={f.priority} onChange={set('priority')} />
      <TypePhaseEdit
        kindId={f.kindId}
        kinds={kindOptions(project, task.kind)}
        phaseId={f.phaseId}
        phases={phaseOptions(project, F.noPhase)}
        onKind={set('kindId')}
        onPhase={set('phaseId')}
      />
      <DateEdit
        label={F.start}
        value={f.startDate}
        onChange={set('startDate')}
        testID="field-start"
      />
      <Field
        multiline
        label={F.description}
        value={f.description}
        placeholder={F.descHint}
        onChangeText={(t) => set('description')(t.slice(0, DESCRIPTION_MAX))}
        testID="field-description"
      />
      <Text className="text-footnote text-muted-foreground">{F.statusNote}</Text>
      {error && <FormError testID="edit-error">{error}</FormError>}
    </TaskPage>
  );
}
