// Tasks ⑬: project settings (opened from Project detail ⋯). Managers & Admins edit; Members see a not-available state.
import { Lock } from 'lucide-react';
import { Btn, Empty, Link, Pill, Row, Rows, Screen, Section, Select, Switch } from '../../kit';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { TYPES, atlasTasks } from './tasks.shared';

const count = n => `${n} task${n === 1 ? '' : 's'}`;
const tagCounts = () => Object.entries(atlasTasks().flatMap(t => t.tags).reduce((m, x) => ({ ...m, [x]: (m[x] || 0) + 1 }), {}));

function TypeCard({ type: [name, cat] }) {
  return (
    <Section>
      <div className="stack sm">
        <div className="between"><span className="t-headline">{name}</span><span className="t-footnote muted">{count(atlasTasks().filter(t => t.type === name).length)}</span></div>
        <Select block toast="Task (task) · Issue (issue) · Idea (idea)">{cat}</Select>
        <div className="between">
          <span className="t-footnote muted">Base category</span>
          <span className="tk-links"><Link toast="Rename type">Rename</Link><Link toast="Type archived">Archive</Link></span>
        </div>
      </div>
    </Section>
  );
}

function TagRow({ tag: [tag, n] }) {
  const right = (
    <span className="row-flex">
      <span className="t-footnote muted">{count(n)}</span>
      <span className="tk-links"><Link toast="Rename tag">Rename</Link><Link toast="Merge tags">Merge</Link><Link toast="Tag deleted">Delete</Link></span>
    </span>
  );
  return <Row title={<Pill tone="outline">{tag}</Pill>} right={right} />;
}

export function TasksSettings() {
  if (useApp().is('member')) {
    return (
      <Screen title="Project settings" back>
        <Empty icon={<Lock size={48} role="img" aria-label="Not available" />} title="Not available for Member"
          text={'Only Admins and this project\'s Manager can manage task types, tags and the "New tasks need review" setting.'} />
      </Screen>
    );
  }
  const tags = tagCounts();
  return (
    <Screen title="Project settings" back>
      <div className="stack xs">
        <h2 className="t-title2">{D.project('atlas').name}</h2>
        <p className="t-footnote muted">Opened from Project detail ⋯ › Project settings. Managers & Admins only.</p>
      </div>
      <Section className="tk-soft">
        <div className="stack sm">
          <div className="between">
            <span className="t-headline">New tasks need review</span>
            <span className="row-flex t-footnote"><span className="bold">Off</span><Switch label="New tasks need review" /></span>
          </div>
          <span className="t-footnote">Off: new tasks finish right away with Mark done. On: tasks must go through Request review. Existing tasks don't change.</span>
          <span className="t-footnote muted">Per task, Managers/Admins can change it. Members can only turn it on.</span>
        </div>
      </Section>
      <section className="stack mt-2">
        <div className="stack xs">
          <div className="between"><h3 className="t-title3">Task types</h3><Btn sm toast="New type">+ Type</Btn></div>
          <p className="t-footnote muted">{TYPES.length} of max. 6 active types · name and category only, does not affect review</p>
        </div>
        {TYPES.map(t => <TypeCard key={t[0]} type={t} />)}
        <p className="t-footnote muted">Types already used by tasks can only be archived, not deleted.</p>
      </section>
      <section className="stack sm mt-2">
        <div className="between"><h3 className="t-title3">Tags</h3><span className="t-footnote muted">{tags.length} tags</span></div>
        <Rows>{tags.map(t => <TagRow key={t[0]} tag={t} />)}</Rows>
      </section>
    </Screen>
  );
}
