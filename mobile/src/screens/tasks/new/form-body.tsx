// The fields of New task · Fill form: the project (from form-options), the title, one assignee among the project's
// people, priority and due date, then under Show more the description, type and phase (the project's own) and the
// start date. Save sends POST /tasks with what is set and opens the new task; a refusal stays on the form in the
// server's words. Picking another project keeps what still fits it (tasks.form.ts pickFormProject).
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { useToday } from '@/data/clock';
import {
  createBody,
  DESCRIPTION_MAX,
  kindOptions,
  newTaskForm,
  phaseOptions,
  pickFormProject,
} from '@/data/tasks.form';
import type { FormProjectWire } from '@/data/tasks.form.api';
import { createTask } from '@/data/tasks.form.write';

import { Labelled } from '../parts/labelled';
import { TaskPage } from '../parts/task-page';
import { Act, Foot } from '../parts/task-parts';
import { useFormSave } from '../parts/use-form-save';
import { useTaskPeople } from '../parts/use-task-people';
import { F } from '../tasks.strings';
import {
  AssigneeEdit,
  DateEdit,
  MoreToggle,
  PriorityEdit,
  TypePhaseEdit,
  useTaskForm,
} from './form-choices';
import { ModeSwitch } from './mode-switch';
import { saveHint, TitleField } from './title-field';

type Props = { projects: readonly FormProjectWire[]; initialId?: string };

/** The form over `projects`, opened on `initialId` when it is one of them, else on the first. */
export function NewTaskForm({ projects, initialId }: Props) {
  const notice = useNotice();
  const today = useToday();
  const [projectId, setProjectId] = useState(
    () => (projects.find((p) => p.id === initialId) ?? projects[0]).id,
  );
  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const { f, setF, set } = useTaskForm(() => newTaskForm(project, today));
  const [more, setMore] = useState(true);
  const people = useTaskPeople(project.id);
  const { busy, error, save } = useFormSave();
  const pick = (id: string) => {
    const next = projects.find((p) => p.id === id);
    if (!next) return;
    setProjectId(id);
    setF((s) => pickFormProject(s, next));
  };
  const hint = saveHint(f);
  const send = () =>
    save(
      () => createTask(createBody(project.id, f)),
      (no) => {
        notice(F.created);
        router.dismiss();
        router.push(`/tasks/${no}`);
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
        testID="form-save"
      />
    </Foot>
  );
  return (
    <TaskPage modal title={F.newTitle} foot={foot} testID="screen-task-form">
      <ModeSwitch />
      <Labelled required label={F.project}>
        <SelectField
          required
          label={F.project}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={project.id}
          onChange={pick}
          testID="form-project"
        />
      </Labelled>
      <TitleField value={f.title} onChange={set('title')} />
      <AssigneeEdit
        people={people.people}
        value={f.assigneeId}
        onChange={set('assigneeId')}
        hint={people.hint}
      />
      <PriorityEdit value={f.priority} onChange={set('priority')} />
      <DateEdit label={F.due} value={f.dueDate} onChange={set('dueDate')} testID="field-due" />
      <MoreToggle more={more} onToggle={() => setMore((m) => !m)} />
      {more && (
        <>
          <View className="h-px bg-border" />
          <Field
            multiline
            label={F.description}
            value={f.description}
            placeholder={F.descHint}
            onChangeText={(t) => set('description')(t.slice(0, DESCRIPTION_MAX))}
            testID="field-description"
          />
          <TypePhaseEdit
            kindId={f.kindId}
            kinds={kindOptions(project)}
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
        </>
      )}
      {error && <FormError testID="form-error">{error}</FormError>}
    </TaskPage>
  );
}
