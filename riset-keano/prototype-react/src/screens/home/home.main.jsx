// Home ①: greeting header with search, stat chips, Daily Briefing, My Focus, Ask Data, Agenda & Projects, activity.
import { useState } from 'react';
import { CircleCheck, Mic, Search, Sparkles } from 'lucide-react';
import { SuggestionChip } from '@react-cupertino-ui/suggestion-chip';
import { useApp, useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Btn, Link, Pill, Progress, Row, Rows, Screen, Section } from '../../kit';
import { Focus, roleHome } from './home.roles';

/** ClickUp-style header: greeting left, avatar right, then a search field that opens Search. */
function HomeHeader() {
  const me = D.me();
  const openSearch = useNav({ go: 'home.search' });
  return (
    <header className="hm-bar">
      <div className="between">
        <h1 className="t-title2">{D.today.greeting}, {me.name}</h1>
        <Avatar name={me.name} />
      </div>
      <button type="button" className="hm-search" onClick={openSearch}>
        <Search size={17} aria-hidden="true" />
        <span className="grow">Search or ask anything…</span>
        <Mic size={17} aria-label="Voice input" />
      </button>
    </header>
  );
}

function StatChip({ s }) {
  return (
    <button type="button" className="hm-stat" onClick={useNav({ go: s.go })}>
      <span className="hm-ico" aria-hidden="true">{s.icon}</span>
      <span className="t-subhead bold">{s.label} <span className="hm-count">{s.count}</span></span>
      <span className={`t-subhead ${s.alert ? 'danger' : 'muted'}`}>{s.sub}</span>
    </button>
  );
}

function AskData({ count }) {
  const H = D.home;
  const [q, setQ] = useState(0);
  return (
    <Section title={<span className="row-flex"><Sparkles size={17} className="tint" /> Ask Data</span>} sub="Ask anything about your projects">
      <div className="row-flex">
        <span className="hm-input grow muted">Type or say a question…</span>
        <Btn kind="primary" toast="Answer generated">Ask</Btn>
      </div>
      <div className="row-flex wrap">
        {H.ask.questions.slice(0, count).map((text, i) => (
          <SuggestionChip key={text} size="sm" variant="secondary" active={i === q} onClick={() => setQ(i)}>{text}</SuggestionChip>
        ))}
      </div>
      <div className="hm-answer stack">
        <p className="t-subhead">{H.ask.answer}</p>
        {H.projects.map(p => <Progress key={p.name} value={p.pct} label={p.name} showValue />)}
      </div>
    </Section>
  );
}

function HomeMain() {
  const { role } = useApp();
  const H = D.home;
  const R = roleHome(role);
  return (
    <Screen header={<HomeHeader />} tab="home">
      <div className="hscroll bleed hm-stats">{R.stats.map(s => <StatChip key={s.label} s={s} />)}</div>

      <Section title={<span className="row-flex"><Sparkles size={17} className="tint" /> Daily Briefing</span>} sub="What do I need to know today?">
        <div className="stack sm">{H.briefing.map(t => <p key={t}>{t}</p>)}</div>
        <p className="t-footnote muted">{H.briefingMeta}</p>
      </Section>

      <Section title="My Focus" sub="What should I work on now?"><Focus role={role} /></Section>

      <AskData count={R.asks} />

      <Section title="Agenda & Projects" sub="Any meetings? How are my projects?">
        <Rows plain>
          <Row lead={<span className="hm-time">{H.agenda.time}</span>} title={H.agenda.title} sub={H.agenda.warn} go="events.detail-upcoming" />
        </Rows>
        <div className="between">
          <h3 className="t-subhead bold">My projects</h3>
          <Link go="projects.list" replace>See all</Link>
        </div>
        <Rows plain>
          {H.projects.map(p => (
            <Row key={p.name} title={p.name} go="projects.overview" right={<Pill>{p.state}</Pill>} chev={false}
              sub={<span className="stack xs"><span>{p.meta}</span><Progress value={p.pct} /></span>} />
          ))}
        </Rows>
      </Section>

      <Section title="Tasks Completed This Week">
        <Rows plain>
          {H.doneThisWeek.slice(0, R.done).map(([t, who]) => (
            <Row key={t} lead={<CircleCheck size={20} className="success" />} title={t} right={<span className="t-footnote muted">{who}</span>} />
          ))}
        </Rows>
        <Link go="tasks.my" replace>See all</Link>
      </Section>

      <Section title="Latest Activity">
        {H.activity.slice(0, R.activity).map(([t, meta]) => (
          <div key={t} className="hm-bullet"><span>{t}</span><span className="t-footnote muted">{meta}</span></div>
        ))}
      </Section>
    </Screen>
  );
}

export default HomeMain;
