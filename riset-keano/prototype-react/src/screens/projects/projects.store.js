// Project changes: the detail ⋯ › Edit project form writes its fields into the sample project, and Move to Archive takes
// the project (with its tasks) out of every list into Archive until Undo, so the list, the detail and Archive show them.
// Readers re-render through useProjectChanges(); a page reload brings the sample back.
import { useSyncExternalStore } from 'react';
import { D } from '../../data/sample';
import { TODAY_LABEL, putTasksBack, renameProjectTasks, takeProjectTasks } from '../tasks/tasks.store';

const ORIGINAL = structuredClone(D.projects);
const ORIGINAL_ATLAS = { started: D.atlas.started, activity: structuredClone(D.atlas.activity) };
/** Tasks each archived project took along (project id → takeProjectTasks pairs), for Undo. */
const held = new Map();
let version = 0;
const listeners = new Set();
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => { version += 1; listeners.forEach(fn => fn()); };

const count = n => `${n} task${n === 1 ? '' : 's'}`;

/**
 * Save the Edit project form for project id. fields = D.projects keys (name, desc, lead, status, priority, due) plus
 * started (kept in D.atlas for Atlas). A new name carries over to the project's tasks; Atlas logs the edit in its activity.
 */
export function editProject(id, { started, ...fields }, editor) {
  const p = D.project(id);
  if (!p) throw new Error(`Cannot edit project "${id}": no such project`);
  const from = p.name;
  Object.assign(p, fields);
  if (fields.due) p.dueLong = `${fields.due}, ${D.today.date.slice(-4)}`;
  if (fields.name && fields.name !== from) renameProjectTasks(from, fields.name);
  if (id === 'atlas') {
    if (started) D.atlas.started = started;
    D.atlas.activity.unshift([`${editor} edited the project`, TODAY_LABEL]);
  }
  notify();
}

/** Move project id to Archive with its listed tasks; Archive lists it as archived by `by`, with what it took along. */
export function archiveProject(id, by) {
  const i = D.projects.findIndex(p => p.id === id);
  if (i < 0) throw new Error(`Cannot archive project "${id}": not in the project list`);
  const [p] = D.projects.splice(i, 1);
  D.archivedProjects.push(p);
  const taken = takeProjectTasks(p.name);
  held.set(id, { at: i, taken });
  D.archive.unshift({ kind: 'PROJECT', title: p.name, where: 'Project', by, date: TODAY_LABEL, includes: count(taken.length), project: id });
  notify();
}

/** Undo / Restore of archived project id: back in the list where it was, with the tasks it took along. */
export function restoreProject(id) {
  const e = D.archive.findIndex(a => a.project === id);
  const a = D.archivedProjects.findIndex(p => p.id === id);
  if (e < 0 || a < 0 || !held.has(id)) throw new Error(`Cannot restore project "${id}": not in Archive`);
  D.archive.splice(e, 1);
  const { at, taken } = held.get(id);
  held.delete(id);
  D.projects.splice(Math.min(at, D.projects.length), 0, D.archivedProjects.splice(a, 1)[0]);
  putTasksBack(taken);
  notify();
}

/** Tasks of project id, counted for the Move to Archive sheet. */
export const taskCountOf = id => count(D.tasks.filter(t => t.project === D.project(id).name).length);

/** Every project back to the sample; archived ones come back (their tasks come back with resetTasks). test-only */
export function resetProjects() {
  D.projects.splice(0, D.projects.length, ...structuredClone(ORIGINAL));
  D.archivedProjects.length = 0;
  D.archive.splice(0, D.archive.length, ...D.archive.filter(a => a.project == null));
  held.clear();
  Object.assign(D.atlas, structuredClone(ORIGINAL_ATLAS));
  notify();
}

/** Re-render the caller after every project change; returns a counter that changes per change. */
export const useProjectChanges = () => useSyncExternalStore(subscribe, () => version);
