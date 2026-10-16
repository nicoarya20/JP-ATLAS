// Projects ①: project list. Member sees only joined projects (no My/All switch); Admin sees every project. New project is the tab bar "+".
import { Avatars, Chips, Pill, Progress, Screen, Search, Section, Seg, Select } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';

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

export default function ProjectsList() {
  const { is } = useApp();
  const member = is('member');
  const list = member ? D.projects.filter(p => p.members.includes(D.me().name)) : D.projects;
  return (
    <Screen title="Projects" tab="projects">
      {!member && <Seg items={['My projects', 'All projects']} on={1} />}
      <Search placeholder="Search project name or description…" />
      <Chips items={['All', 'Active', 'On hold', 'Done', 'Draft', '! Needs attention']} />
      <div className="between">
        <Select toast="Sort options">Sort: Nearest deadline</Select>
        <span className="t-subhead muted">{list.length} projects</span>
      </div>
      {list.map(p => <ProjectCard key={p.id} p={p} />)}
    </Screen>
  );
}
