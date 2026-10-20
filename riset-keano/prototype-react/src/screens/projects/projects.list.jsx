// Projects ①: project list. Member sees only joined projects (no My/All switch); Admin sees every project. New project is the tab bar "+".
// The list shows its screen params' Filter & sort query (projects.query), set from the icon next to the search field.
import { SearchX } from 'lucide-react';
import { Avatars, Btn, Empty, Pill, Progress, Screen, Section, Seg } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { ProjectsSearch } from './projects.filter';
import { applyQuery, queryOf, withoutQuery } from './projects.query';

function ProjectCard({ p }) {
  return (
    <Section go="projects.overview">
      <div className="between"><span className="t-headline">{p.name}</span><Pill tone="outline">{p.status}</Pill></div>
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

export default function ProjectsList({ params }) {
  const { is } = useApp();
  const member = is('member');
  const mine = member ? D.projects.filter(p => p.members.includes(D.me().name)) : D.projects;
  const list = applyQuery([...mine], queryOf(params));
  return (
    <Screen title="Projects" tab="projects">
      {!member && <Seg items={['My projects', 'All projects']} on={1} />}
      <ProjectsSearch />
      {list.length ? list.map(p => <ProjectCard key={p.id} p={p} />) : <NoMatch />}
    </Screen>
  );
}
