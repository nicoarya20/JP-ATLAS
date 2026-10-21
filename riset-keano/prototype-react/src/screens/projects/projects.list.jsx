// Projects ①: project list, every project by default. Member sees only joined projects; Admin sees every project. New project is the tab bar "+".
// The search folds into the header as the sheet scrolls (kit StackedScreen); the sheet opens on a people row that narrows
// the list to My projects (not for a Member: theirs are all of them) or one teammate's (projects.people).
// The list shows its screen params' Filter & sort query (projects.query), set from the icon next to the search field.
import { FolderOpen, SearchX } from 'lucide-react';
import { Avatars, Btn, Empty, Link, Progress, Section, StackedScreen, StatusPill } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { ProjectsSearch } from './projects.filter';
import { PeopleRow, ofWho } from './projects.people';
import { applyQuery, isFiltered, queryOf, withoutQuery } from './projects.query';

function ProjectCard({ p }) {
  return (
    <Section go="projects.overview">
      <div className="between"><span className="t-headline">{p.name}</span><StatusPill status={p.status} /></div>
      <div className="stack sm mt-3">
        <span className="t-subhead muted">Lead: {p.lead}</span>
        <span className="t-subhead bold">{p.why ? `${p.health} · ${p.why}` : p.health}</span>
        <div className="row-flex">
          <div className="grow"><Progress value={p.progress} /></div>
          <span className="t-subhead bold">{p.progress ? `${p.progress}%` : '–'}</span>
        </div>
        <div className="between"><span className="t-subhead muted">Due {p.due}</span><Avatars names={p.members} /></div>
      </div>
    </Section>
  );
}

/** Shown when the query leaves the list empty: Reset filters re-opens the list with its default query. */
function NoMatch() {
  const { current, params, go } = useApp();
  return (
    <Empty icon={<SearchX size={28} />} title="No projects match these filters."
      action={<Btn kind="primary" onClick={() => go(current, { params: withoutQuery(params) })}>Reset filters</Btn>} />
  );
}

/** What the people row picked, with how many projects show: "Rina's projects · 3" (a Member sees only shared ones). */
function whoLabel(who, member) {
  if (who === 'me') return 'My projects';
  return member ? `Projects with ${who}` : `${who}'s projects`;
}

export default function ProjectsList({ params }) {
  const { is, go } = useApp();
  const member = is('member'), who = params?.who, q = queryOf(params);
  const visible = member ? D.projects.filter(p => p.members.includes(D.me().name)) : D.projects;
  const list = applyQuery(ofWho(visible, who), q);
  const pick = w => go('projects.list', { params: { ...params, who: w } });
  return (
    <StackedScreen title="Projects" find={<ProjectsSearch />} tab="projects">
      <PeopleRow list={visible} who={who} mine={!member} onPick={pick} />
      {who && (
        <div className="between">
          <span className="t-subhead bold">{whoLabel(who, member)} · {list.length}</span>
          <Link onClick={() => pick(undefined)}>Clear</Link>
        </div>
      )}
      {list.length ? list.map(p => <ProjectCard key={p.id} p={p} />)
        : isFiltered(q) ? <NoMatch /> : <Empty icon={<FolderOpen size={28} />} title="You're not in any project yet." />}
    </StackedScreen>
  );
}
