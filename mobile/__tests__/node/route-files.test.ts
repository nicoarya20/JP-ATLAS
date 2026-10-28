// Every screen id the app still names leads to a real route file: the create targets (the "+" and the Create sheet)
// and the tabs. Typed routes check the hrefs only while .expo/types is fresh; this reads app/ itself.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { CREATE_ROUTES } from '@/navigation/create-href';
import { TABS } from '@/navigation/tabs.config';

const APP = join(__dirname, '../../app');

/** The file expo-router serves for `href` outside a group: `<path>.tsx` or `<path>/index.tsx`. */
const routeFile = (href: string) =>
  [`${href}.tsx`, `${href}/index.tsx`].map((f) => join(APP, f)).find((f) => existsSync(f));

test.each(Object.entries(CREATE_ROUTES))('create target %s (%s) has a route file', (_go, href) => {
  expect(routeFile(href)).toBeDefined();
});

test.each(TABS.map((t) => [t.id, t.route]))(
  'tab %s has a stack and a first screen',
  (_id, route) => {
    const dir = join(APP, '(tabs)', route);
    expect(existsSync(join(dir, '_layout.tsx'))).toBe(true);
    expect(existsSync(join(dir, 'index.tsx'))).toBe(true);
  },
);

test('a href with no file is caught', () => {
  expect(routeFile('/projects/new/story')).toBeUndefined();
});
