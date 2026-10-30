/** Root SSR: the text-size cookie sets Mantine's scale and the document language is Indonesian. */
import { afterAll, afterEach, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
  UNSAFE_FrameworkContext,
  useLoaderData,
} from 'react-router';
import * as root from '../app/root';
import * as branding from '../server/settings-branding';

const spyBranding = () =>
  spyOn(branding, 'getBranding').mockResolvedValue({
    appName: 'Simple PM',
    appTagline: 'Simple Project Management',
    supportUrl: null,
  });
let getBranding: ReturnType<typeof spyBranding>;
// Installed and restored around this file: a spy created at import time stays live for every file that runs later.
beforeAll(() => {
  getBranding = spyBranding();
});
afterEach(() => getBranding.mockClear());
afterAll(() => getBranding.mockRestore());

// Mantine serialises `name: value;` (with a space), so match the declaration, not a fixed string.
const SCALE_1_5 = /--mantine-scale:\s*1\.5;/;

// Minimal stand-in for the context the framework provides to <Meta/>, <Links/> and <Scripts/>.
const frameworkContext = {
  manifest: {
    routes: {
      root: { id: 'root', path: '/', hasLoader: true, module: '/root.js', imports: [] },
      page: { id: 'page', parentId: 'root', index: true, module: '/page.js', imports: [] },
    },
    entry: { module: '/entry.js', imports: [] },
    url: '/manifest.js',
    version: 'test',
  },
  routeModules: { root },
  future: {},
  isSpaMode: false,
  ssr: true,
  routeDiscovery: { mode: 'initial' },
  serverHandoffString: '{}',
} as never;

/** Renders the real root loader, Layout and App the way the framework nests them, minus Vite. */
async function renderRoot(cookie?: string) {
  function Root() {
    const loaderData = useLoaderData() as Awaited<ReturnType<typeof root.loader>>;
    return createElement(root.Layout, null, createElement(root.default, { loaderData } as never));
  }
  const routes = [
    {
      id: 'root',
      path: '/',
      loader: root.loader,
      Component: Root,
      children: [{ id: 'page', index: true, Component: () => createElement('main', null, 'isi') }],
    },
  ];
  const request = new Request('http://localhost/', cookie ? { headers: { cookie } } : undefined);
  const handler = createStaticHandler(routes as never);
  const context = await handler.query(request);
  if (context instanceof Response) throw new Error(`unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(
    createElement(
      UNSAFE_FrameworkContext.Provider,
      { value: frameworkContext },
      createElement(StaticRouterProvider, { router, context, hydrate: false }),
    ),
  );
}

describe('root text size (SSR)', () => {
  it('renders --mantine-scale: 1.5 and lang="id" for mk-text-size=sangat_besar', async () => {
    const html = await renderRoot('mk-text-size=sangat_besar');
    expect(html).toContain('lang="id"');
    expect(html).toMatch(SCALE_1_5);
  });

  it('renders --mantine-scale: 1.25 for besar', async () => {
    expect(await renderRoot('mk-text-size=besar')).toMatch(/--mantine-scale:\s*1\.25;/);
  });

  it('keeps the default scale (no override) for normal, an unknown value and no cookie', async () => {
    for (const cookie of ['mk-text-size=normal', 'mk-text-size=huge', undefined]) {
      const html = await renderRoot(cookie);
      expect(html).toContain('lang="id"');
      // rem() values read var(--mantine-scale); only a declaration would be an override.
      expect(html).not.toMatch(/--mantine-scale:/);
    }
  });

  it('mounts the accessible theme: contrast-fixed variables and the status palette', async () => {
    const html = await renderRoot();
    expect(html).toMatch(/--mantine-color-dimmed:\s*var\(--mantine-color-gray-7\)/);
    expect(html).toContain('--mantine-color-danger-8');
  });

  it('loads the user text size in the root loader without a session cookie lookup', async () => {
    const data = await root.loader({
      request: new Request('http://localhost/', { headers: { cookie: 'mk-text-size=besar' } }),
    } as never);
    expect(data.textSize).toBe('besar');
    expect(data.branding.appName).toBe('Simple PM');
  });
});
