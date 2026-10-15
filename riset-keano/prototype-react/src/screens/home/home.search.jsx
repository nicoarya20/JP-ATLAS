// Home ③ Search / ask: search field with sample query "Atlas", an Ask card and grouped results.
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SearchBar } from '@react-cupertino-ui/search-bar';
import { useApp } from '../../core/app.context';
import { Row, Rows, Screen, Section } from '../../kit';

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
  const { back, toast } = useApp();
  const [q, setQ] = useState(SAMPLE_QUERY);
  const header = (
    <div className="hm-bar">
      <SearchBar value={q} onChangeValue={setQ} onCancel={() => back()} placeholder="Search…" glass={false}
        onVoicePress={() => toast('Listening…')} />
    </div>
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
        <Row title="Atlas sprint review" sub="Fri, Oct 9 · 1:00–2:00 PM · every 2 weeks" go="events.detail-recurring" />
      </Group>
      <p className="t-footnote muted">Search task, project, event, and people names. Tap the mic to ask by voice.</p>
    </Screen>
  );
}

export default HomeSearch;
