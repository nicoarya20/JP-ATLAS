/*
 * Home in one call: `GET /api/app/home` (`server/home/home.service.ts`, the same answer the web
 * loader reads), plus the Inbox count for its one other chip.
 *
 * `getHome()` is **synchronous** (the user's decision, 26 Oct 2026): it reads the store the fetch
 * layer filled and returns null while nothing is there, so the screen shows one loading state
 * instead of the data layer growing a dialect of its own. Every section comes through as the
 * server's `Widget`, so a single failing query costs its own card and nothing else.
 */
import { sessionStore } from '@/session/session.state';
import type { GreetingWire } from './home.api';
import { homeResource, mapWidget, widget } from './home.api';
import { homeAgenda, homeFocus, homeProjects } from './home.focus';
import { homeStats } from './home.stats';
import type { ActivityRow, AskAnswer, DoneTask, HomeData } from './home.types';
import { whenLabel } from './inbox';
import { inboxActionCount } from './inbox.api';
import { viewer } from './viewer';

/**
 * The part of the day the server decided, worded in English (K5: an enum is mapped, a sentence is
 * not). `sore` (15.00-18.00) is still the afternoon in English; `malam` is the evening.
 */
const GREETING: Partial<Record<GreetingWire, string>> = {
  pagi: 'Good morning',
  siang: 'Good afternoon',
  sore: 'Good afternoon',
  malam: 'Good evening',
};

/**
 * The name the greeting and the avatar use: the first word of the signed-in account's name.
 *
 * GAP A-2: the server's own rule for a greeting name (a nickname, else the first word of the
 * display name, `server/profile/profile.greeting.ts`) is not on the wire, and `GET /api/app/profile`
 * belongs to another wave. The account name is the honest stand-in — it is the person's own name,
 * from their own session, not a sample row.
 */
function greetingName(): string {
  const full = sessionStore.get().user?.name?.trim();
  if (!full) return viewer().name;
  return full.split(/\s+/)[0] ?? full;
}

/** Everything Home shows, or null while the payload has not arrived. */
export function getHome(): HomeData | null {
  const wire = homeResource.current();
  if (!wire) return null;
  const focus = widget(wire.focus);
  return {
    me: { name: greetingName() },
    greeting: GREETING[wire.now?.greeting] ?? '',
    stats: homeStats(focus, inboxActionCount()),
    briefing: mapWidget(widget(wire.briefing), (b) => ({
      lines: b.lines,
      updatedLabel: b.updatedLabel,
    })),
    focus: mapWidget(focus, homeFocus),
    // The server always sends its three answers; the prototype's per-role trimming is gone.
    ask: mapWidget(widget(wire.ask), (answers): AskAnswer[] => answers),
    agenda: mapWidget(widget(wire.agenda), homeAgenda),
    projects: mapWidget(widget(wire.projects), homeProjects),
    done: mapWidget(widget(wire.done), (d): DoneTask[] =>
      d.items.map((t) => ({ id: t.id, title: t.title, who: `${t.byName} · ${t.dayLabel}` })),
    ),
    activity: mapWidget(widget(wire.activity), (rows): ActivityRow[] =>
      rows.map((a) => ({ id: a.id, text: a.text, meta: `${a.projectName} · ${whenLabel(a.at)}` })),
    ),
  };
}
