// DUMMY: penyimpanan proyek di memori peramban; ganti dengan panggilan API (react-query) saat S1 dibuat.
// Dibuat/ubah/hapus tampak langsung di semua layar, tetapi hilang saat halaman dimuat ulang.
import { useSyncExternalStore } from 'react';
import type { ProjectRole } from './projects.detail.dummy';
import {
  addPerson,
  addProject,
  changeRole,
  extendDue,
  type Failure,
  type ProjectInput,
  type ProjectRecord,
  type Result,
  removePerson,
  restoreProject,
  seedProjects,
  type TrashedProject,
  trashProject,
  updateProject,
} from './projects.logic';

const INITIAL = seedProjects();
let state: ProjectRecord[] = INITIAL;
const NO_TRASH: TrashedProject[] = [];
let trashed: TrashedProject[] = NO_TRASH;
const listeners = new Set<() => void>();

function set(next: ProjectRecord[]) {
  state = next;
  for (const l of listeners) l();
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Applies a reducer result; `null` means it went through, otherwise the reason it did not. */
function apply(r: Result): Failure | null {
  if (!r.ok) return r.code;
  set(r.list);
  return null;
}

/** Every write the screens make. Each one names who did it, so the activity feed reads right. */
export const projectActions = {
  create(input: ProjectInput, creator: string): string {
    const r = addProject(state, input, creator);
    set(r.list);
    return r.id;
  },
  update: (id: string, input: ProjectInput, who: string) =>
    apply(updateProject(state, id, input, who)),
  /** Moves the project to the Trash (kept whole, restorable); false if it is already gone. */
  remove(id: string): boolean {
    const bin = trashProject(state, trashed, id);
    if (!bin) return false;
    trashed = bin.trash;
    set(bin.list);
    return true;
  },
  restore(id: string): boolean {
    const bin = restoreProject(state, trashed, id);
    if (!bin) return false;
    trashed = bin.trash;
    set(bin.list);
    return true;
  },
  extend: (id: string, newDue: string, who: string, reason?: string) =>
    apply(extendDue(state, id, newDue, who, undefined, reason)),
  changeRole: (id: string, name: string, role: ProjectRole, who: string) =>
    apply(changeRole(state, id, name, role, who)),
  addPerson: (id: string, name: string, role: ProjectRole, who: string) =>
    apply(addPerson(state, id, name, role, who)),
  removePerson: (id: string, name: string, who: string) =>
    apply(removePerson(state, id, name, who)),
  /** Back to the three seeded projects; tests use it, and so can a "reset demo" button. */
  reset() {
    trashed = NO_TRASH;
    set(seedProjects());
  },
};

export const getProjects = () => state;
export const getTrashedProjects = () => trashed;

/** The live list of projects; the server and the first client render both see the seed. */
export function useProjects(): ProjectRecord[] {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}

export function useProject(id: string | undefined): ProjectRecord | undefined {
  return useProjects().find((p) => p.id === id);
}

/** Projects in the Trash, newest first; the Sampah page lists them next to the other deleted things. */
export function useTrashedProjects(): TrashedProject[] {
  return useSyncExternalStore(
    subscribe,
    () => trashed,
    () => NO_TRASH,
  );
}
