/**
 * Catalog of the pages under /dev, used to keep the registered dev routes in sync (tested in
 * tests/console-pages.test.ts and tests/dev-openapi.test.ts). This list used to live in the
 * marketing landing content; the landing is gone, but the route-count guard is worth keeping.
 */

/** Labels of the pages under /dev, in sidebar/route order. */
export const CONSOLE_PAGES = [
  'Overview',
  'Users',
  'Sessions',
  'Posts',
  'API Keys',
  'DB Schema',
  'Spec OpenAPI',
  'Visitor Logs',
  'Login Logs',
  'Rate Limits',
  'Server Logs',
  'Audit Log',
  'File Health',
  'Tools & MCP',
  'Changelog',
  'Settings',
] as const;

/** Routes under /dev that render a page (keep in sync with app/routes.ts; tested). */
export const CONSOLE_PAGE_COUNT = 16;
