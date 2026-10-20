// Tasks form parts shared by ⑥ New task · Fill form and ⑧b Edit task: labelled control, assignee picker, review block.
import { MultiChips, Section, Select, Switch } from '../../kit';
import { D } from '../../data/sample';

const ROLE_TAG = { 'Project Manager': 'Manager', Admin: 'Admin' };

/** Reviewer as the detail names it: "Ayu (Admin)". */
export const reviewerName = name => { const p = D.person(name); return p && `${p.name} (${ROLE_TAG[p.role]})`; };

/** Who may review a task: the project's Managers and every Admin, never one of its assignees. */
export const reviewersOf = (project, who) => Object.values(D.people)
  .filter(p => !who.includes(p.name) && (p.role === 'Admin' || (p.role === 'Project Manager' && project.members.includes(p.name))))
  .map(p => ({ value: p.name, label: `${p.full} · ${ROLE_TAG[p.role]}` }));

export function Labelled({ label, children }) {
  return <div className="field"><span className="t-footnote muted">{label}</span>{children}</div>;
}

/** Assignee: one or more people picked from names (first names), shown by full name. */
export function AssigneeEdit({ names, who, onChange }) {
  const items = names.map(n => ({ value: n, label: D.person(n).full }));
  return (
    <Labelled label="Assignee">
      <MultiChips items={items} on={who} onChange={onChange} label="Assignee" />
      {!who.length && <span className="t-footnote muted">Pick at least one person.</span>}
    </Labelled>
  );
}

/**
 * Needs review + Reviewer. Locked on while the task is in review; a Member may turn it on but not off, and does not
 * pick the reviewer (the first Manager/Admin is used).
 */
export function ReviewEdit({ f, set, locked, options, member }) {
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
