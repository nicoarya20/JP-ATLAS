// Projects ⑬ Edit project (prototype projects.edit.jsx ProjectsEdit), from the detail ⋯ for whoever the server lets
// edit (`can.update`): name, description, Lead (one of the project's Managers), status, priority and dates. Save
// changes sends only what changed, in the server's order (fields, status, Lead); closing the project (Done, Canceled)
// or a new Lead is confirmed first (T2). Save stays off, and says why, while the name is blank or nothing changed.
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/confirm/confirm-dialog';
import { Chips } from '@/components/form/chips';
import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { SelectField } from '@/components/form/select-field';
import { DetailPage } from '@/components/screen/detail-page';
import { writeError } from '@/components/state/write-error';
import { ButtonSpinner, ButtonText } from '@/components/ui/button';
import { today } from '@/data/clock';
import { projectMembersResource } from '@/data/projects.api';
import {
  type EditForm,
  editChange,
  getEditForm,
  getLeadChoices,
  PRIORITY_CHOICES,
  STATUS_CHOICES,
  unchanged,
} from '@/data/projects.form';
import { Note } from '../parts/display';
import { Foot, Labelled } from '../parts/form-bits';
import { ProjectGate } from '../parts/project-gate';
import { EDIT } from '../projects.strings';
import { WHY } from '../projects.strings.added';
import { confirmOf, useEditSave } from './edit-save';

const STATUS_LABELS = STATUS_CHOICES.map((c) => c.label);
const PRIORITY_LABELS = PRIORITY_CHOICES.map((c) => c.label);

/** The edit form, from the detail the gate waited for. */
function EditProject({ id, from }: { id: string; from: EditForm }) {
  const [f, setF] = useState(from);
  const [touched, setTouched] = useState(false);
  const [asking, setAsking] = useState(false);
  projectMembersResource(id).use();
  useEffect(() => {
    void projectMembersResource(id).ensure();
  }, [id]);
  const leads = getLeadChoices(id);
  const set = (patch: Partial<EditForm>) => setF((s) => ({ ...s, ...patch }));
  const change = editChange(from, f);
  const blank = !f.name.trim();
  const early = !!f.startDate && !!f.dueDate && f.dueDate < f.startDate;
  const why = blank
    ? WHY.name
    : early
      ? WHY.dueBeforeStart
      : unchanged(change)
        ? EDIT.noChange
        : undefined;
  const confirm = confirmOf(change, f.name.trim(), leads);
  const { busy, error, save, confirmed } = useEditSave(id, change);
  return (
    <DetailPage
      testID="project-edit"
      title={EDIT.title}
      foot={
        <Foot
          cancel={EDIT.cancel}
          label={EDIT.save}
          ok={!why && !busy}
          why={why}
          onPress={() => (confirm.length ? setAsking(true) : void save())}
        >
          {busy && <ButtonSpinner />}
          <ButtonText>{EDIT.save}</ButtonText>
        </Foot>
      }
    >
      {error && <FormError testID="edit-error">{error}</FormError>}
      <Field
        label={EDIT.name}
        required
        value={f.name}
        onChangeText={(name) => {
          setTouched(true);
          set({ name });
        }}
        onBlur={() => setTouched(true)}
        error={touched && blank ? WHY.name : undefined}
        testID="edit-name"
      />
      <Field
        label={EDIT.desc}
        multiline
        value={f.description}
        placeholder={EDIT.descPlaceholder}
        onChangeText={(description) => set({ description })}
      />
      <Labelled label={EDIT.lead} hint={EDIT.leadHint}>
        <SelectField
          label={EDIT.lead}
          testID="edit-lead"
          options={leads}
          value={f.leadId ?? ''}
          onChange={(leadId) => set({ leadId })}
        />
      </Labelled>
      <Labelled label={EDIT.status} hint={EDIT.statusHint}>
        <Chips
          label={EDIT.status}
          items={STATUS_LABELS}
          value={STATUS_CHOICES.findIndex((c) => c.value === f.status)}
          onChange={(i) => set({ status: STATUS_CHOICES[i]?.value ?? f.status })}
        />
      </Labelled>
      <Labelled label={EDIT.priority}>
        <Chips
          label={EDIT.priority}
          items={PRIORITY_LABELS}
          value={PRIORITY_CHOICES.findIndex((c) => c.value === f.priority)}
          onChange={(i) => set({ priority: PRIORITY_CHOICES[i]?.value ?? f.priority })}
        />
      </Labelled>
      <Labelled label={EDIT.start}>
        <DateField
          testID="edit-start"
          label={EDIT.start}
          value={f.startDate}
          initial={f.startDate ?? today()}
          onChange={(startDate) => set({ startDate })}
        />
      </Labelled>
      <Labelled label={EDIT.deadline}>
        <DateField
          testID="edit-due"
          label={EDIT.deadline}
          value={f.dueDate}
          initial={f.dueDate ?? f.startDate ?? today()}
          min={f.startDate ?? undefined}
          onChange={(dueDate) => set({ dueDate })}
        />
        {early && <FormError testID="edit-early">{WHY.dueBeforeStart}</FormError>}
      </Labelled>
      <Note>{EDIT.extendNote}</Note>
      <ConfirmDialog
        open={asking}
        onClose={() => setAsking(false)}
        testID="edit-confirm"
        title={EDIT.confirmTitle}
        message={confirm.join(' ')}
        confirmLabel={EDIT.save}
        errorText={writeError}
        onConfirm={confirmed}
      />
    </DetailPage>
  );
}

/** Edit form of the project in the route param `id`, for whoever may edit it; anyone else goes back to it. */
export function ProjectEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ProjectGate id={id} allowed={(p) => p.can.update === true}>
      {() => <EditProject id={id} from={getEditForm(id) as EditForm} />}
    </ProjectGate>
  );
}
