// Tasks ⑥ New task · Fill form: every field is live and Save adds a To do task (task store), then opens its detail.
// Sample values come from the first AI draft of Just write.
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Btn, Chips, Field, Link, Seg, Select } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Foot, FootScreen } from './tasks.parts';
import { TagsEdit } from './tasks.edit.lists';
import { AssigneeEdit, Labelled, ReviewEdit, reviewerName, reviewersOf } from './tasks.form.fields';
import { PRIORITIES, TYPES, isoOf, labelOf } from './tasks.shared';
import { addTask } from './tasks.store';

const DESC = 'The login page layout breaks on phones. Fix it before the staging release.';

/** Projects the signed-in person may add tasks to: all for an Admin, else the ones they are a member of. */
const projectsFor = (me, admin) => D.projects.filter(p => admin || p.members.includes(me));

/** Form state from the first AI draft; due "Oct 8 (tomorrow)" keeps only the date. */
function initial(project) {
  const F = D.quickWrite.drafts[0];
  return {
    project: project.id, title: F.title, who: project.members.includes(F.who) ? [F.who] : [], priority: F.priority,
    due: F.due.split(' (')[0], desc: DESC, type: F.type, phase: project.id === 'atlas' ? D.atlas.phaseNow : '',
    start: D.today.short.slice(5), hours: '4', tags: ['login'], review: false, wasOn: false, reviewer: '',
  };
}

/** ⑥ New task · Fill form. Assignee takes one or more project members; Reviewer only Managers/Admins, never an assignee. */
export function TasksForm() {
  const { is, go, toast } = useApp(), member = is('member'), me = D.me().name;
  const projects = projectsFor(me, is('admin'));
  const [f, setF] = useState(() => initial(projects.find(p => p.id === 'atlas') || projects[0]));
  const [more, setMore] = useState(true);
  const set = k => v => setF(s => ({ ...s, [k]: v }));
  const project = D.project(f.project);

  const pickProject = id => {
    const p = D.project(id);
    setF(s => ({ ...s, project: id, who: s.who.filter(n => p.members.includes(n)), phase: id === 'atlas' ? s.phase : '' }));
  };
  const reviewers = reviewersOf(project, f.who);
  const reviewer = reviewers.some(o => o.value === f.reviewer) ? f.reviewer : reviewers[0]?.value ?? '';
  const phases = project.id === 'atlas' && [{ value: '', label: 'No phase' }, ...D.atlas.phases.map(p => ({ value: p.name, label: p.name }))];

  const save = () => {
    const no = addTask(
      { title: f.title.trim(), project: project.name, who: f.who[0], also: f.who.slice(1), due: f.due, priority: f.priority, type: f.type, tags: f.tags },
      { phase: f.phase, desc: f.desc.trim(), reviewer: f.review ? reviewerName(reviewer) : undefined, start: f.start, hours: f.hours },
      me);
    toast('Task created');
    go('tasks.detail-todo', { replace: true, params: { task: no } });
  };
  const foot = (
    <Foot>
      <Btn back>Cancel</Btn>
      <Btn kind="primary" disabled={!f.title.trim() || !f.who.length} onClick={save}>Save</Btn>
    </Foot>
  );
  const Chevron = more ? ChevronUp : ChevronDown;
  return (
    <FootScreen title="New task" foot={foot}>
      <Seg items={['Just write ✦', 'Fill form']} on={1} onPick={i => i === 0 && go('tasks.write', { top: true })} />
      <Labelled label="Project *">
        <Select block label="Project" options={projects.map(p => ({ value: p.id, label: p.name }))} value={f.project} onChange={pickProject} />
      </Labelled>
      <Field label="Title *" value={f.title} onChange={set('title')} />
      <AssigneeEdit names={project.members} who={f.who} onChange={set('who')} />
      <Labelled label="Priority">
        <Chips items={PRIORITIES} on={PRIORITIES.indexOf(f.priority)} onPick={i => set('priority')(PRIORITIES[i])} />
      </Labelled>
      <Field label="Due date" type="date" value={isoOf(f.due)} onChange={v => v && set('due')(labelOf(v))} />
      <div>
        <Link className="row-flex t-subhead bold" aria-expanded={more} onClick={() => setMore(m => !m)}>
          {more ? 'Show less' : 'Show more'}<Chevron size={16} aria-hidden="true" />
        </Link>
      </div>
      {more && (
        <>
          <hr className="tk-divider" />
          <Field label="Description" area value={f.desc} placeholder="What needs to be done…" onChange={set('desc')} />
          <div className={phases ? 'tk-two' : undefined}>
            <Labelled label="Type">
              <Select block label="Type" options={TYPES.map(([value, label]) => ({ value, label }))} value={f.type} onChange={set('type')} />
            </Labelled>
            {phases && <Labelled label="Phase"><Select block label="Phase" options={phases} value={f.phase} onChange={set('phase')} /></Labelled>}
          </div>
          <div className="tk-two">
            <Field label="Start date" type="date" value={isoOf(f.start)} onChange={v => v && set('start')(labelOf(v))} />
            <Field label="Estimated hours" type="number" value={f.hours} onChange={set('hours')} />
          </div>
          <TagsEdit tags={f.tags} onChange={set('tags')} />
          <ReviewEdit f={{ ...f, reviewer }} set={set} options={reviewers} member={member} />
          <span className="t-footnote muted">Needs review starts from the project setting ({project.name.split(' ')[0]}: off).</span>
        </>
      )}
    </FootScreen>
  );
}
