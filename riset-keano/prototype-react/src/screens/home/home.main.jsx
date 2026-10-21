// Home ①: greeting header with search, stat chips, Daily Briefing, My Focus, Ask Data, Agenda & Projects, activity.
import { useState } from 'react';
import { CircleCheck, Mic, Search, Sparkles } from 'lucide-react';
import { SuggestionChip } from '@react-cupertino-ui/suggestion-chip';
import { useApp, useNav } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Btn, Link, Progress, Row, Rows, Screen, Section } from '../../kit';
import { useSearchCollapse } from './home.collapse';
import { AgendaProjects, Focus } from './home.focus';
import { roleHome } from './home.roles';

/** ClickUp-style header: greeting left, avatar right. The search icon beside the avatar shows once the search bar has
 *  been scrolled away (collapsed); only one of the two is reachable at a time. */
function HomeHeader({ collapsed, openSearch }) {
  const me = D.me();
  return (
    <header className="hm-head between">
      <h1 className="t-title2">{D.today.greeting}, {me.name}</h1>
      <div className="row-flex">
        <button type="button" className="hm-find-ico" aria-label="Search" aria-hidden={!collapsed}
          inert={collapsed ? undefined : ''} onClick={openSearch}>
          <Search size={20} aria-hidden="true" />
        </button>
        <Avatar name={me.name} />
      </div>
    </header>
  );
}

/** Search field that opens Search. It scrolls with the content; the sheet below pushes it up as it fades and shrinks. */
function HomeSearch({ blockRef, collapsed, openSearch }) {
  return (
    <div ref={blockRef} className="hm-find" aria-hidden={collapsed} inert={collapsed ? '' : undefined}>
      <button type="button" className="hm-search" onClick={openSearch}>
        <Search size={17} aria-hidden="true" />
        <span className="grow">Search or ask anything…</span>
        <Mic size={17} aria-label="Voice input" />
      </button>
    </div>
  );
}

function StatChip({ s }) {
  return (
    <button type="button" className="hm-stat" onClick={useNav({ go: s.go })}>
      <span className="hm-ico" aria-hidden="true">{s.icon}</span>
      <span className="t-subhead bold">{s.label}{s.count != null && <> <span className="hm-count">{s.count}</span></>}</span>
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
        <Btn kind="outline" toast="Answer generated">Ask</Btn>
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
  const [blockRef, collapsed] = useSearchCollapse();
  const openSearch = useNav({ go: 'home.search' });
  return (
    <Screen header={<HomeHeader collapsed={collapsed} openSearch={openSearch} />} tab="home" className="hm-scroll">
      <HomeSearch blockRef={blockRef} collapsed={collapsed} openSearch={openSearch} />
      <div className="hm-sheet">
        <div className="hscroll bleed hm-stats">{R.stats.map(s => <StatChip key={s.label} s={s} />)}</div>

        <Section title={<span className="row-flex"><Sparkles size={17} className="tint" /> Daily Briefing</span>} sub="What do I need to know today?">
          <div className="stack sm">{H.briefing.map(t => <p key={t}>{t}</p>)}</div>
          <p className="t-footnote muted">{H.briefingMeta}</p>
        </Section>

        <Section title="My Focus" sub="What should I work on now?"><Focus role={role} /></Section>

        <AskData count={R.asks} />

        <Section title="Agenda & Projects" sub="Any meetings? How are my projects?"><AgendaProjects role={role} /></Section>

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
      </div>
    </Screen>
  );
}

export default HomeMain;
