/** API-key deny list for PM routes (D10): destructive or identity-changing calls stay session-only. */

type Deny = { id: string; method: string | '*'; path: RegExp };

// The id segment is matched loosely (`.*`) so odd slashes in it can never fall through to `app:write`.
export const PM_KEY_DENY: readonly Deny[] = [
  { id: 'DELETE projects/*', method: 'DELETE', path: /^\/api\/app\/projects\/.+/i },
  { id: '* projects/*/members*', method: '*', path: /^\/api\/app\/projects\/.*\/members/i },
  { id: 'PATCH profile', method: 'PATCH', path: /^\/api\/app\/profile(?:\/.*)?$/i },
  { id: '* avatar', method: '*', path: /^\/api\/app\/avatar(?:\/.*)?$/i },
];

/** Plugin file in server/api that owns each pattern; the sweep test skips a pattern while its owner is a stub. */
export const PM_DENY_OWNER: Readonly<Record<string, string>> = {
  'DELETE projects/*': 'app-projects.trash.ts', // S1-02 filled app-projects.ts with read routes only; DELETE lands in the trash plugin (S1-05)
  '* projects/*/members*': 'app-projects.members.ts',
  'PATCH profile': 'app-profile.ts',
  '* avatar': 'app.ts', // avatar routes are legacy and still live in app.ts
};

/** True when an API key may not call this route, whatever scopes it holds. */
export function isPmKeyDenied(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  return PM_KEY_DENY.some((d) => (d.method === '*' || d.method === m) && d.path.test(pathname));
}
