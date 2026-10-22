// Home ② Search / ask: back chevron, search field with sample query "Atlas", an Ask card and grouped results.
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { NavBar, Row, Rows, Screen, Search, Section } from '../../kit';

const SAMPLE_QUERY = 'Atlas';

/** Result group: small heading + inset list. */
function Group({ title, children }) {
  return (
    <div className="stack xs">
      <h2 className="t-footnote muted hm-label">{title}</h2>
      <Rows>{children}</Rows>
    </div>
  );
}

function HomeSearch() {
  const { toast } = useApp();
  const [q, setQ] = useState(SAMPLE_QUERY);
  // The search bar has no Cancel any more, so the way back is the nav bar chevron; a press outside keeps the query.
  const header = (
    <>
      <NavBar back title="Search" />
      <div className="hm-bar">
        <Search value={q} onChangeValue={setQ} keep placeholder="Search…" showVoice onVoicePress={() => toast('Listening…')} />
      </div>
    </>
  );
  return (
    <Screen header={header}>
      <Section toast="Answer generated" title={<span className="row-flex"><Sparkles size={17} className="tint" /> Ask: “{q}”</span>}
        sub="Answers from your project data, like Ask Data" />
      <Group title="Tasks">
        <Row title="#12 Fix SSO login" sub="Atlas Project · In progress · 2 days overdue" go="tasks.detail-progress" task={12} />
        <Row title="#14 Write the API spec" sub="Atlas Project · To do · Today" go="tasks.detail-todo" task={14} />
      </Group>
      <Group title="Projects">
        <Row title="Atlas Project" sub="Lead Nico · 70% · Due Oct 31" go="projects.overview" />
      </Group>
      <Group title="Events">
        <Row title="Atlas sprint review" sub="Fri, Oct 9 · 1:00–2:00 PM · every 2 weeks" go="events.detail-recurring" params={{ event: 'sprint' }} />
      </Group>
      <p className="t-footnote muted">Search task, project, event, and people names. Tap the mic to ask by voice.</p>
    </Screen>
  );
}

export default HomeSearch;
