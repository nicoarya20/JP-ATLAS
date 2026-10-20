// Tasks ⑧b Edit task (detail ⋯ › Edit task): every field the detail shows, saved into the sample through the task store.
// Status moves through the detail actions or the Kanban board, and Created by is a record, so neither is edited here.
import { useState } from 'react';
import { Btn, Chips, Field, Section, Select, Switch } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Foot, FootScreen } from './tasks.parts';
import { EvidenceEdit, StepsEdit, TagsEdit } from './tasks.edit.lists';
import { PRIORITIES, TYPES, info, isoOf, labelOf } from './tasks.shared';
import { editTask } from './tasks.store';

const ROLE_TAG = { 'Project Manager': 'Manager', Admin: 'Admin' };

/** Who may review a task: the project's Managers and every Admin, never the assignee. */
const reviewersOf = (project, who) => Object.values(D.people)
  .filter(p => p.name !== who && (p.role === 'Admin' || (p.role === 'Project Manager' && project.members.includes(p.name))))
  .map(p => ({ value: p.name, label: `${p.full} · ${ROLE_TAG[p.role]}` }));

function Labelled({ label, children }) {
  return <div className="field"><span className="t-footnote muted">{label}</span>{children}</div>;
}

/**
 * Needs review + Reviewer. Locked on while the task is in review; a Member may turn it on but not off, and does not
 * pick the reviewer (the first Manager/Admin is used).
 */
function ReviewEdit({ f, set, locked, options, member }) {
  const fixed = locked || (member && f.wasOn);
  const why = locked ? 'Locked while the task is in review.' : 'Only a Manager or Admin can turn it off.';
  return (
    <Section className="tk-soft">
      <div className="stack sm">
        <div className="between">
          <span className="t-headline">Needs review</span>
          {fixed ? <b className="t-footnote">Yes</b> : <Switch on={f.review} label="Needs review" onChange={set('review')} />}
        </div>
        {fixed && <span className="t-footnote muted">{why}</span>}
        {f.review && !member && (
          <Labelled label="Reviewer">
            <Select block label="Reviewer" options={options} value={f.reviewer} onChange={set('reviewer')} />
          </Labelled>
        )}
        {f.review && member && <span className="t-footnote muted">A Manager or Admin of the project reviews it.</span>}
      </div>
    </Section>
  );
}

/** Form state from task #no and its extras. reviewer = first name of the current reviewer, when that is a person. */
function initial(t, x) {
  return {
    title: t.title, who: t.who, due: t.due, priority: t.priority, type: t.type, tags: [...t.tags],
    phase: x.phase || '', desc: x.desc, review: !!x.reviewer, wasOn: !!x.reviewer, reviewer: x.reviewer?.split(' ')[0] || '',
    steps: x.steps.map(s => [...s]), proof: x.proof.map(p => [...p]),
  };
}

/** ⑧b Edit task — opens on params.task (else #17); Save writes every field and goes back to the detail. */
export function TasksEdit({ params }) {
  const { is, back, toast } = useApp(), member = is('member');
  const t = D.task(+params?.task) || D.task(17), x = info(t.no);
  const project = D.projects.find(p => p.name === t.project);
  const [f, setF] = useState(() => initial(t, x));
  const set = k => v => setF(s => ({ ...s, [k]: v }));

  const people = [...new Set([...project.members, f.who])].map(n => ({ value: n, label: D.person(n).full }));
  const reviewers = reviewersOf(project, f.who);
  const reviewer = reviewers.some(o => o.value === f.reviewer) ? f.reviewer : reviewers[0]?.value ?? '';
  const phases = project.id === 'atlas' && [{ value: '', label: 'No phase' }, ...D.atlas.phases.map(p => ({ value: p.name, label: p.name }))];

  const save = () => {
    const kept = x.reviewer && x.reviewer.split(' ')[0] === reviewer;
    const who = D.person(reviewer);
    const named = kept ? x.reviewer : who && `${who.name} (${ROLE_TAG[who.role]})`;
    editTask(t.no,
      { title: f.title.trim(), who: f.who, due: f.due, priority: f.priority, type: f.type, tags: f.tags },
      { phase: f.phase, desc: f.desc.trim(), reviewer: f.review ? named : undefined, steps: f.steps.filter(s => s[0].trim()), proof: f.proof },
      D.me().name);
    toast('Task updated');
    back();
  };
  const foot = (
    <Foot>
      <Btn back>Cancel</Btn>
      <Btn kind="primary" disabled={!f.title.trim()} onClick={save}>Save</Btn>
    </Foot>
  );
  return (
    <FootScreen title="Edit task" foot={foot}>
      <span className="t-footnote muted">#{t.no} · {t.project} · {t.status}</span>
      <Field label="Title *" value={f.title} onChange={set('title')} />
      <Labelled label="Assignee"><Select block label="Assignee" options={people} value={f.who} onChange={set('who')} /></Labelled>
      <Field label="Due date" type="date" value={isoOf(f.due)} onChange={v => v && set('due')(labelOf(v))} />
      <Labelled label="Priority">
        <Chips items={PRIORITIES} on={PRIORITIES.indexOf(f.priority)} onPick={i => set('priority')(PRIORITIES[i])} />
      </Labelled>
      <div className={phases ? 'tk-two' : undefined}>
        <Labelled label="Type">
          <Select block label="Type" options={TYPES.map(([value, label]) => ({ value, label }))} value={f.type} onChange={set('type')} />
        </Labelled>
        {phases && <Labelled label="Phase"><Select block label="Phase" options={phases} value={f.phase} onChange={set('phase')} /></Labelled>}
      </div>
      <ReviewEdit f={{ ...f, reviewer }} set={set} locked={t.status === 'In review'} options={reviewers} member={member} />
      <TagsEdit tags={f.tags} onChange={set('tags')} />
      <Field label="Description" area value={f.desc} placeholder="What needs to be done…" onChange={set('desc')} />
      <StepsEdit steps={f.steps} onChange={set('steps')} />
      <EvidenceEdit proof={f.proof} onChange={set('proof')} />
      <p className="t-footnote muted">Status changes from the task's buttons or the Kanban board.</p>
    </FootScreen>
  );
}
