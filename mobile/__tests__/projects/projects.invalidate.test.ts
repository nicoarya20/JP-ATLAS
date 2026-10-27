// What each project write makes stale, and what a refused one leaves alone.
//
// This is the test for §2 of docs/phase2-pola-data.md, and it is here because the failure it guards
// against is invisible. Nothing in this app unmounts: a store that a write forgot to invalidate goes
// on showing the old value on *every* screen still alive, with no error anywhere and no spinner. A
// screen test cannot see that — it renders one screen and the number is right on it. So this reads
// `peek().stale` directly on the resources a write claims to touch.
//
// The symmetric half matters just as much: a **refused** write changed nothing on the server, so
// nothing on screen is out of date, and marking stores stale would send the app refetching to prove
// a change that never happened.
import {
  appWhoami,
  projectDetail,
  projectList,
  projectMembers,
  projectPlan,
} from '@/data/projects.api';
import {
  changeProjectMemberRole,
  extendProjectDeadline,
  removeProjectMember,
  saveProject,
  setPhaseStatus,
  setProjectStatus,
  trashProject,
} from '@/data/projects.api.write';
import { forgetAllResources } from '@/data/resource';

import { serveAuth } from '../helpers/auth-server';
import { projectApiRoutes } from '../helpers/projects-api-server';

const ID = 'atlas';
const LIST_PARAMS = { scope: 'mine' as const, attention: false };

let server: ReturnType<typeof serveAuth> | null = null;

/** Load every store a project write could touch, so `stale` has somewhere to be observed. */
async function loadAll() {
  await Promise.all([
    projectList(LIST_PARAMS).ensure(),
    projectDetail(ID).ensure(),
    projectPlan(ID).ensure(),
    projectMembers(ID).ensure(),
    appWhoami.ensure(),
  ]);
}

const staleness = () => ({
  list: projectList(LIST_PARAMS).peek().stale,
  detail: projectDetail(ID).peek().stale,
  plan: projectPlan(ID).peek().stale,
  members: projectMembers(ID).peek().stale,
});

beforeEach(() => {
  forgetAllResources();
  server = serveAuth(projectApiRoutes());
});

afterEach(() => {
  server?.restore();
  server = null;
});

describe('a successful write names everything it could have changed', () => {
  it('loads clean first, so a later `stale` is the write talking and not the setup', async () => {
    await loadAll();
    expect(staleness()).toEqual({ list: false, detail: false, plan: false, members: false });
  });

  it('a field save makes the project and every list holding it stale', async () => {
    await loadAll();
    await saveProject(ID, { name: 'Atlas v2' });
    const s = staleness();
    expect(s.detail).toBe(true);
    // Any list may hold this row, so they are all named -- one request too many is far cheaper
    // than a name that is quietly wrong on a screen nobody is looking at.
    expect(s.list).toBe(true);
  });

  it('a status change makes the project and the lists stale: it moves in and out of perhatian=1', async () => {
    await loadAll();
    await setProjectStatus(ID, 'on_hold');
    expect(staleness().detail).toBe(true);
    expect(staleness().list).toBe(true);
  });

  it('a member role change makes the member list stale', async () => {
    await loadAll();
    await changeProjectMemberRole(ID, 'u-dodi', 'viewer');
    expect(staleness().members).toBe(true);
  });

  it('a removal makes the member list stale', async () => {
    await loadAll();
    await removeProjectMember(ID, 'u-dodi');
    expect(staleness().members).toBe(true);
  });

  it('an extension makes the project stale, which is where the deadline is read from', async () => {
    await loadAll();
    await extendProjectDeadline(ID, {
      newDueDate: '2026-11-30',
      reasonCategory: 'scope_change',
      reason: 'Client asked',
    });
    expect(staleness().detail).toBe(true);
  });

  it('a phase change makes the plan stale: its task counts feed the project progress', async () => {
    await loadAll();
    await setPhaseStatus(ID, 'ph-2', 'done');
    const s = staleness();
    expect(s.plan).toBe(true);
    expect(s.detail).toBe(true);
  });

  it('trashing the project makes the project and the lists stale', async () => {
    await loadAll();
    await trashProject(ID);
    const s = staleness();
    expect(s.detail).toBe(true);
    expect(s.list).toBe(true);
  });
});

describe('a refused write leaves the stores alone', () => {
  it('a refused member write changes nothing, so nothing is stale', async () => {
    await loadAll();
    server?.use(
      projectApiRoutes({
        memberWrite: () => ({
          status: 409,
          body: { error: 'Manager terakhir tidak bisa dikeluarkan', code: 'LAST_MANAGER' },
        }),
      }),
    );
    await expect(removeProjectMember(ID, 'u-dodi')).rejects.toThrow();
    expect(staleness()).toEqual({ list: false, detail: false, plan: false, members: false });
  });

  it('a refused status change leaves the project and the lists fresh', async () => {
    await loadAll();
    server?.use(
      projectApiRoutes({ failStatus: { status: 422, error: 'Status tidak bisa diubah' } }),
    );
    await expect(setProjectStatus(ID, 'draft')).rejects.toThrow();
    expect(staleness()).toEqual({ list: false, detail: false, plan: false, members: false });
  });

  it('throws the server sentence on, rather than swallowing it (K5)', async () => {
    await loadAll();
    server?.use(
      projectApiRoutes({
        memberWrite: () => ({
          status: 409,
          body: { error: 'Manager terakhir tidak bisa dikeluarkan', code: 'LAST_MANAGER' },
        }),
      }),
    );
    await expect(removeProjectMember(ID, 'u-dodi')).rejects.toThrow(
      'Manager terakhir tidak bisa dikeluarkan',
    );
  });
});

describe('saveProject spans three routes, so a partial save is still a change', () => {
  it('invalidates even when a later route refuses, because the earlier one landed', async () => {
    await loadAll();
    server?.use(
      projectApiRoutes({ failStatus: { status: 422, error: 'Status tidak bisa diubah' } }),
    );
    // Fields first, then status: the PATCH succeeds and the status POST is refused.
    await expect(saveProject(ID, { name: 'Atlas v2', status: 'draft' })).rejects.toThrow();
    // Stale on purpose: the name did change, so the form must reload into what the server has
    // rather than keep showing a value that is now half true.
    expect(staleness().detail).toBe(true);
  });
});
