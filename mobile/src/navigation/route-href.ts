import type { Href } from 'expo-router';

/**
 * A route the root or a tab Stack registers but whose file a module worker adds later in Phase 1. Typed routes only know
 * route files that exist, so the path is widened to Href here, in one place; drop a caller once its route file lands.
 */
export const routeHref = (path: string): Href => path as Href;
