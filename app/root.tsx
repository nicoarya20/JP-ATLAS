import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/nprogress/styles.css';
// After Mantine's sheets: it ties their specificity and relies on source order (S0B-24).
import './lib/theme.css';

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { getBranding } from '@server/settings-branding';
import { TEXT_SCALE } from '@server/text-size';
import { resolveTextSize } from '@server/text-size.loader';
import 'dayjs/locale/id';
import { useEffect, useMemo } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import type { Route } from './+types/root';
import { ErrorPage } from './components/errors/ErrorPage';
import { RouteProgress } from './components/RouteProgress';
import { DATES_LOCALE, FIRST_DAY_OF_WEEK } from './lib/date-config';
import { describeError, ERROR_TITLE_SUFFIX } from './lib/error-page';
import { QueryProvider } from './lib/query';
import { buildTheme } from './lib/theme';
import { DARK, LIGHT } from './lib/theme-tokens';
import { cssVariablesResolver } from './lib/theme-vars';
import { rememberTimeZone, requestClock } from './lib/time-format';

/** Branding for the title fallback (cached), the SSR/hydration clock and the user's text size. */
export async function loader({ request }: Route.LoaderArgs) {
  const [branding, textSize] = await Promise.all([getBranding(), resolveTextSize(request)]);
  return { branding, clock: requestClock(request), textSize };
}

export function meta({ loaderData, error }: Route.MetaArgs) {
  const name = loaderData?.branding.appName ?? 'Simple PM';
  const tagline = loaderData?.branding.appTagline ?? 'Simple Project Management';
  // Error boundaries reuse the root meta: a 404 must not be titled like the home page.
  if (error) {
    const info = describeError(error);
    return [
      { title: `${info.status} ${info.title}${ERROR_TITLE_SUFFIX}` },
      { name: 'robots', content: 'noindex' },
    ];
  }
  return [
    { title: name },
    {
      name: 'description',
      content: `${name} — ${tagline}. Bun + Elysia + React Router SSR + Drizzle + Better Auth.`,
    },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" {...mantineHtmlProps}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content={DARK.canvas} />
        <Meta />
        <Links />
        {/*
          ColorSchemeScript runs synchronously (blocking) in <head> and sets
          data-mantine-color-scheme on <html> BEFORE first paint. Its
          defaultColorScheme must match MantineProvider's to avoid a flip.
        */}
        <ColorSchemeScript defaultColorScheme="auto" />
        {/*
          Anti-FOUC: paint the correct background at first paint, before the
          main Mantine stylesheet is applied (in dev Vite injects that CSS via
          JS after paint, which otherwise causes a white flash on hard reload).
          The attribute above is already set by ColorSchemeScript at this point.
        */}
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static anti-FOUC CSS
          dangerouslySetInnerHTML={{
            __html: `
:root { color-scheme: light; background-color: ${LIGHT.canvas}; }
:root[data-mantine-color-scheme='dark'] { color-scheme: dark; background-color: ${DARK.canvas}; }
:root[data-mantine-color-scheme='light'] { color-scheme: light; background-color: ${LIGHT.canvas}; }
html, body { background-color: inherit; }

/* ThemeToggle: two variants always in DOM; CSS picks the visible one.
   ColorSchemeScript sets data-mantine-color-scheme before first paint,
   so the correct button is shown from the very first pixel — no flash. */
[data-mantine-color-scheme='dark'] .mk-cs-light { display: none !important; }
[data-mantine-color-scheme='light'] .mk-cs-dark  { display: none !important; }
:root:not([data-mantine-color-scheme]) .mk-cs-dark { display: none !important; }
`,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  useEffect(rememberTimeZone, []);
  // Memoised: a new theme object per render would re-resolve every CSS variable.
  const theme = useMemo(() => buildTheme(TEXT_SCALE[loaderData.textSize]), [loaderData.textSize]);
  return (
    <QueryProvider>
      <MantineProvider
        theme={theme}
        cssVariablesResolver={cssVariablesResolver}
        defaultColorScheme="auto"
      >
        <RouteProgress />
        <Notifications position="top-right" />
        <DatesProvider settings={{ locale: DATES_LOCALE, firstDayOfWeek: FIRST_DAY_OF_WEEK }}>
          <ModalsProvider>
            <Outlet />
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
    </QueryProvider>
  );
}

/** Last-resort boundary (no app shell): 404s, loader failures, render crashes. */
export function ErrorBoundary({ error, loaderData }: Route.ErrorBoundaryProps) {
  return <ErrorPage error={error} appName={loaderData?.branding.appName} />;
}
