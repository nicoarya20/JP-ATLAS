// Which screens show the tab bar (prototype screens rendered with a `tab` prop; docs/phase1-navigation.md §2.6).

/** Screens inside app/(tabs) that show the bar, as their route path below (tabs) without a trailing `index`. */
const BAR_SCREENS = new Set([
  '(home)',
  'tasks',
  'projects',
  'projects/[id]',
  'events',
  'more/inbox',
  'more/team',
  'more/team/[id]',
  'more/archive',
  'more/users',
]);

/**
 * Sheets (formSheet routes) presented over a screen with the bar. The bar stays drawn under them, as in the prototype,
 * instead of dropping out behind the sheet while it slides up.
 */
const BAR_SHEETS = new Set([
  'tasks/filter',
  'projects/filter',
  'projects/[id]/extend',
  'projects/[id]/archive',
  'projects/[id]/task-filter',
  'events/filter',
  'more/archive/[key]/delete',
]);

const TABS_GROUP = '(tabs)';

/**
 * Whether the tab bar shows for the route `segments` (expo-router useSegments). null when the route is not inside
 * app/(tabs) (a root sheet or modal over the tabs): the bar keeps whatever it showed for the screen underneath.
 */
export function tabBarVisibleFor(segments: readonly string[]): boolean | null {
  if (segments[0] !== TABS_GROUP) return null;
  const rest = segments.at(-1) === 'index' ? segments.slice(1, -1) : segments.slice(1);
  const path = rest.join('/');
  return BAR_SCREENS.has(path) || BAR_SHEETS.has(path);
}
