// Projects ⑬ Edit project and ⑭ Move to Archive, both from the detail ⋯ (Manager & Admin). Edit saves name, description,
// Lead, status, priority and dates through the project store; Archive takes the project and its tasks to Archive and
// lands on the project list with Undo (Archive ③).
import { useState } from 'react';
import { Btn, Chips, Field, Section, Select, Sheet } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { isoOf, labelOf } from '../tasks/tasks.shared';
import { Foot, FootScreen } from './projects.parts';
import { archiveProject, editProject, taskCountOf } from './projects.store';

const STATUSES = ['Draft', 'Active', 'On hold', 'Done', 'Canceled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

/** Project the screen or sheet is about: params.project, else Atlas (the only project with a detail). */
const projectOf = params => D.project(params?.project) || D.project('atlas');

/** Labelled group that is not a text input (chips, selects). */
function Group({ label, hint, children }) {
  return (
    <div className="field">
      <span className="t-footnote muted">{label}</span>
      {children}
      {hint && <span className="t-footnote muted">{hint}</span>}
    </div>
  );
}

/** ⑬ Edit project — every field the form at creation had, except members (Members tab) and the deadline reason (Extend). */
export function ProjectsEdit({ params }) {
  const { back, toast } = useApp();
  const p = projectOf(params);
  const [f, setF] = useState(() => ({
    name: p.name, desc: p.desc || '', lead: p.lead, status: p.status, priority: p.priority || 'Medium',
    started: p.id === 'atlas' ? D.atlas.started : '', due: p.due,
  }));
  const set = k => v => setF(s => ({ ...s, [k]: v }));
  const date = k => v => v && set(k)(labelOf(v));
  const save = () => {
    const { started, ...fields } = f;
    editProject(p.id, { ...fields, name: f.name.trim(), desc: f.desc.trim(), ...(started ? { started } : {}) }, D.me().name);
    toast('Project updated');
    back();
  };
  const foot = (
    <Foot>
      <Btn back>Cancel</Btn>
      <Btn kind="primary" disabled={!f.name.trim()} onClick={save}>Save changes</Btn>
    </Foot>
  );
  return (
    <FootScreen title="Edit project" foot={foot}>
      <Field label="Project name *" value={f.name} onChange={set('name')} />
      <Field label="Description" area value={f.desc} placeholder="Briefly describe the project's goal" onChange={set('desc')} />
      <Group label="Lead (main manager)" hint="Only this project's Managers can be Lead. Add a Manager in the Members tab.">
        <Select block label="Lead" options={[{ value: p.lead, label: D.person(p.lead).full }]} value={f.lead} onChange={set('lead')} />
      </Group>
      <Group label="Status" hint="Status can move to any other, even from Done back to Active.">
        <Chips items={STATUSES} on={STATUSES.indexOf(f.status)} onPick={i => set('status')(STATUSES[i])} />
      </Group>
      <Group label="Priority">
        <Chips items={PRIORITIES} on={PRIORITIES.indexOf(f.priority)} onPick={i => set('priority')(PRIORITIES[i])} />
      </Group>
      <div className="pj-grid2">
        {f.started && <Field label="Start date" type="date" value={isoOf(f.started)} onChange={date('started')} />}
        <Field label="Deadline" type="date" value={isoOf(f.due)} onChange={date('due')} />
      </div>
      <p className="t-footnote muted">Need more time and want the reason on record? Use Extend deadline on the project page.</p>
    </FootScreen>
  );
}

/** ⑭ Sheet · Move to Archive — names what goes along; the project comes back whole with Undo or Restore. */
export function ProjectsArchive({ params }) {
  const { closeSheet, go } = useApp();
  const p = projectOf(params), tasks = taskCountOf(p.id);
  const send = () => {
    archiveProject(p.id, D.me().name);
    closeSheet();
    go('archive.undo', { replace: true, params: { project: p.id } });
  };
  const actions = (
    <div className="pj-grid2">
      <Btn close>Cancel</Btn>
      <Btn kind="danger" block onClick={send}>Move to Archive</Btn>
    </div>
  );
  return (
    <Sheet title="Move project to Archive?" sub={p.name} actions={actions}>
      <p className="t-subhead">“{p.name}” and its {tasks} leave every list and wait in Archive.</p>
      <Section className="pj-soft">
        <span className="t-footnote">Restore brings the project back with all its tasks. Only an Admin can delete it forever.</span>
      </Section>
    </Sheet>
  );
}
