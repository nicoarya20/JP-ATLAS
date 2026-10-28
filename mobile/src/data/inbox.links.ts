/**
 * Where an Inbox card's button goes in the app. The server sends the web path of the page
 * (`server/notification/notification.query.ts` `hrefOf`); this maps the ones the app has a screen
 * for and answers null for the rest, so such a card shows no button rather than one that opens the
 * wrong screen. Who a card is about comes from its `actor`, never from its words.
 */
import type { Href } from 'expo-router';

const ROUTES: readonly [RegExp, (m: RegExpExecArray) => Href][] = [
  [/^\/app\/tasks\/(\d+)$/, (m) => `/tasks/${m[1]}`],
  [/^\/app\/tasks$/, () => '/tasks'],
  [/^\/app\/projects\/([^/?#]+)$/, (m) => `/projects/${m[1]}`],
  [/^\/app\/events\/([^/?#]+)$/, (m) => `/events/${m[1]}`],
  [/^\/dashboard\/users$/, () => '/more/users'],
];

/**
 * The app route of a web path, or null when the app has no screen for it. Unmapped today:
 * `/app/settings` (leave cards: the app has no availability screen) and `/app/inbox` itself.
 */
export function appHref(web: string): Href | null {
  for (const [pattern, to] of ROUTES) {
    const m = pattern.exec(web);
    if (m) return to(m);
  }
  return null;
}
