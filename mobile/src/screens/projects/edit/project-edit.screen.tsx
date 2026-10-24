// Projects ⑬ Edit project (prototype projects.edit.jsx ProjectsEdit), from the detail ⋯ (Manager / Admin): every field
// the creation form had except members (Members tab) and the deadline reason (Extend deadline). Save changes writes
// the project store (a new name carries over to the project's tasks) and goes back to the project.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Chips } from '@/components/form/chips';
import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { me } from '@/data/people';
import { getProjectEdit } from '@/data/projects';
import { editProject, type ProjectFields } from '@/data/projects.store';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Foot, Labelled, Note } from '../parts/project-parts';
import { EDIT } from '../projects.strings';

/** Edit form of the project in the route param `id`; a Member, or a project not listed, goes home. */
export function ProjectEditScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useNotice();
  const [view] = useState(() => getProjectEdit(id));
  const p = view?.project;
  const [f, setF] = useState<ProjectFields>(() => ({
    name: p?.name ?? '',
    desc: p?.desc ?? '',
    lead: p?.lead ?? '',
    status: p?.status ?? 'Active',
    priority: p?.priority ?? 'Medium',
    due: p?.due ?? '',
    started: p?.started,
  }));
  if (!view || !p || !allowedScreen('projects.edit', role)) return <Redirect href="/" />;
  const set = (patch: Partial<ProjectFields>) => setF((s) => ({ ...s, ...patch }));
  const save = () => {
    editProject(p.id, f, me(role).name);
    router.back();
    notice(EDIT.saved);
  };
  return (
    <DetailPage
      testID="project-edit"
      title={EDIT.title}
      foot={<Foot cancel={EDIT.cancel} label={EDIT.save} ok={!!f.name.trim()} onPress={save} />}
    >
      <Field label={EDIT.name} required value={f.name} onChangeText={(name) => set({ name })} />
      <Field
        label={EDIT.desc}
        multiline
        value={f.desc}
        placeholder={EDIT.descPlaceholder}
        onChangeText={(desc) => set({ desc })}
      />
      <Labelled label={EDIT.lead} hint={EDIT.leadHint}>
        <SelectField
          label={EDIT.lead}
          options={view.leads}
          value={f.lead}
          onChange={(lead) => set({ lead })}
        />
      </Labelled>
      <Labelled label={EDIT.status} hint={EDIT.statusHint}>
        <Chips
          label={EDIT.status}
          items={EDIT.statuses}
          value={EDIT.statuses.indexOf(f.status)}
          onChange={(i) => set({ status: EDIT.statuses[i] ?? f.status })}
        />
      </Labelled>
      <Labelled label={EDIT.priority}>
        <Chips
          label={EDIT.priority}
          items={EDIT.priorities}
          value={EDIT.priorities.indexOf(f.priority)}
          onChange={(i) => set({ priority: EDIT.priorities[i] ?? f.priority })}
        />
      </Labelled>
      {f.started && (
        <Labelled label={EDIT.start}>
          <DateField
            testID="edit-start"
            label={EDIT.start}
            value={f.started}
            initial={f.started}
            onChange={(started) => set({ started })}
          />
        </Labelled>
      )}
      <Labelled label={EDIT.deadline}>
        <DateField
          testID="edit-due"
          label={EDIT.deadline}
          value={f.due}
          initial={f.due}
          min={f.started}
          onChange={(due) => set({ due })}
        />
      </Labelled>
      <Note>{EDIT.extendNote}</Note>
    </DetailPage>
  );
}
