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
  // Permanent delete is irreversible and Admin-only even in a session (S6, P8 §5): never by key.
  { id: 'DELETE trash/*', method: 'DELETE', path: /^\/api\/app\/trash\/.+/i },
  // Sending a task to the Trash stays session-only too (user decision in
  // `tahapan-proyek/05-implementasi/JADWAL-S3-S8.md` §5 no. 4, answering P8 Q2). Loose on purpose:
  // every delete below a task (the step and comment rules above) is session-only as well.
  { id: 'DELETE tasks/:id', method: 'DELETE', path: /^\/api\/app\/tasks\/.+/i },
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
  // S5a-04. Deleting a phase or milestone and clearing the manual condition are already session only
  // through `DELETE projects/*`; the two writes below are not deletes, so they get their own rules.
  // A manual condition overrides what the numbers say and is what the client is told: a judgment call
  // of the manager, never of a leaked key.
  {
    id: 'POST projects/*/condition-override',
    method: 'POST',
    path: /^\/api\/app\/projects\/.*\/condition-override(?:\/.*)?$/i,
  },
  // Moving the due date changes what was promised to the client. A key may read the history and edit
  // phases, but it does not commit the project to a new date: conservative default, session only.
  {
    id: 'POST projects/*/extend-deadline',
    method: 'POST',
    path: /^\/api\/app\/projects\/.*\/extend-deadline(?:\/.*)?$/i,
  },
];

/** Plugin file in server/api that owns each pattern; the sweep test skips a pattern while its owner is a stub. */
export const PM_DENY_OWNER: Readonly<Record<string, string>> = {
  'DELETE projects/*': 'app-projects.trash.ts', // S1-02 filled app-projects.ts with read routes only; DELETE lands in the trash plugin (S1-05)
  '* projects/*/members*': 'app-projects.members.ts',
  'PUT projects/*/lead': 'app-projects.write.ts',
  'PATCH profile': 'app-profile.ts',
  '* avatar': 'app.ts', // avatar routes are legacy and still live in app.ts
  'POST trash/*': 'app-trash.ts',
  'DELETE trash/*': 'app-trash.ts',
  'DELETE tasks/:id': 'app-tasks.write.ts',
  'DELETE tasks/*/checklist/*': 'app-tasks.detail.ts',
  'DELETE tasks/*/comments/*': 'app-tasks.detail.ts',
  '* events/*/participants*': 'app-events.write.ts',
  'POST events/*/cancel': 'app-events.write.ts',
  'DELETE events/*': 'app-events.write.ts', // guest removal today; `DELETE /events/:id` lands here in E-07
  'POST projects/*/condition-override': 'app-projects.deadline.ts',
  'POST projects/*/extend-deadline': 'app-projects.deadline.ts',
};

/**
 * Deny ids whose route is not registered yet: the denial is in place first (Z-01) and the route
 * lands later in the same S6 slice, so the sweep that asserts "this pattern matches a real route"
 * reports them as skipped instead of failing.
 *
 * TODO(trash): scaffolding, agreed with the S6 coordinator as temporary debt — `DELETE trash/*`
 * must be removed from this list by Z-04 (`DELETE /api/app/trash/:kind/:id`, the task that
 * registers the route), and at the latest by the Z-08 gate, which fails if the list is not empty.
 */
export const PM_DENY_PENDING: readonly string[] = ['DELETE trash/*'];

/** True when an API key may not call this route, whatever scopes it holds. */
export function isPmKeyDenied(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  return PM_KEY_DENY.some((d) => (d.method === '*' || d.method === m) && d.path.test(pathname));
}
