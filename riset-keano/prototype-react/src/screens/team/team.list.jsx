// Team ① List and ③ Empty: who's on my team and what they're working on. Scope and visible counts differ per role;
// task counts come from the live task list. A row opens Team ② for that person.
import { Users } from 'lucide-react';
import { useApp, useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Empty, Rows, Search, Section, Select, Screen } from '../../kit';
import { useTaskMoves } from '../tasks/tasks.store';
import { loadOf, totalOf } from './team.load';

/** Person row. o: {key, you, role, status, extra, counts}. counts = false hides the task counts. */
function Person({ o }) {
  const p = D.person(o.key), status = o.status || 'Available';
  const load = loadOf(p.name);
  const onClick = useNav({ go: 'team.person', params: { person: o.key } });
  return (
    <button type="button" className="tm-row" onClick={onClick}>
      <Avatar name={p.name} />
      <span className="grow stack xs">
        <span className="row-flex"><span className="bold">{p.full}</span>{o.you && <span className="t-footnote">(You)</span>}</span>
        <span className="t-footnote muted">{o.role}</span>
        <span className={`t-footnote tm-status${status === 'Available' ? ' on' : ''}`}>{status}</span>
        {o.extra && <span className="t-footnote muted">{o.extra}</span>}
        {o.counts !== false && (
          <span className="row-flex t-caption bold"><span>{load.active} active</span>{load.overdue > 0 && <span className="danger">{load.overdue} overdue</span>}</span>
        )}
      </span>
      <span className="tm-view">View</span>
    </button>
  );
}

const [nico, rina, dodi] = D.team.list;
const names = keys => keys.map(k => D.person(k).name);
/** Summary line, people, closing note per role. */
const VARIANTS = {
  pm: () => {
    const people = [{ ...nico, you: true }, rina, dodi];
    return { summary: `Projects you manage · ${people.length} people · ${totalOf(names(people.map(o => o.key)))}`, people };
  },
  admin: () => ({
    summary: `All projects · ${Object.keys(D.people).length} people · ${totalOf(names(Object.keys(D.people)))}`,
    people: [{ key: 'ayu', you: true, role: 'Admin · No project', counts: false }, { ...nico, role: 'Project Manager · Atlas Project, Internal Tools' },
      { ...rina, extra: '' }, dodi, { key: 'sri', role: 'Observer · Atlas Project', counts: false }],
    note: 'Approving new users and changing roles happens in More › Users.',
  }),
  member: () => ({
    summary: `Project Atlas Project · ${D.project('atlas').members.length} people`,
    people: [{ ...dodi, you: true }, { ...nico, counts: false }, { ...rina, extra: '', counts: false }],
    note: 'Task counts per person are visible only to that person, the project Manager and Admin.',
  }),
};

export function TeamList() {
  const { role } = useApp();
  useTaskMoves();
  const v = VARIANTS[role]();
  return (
    <Screen title="Team" back tab="more">
      <p className="t-subhead muted">Who's on your team and what they're working on</p>
      <div className="stack sm">
        <div className="row-flex">
          <Select toast="Pick a project">All projects</Select>
          <Select toast="Name · Overdue · Active tasks">Sort: Name</Select>
        </div>
        <Search placeholder="Search name…" />
      </div>
      <Section><p className="t-subhead">{v.summary}</p></Section>
      <Rows>{v.people.map(o => <Person key={o.key} o={o} />)}</Rows>
      {v.note && <p className="t-footnote muted">{v.note}</p>}
    </Screen>
  );
}

export function TeamEmpty() {
  return (
    <Screen title="Team" back tab="more">
      <Empty icon={<Users size={28} aria-label="No team" />} title="No team yet"
        text="You haven't joined any project yet. Your team will show up once a Manager adds you to a project." />
    </Screen>
  );
}
