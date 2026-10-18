/** API-key deny list for PM routes (D10): destructive or identity-changing calls stay session-only. */

type Deny = { id: string; method: string | '*'; path: RegExp };

// The id segment is matched loosely (`.*`) so odd slashes in it can never fall through to `app:write`.
export const PM_KEY_DENY: readonly Deny[] = [
  { id: 'DELETE projects/*', method: 'DELETE', path: /^\/api\/app\/projects\/.+/i },
  { id: '* projects/*/members*', method: '*', path: /^\/api\/app\/projects\/.*\/members/i },
  // Handing over the Lead changes who runs the project: an escalation, so session only (S1-03).
  { id: 'PUT projects/*/lead', method: 'PUT', path: /^\/api\/app\/projects\/.*\/lead(?:\/.*)?$/i },
  { id: 'PATCH profile', method: 'PATCH', path: /^\/api\/app\/profile(?:\/.*)?$/i },
  { id: '* avatar', method: '*', path: /^\/api\/app\/avatar(?:\/.*)?$/i },
  // Restoring undoes a delete and brings data back for everyone: as sensitive as the delete (S1-05).
  { id: 'POST trash/*', method: 'POST', path: /^\/api\/app\/trash\/.+/i },
  // Removing a checklist step or a comment is a hard delete (S2-06): keys may add and edit, not remove.
  {
    id: 'DELETE tasks/*/checklist/*',
    method: 'DELETE',
    path: /^\/api\/app\/tasks\/.*\/checklist(?:\/.*)?$/i,
  },
  {
    id: 'DELETE tasks/*/comments/*',
    method: 'DELETE',
    path: /^\/api\/app\/tasks\/.*\/comments(?:\/.*)?$/i,
  },
  // S7 E-06 (Q-E4). Inviting or removing a guest changes who is told about a meeting and who may
  // write its minutes, so it is the event's membership: session only, like a project's members.
  { id: '* events/*/participants*', method: '*', path: /^\/api\/app\/events\/.*\/participants/i },
  // Cancelling tells every guest the meeting is off and they cannot undo it themselves.
  {
    id: 'POST events/*/cancel',
    method: 'POST',
    path: /^\/api\/app\/events\/.*\/cancel(?:\/.*)?$/i,
  },
  // Every delete under /events, so the Trash route of E-07 is covered the moment it exists.
  { id: 'DELETE events/*', method: 'DELETE', path: /^\/api\/app\/events\/.+/i },
];

/** Plugin file in server/api that owns each pattern; the sweep test skips a pattern while its owner is a stub. */
export const PM_DENY_OWNER: Readonly<Record<string, string>> = {
  'DELETE projects/*': 'app-projects.trash.ts', // S1-02 filled app-projects.ts with read routes only; DELETE lands in the trash plugin (S1-05)
  '* projects/*/members*': 'app-projects.members.ts',
  'PUT projects/*/lead': 'app-projects.write.ts',
  'PATCH profile': 'app-profile.ts',
  '* avatar': 'app.ts', // avatar routes are legacy and still live in app.ts
  'POST trash/*': 'app-trash.ts',
  'DELETE tasks/*/checklist/*': 'app-tasks.detail.ts',
  'DELETE tasks/*/comments/*': 'app-tasks.detail.ts',
  '* events/*/participants*': 'app-events.write.ts',
  'POST events/*/cancel': 'app-events.write.ts',
  'DELETE events/*': 'app-events.write.ts', // guest removal today; `DELETE /events/:id` lands here in E-07
};

/** True when an API key may not call this route, whatever scopes it holds. */
export function isPmKeyDenied(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  return PM_KEY_DENY.some((d) => (d.method === '*' || d.method === m) && d.path.test(pathname));
}
