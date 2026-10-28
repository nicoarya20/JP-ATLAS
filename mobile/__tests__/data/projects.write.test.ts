// The project writes against a stubbed `/api/app/projects*`: what each sends (method, path, body), in the order the
// server needs (fields, status, Lead), what it marks stale only once the server took it, and the forms' rules
// (only what changed is sent, who may lead, the create body). The screens are in __tests__/projects/.
import {
  projectMembersResource,
  projectResource,
  projectsResource,
} from '../../src/data/projects.api';
import { editChange, getEditForm, getLeadChoices } from '../../src/data/projects.form';
import { searchPeople } from '../../src/data/projects.picker.api';
import {
  addMember,
  removeMember,
  restoreProject,
  saveProject,
  setMemberRole,
  setPhaseStatus,
  trashProject,
} from '../../src/data/projects.write';
import { forgetAllResources } from '../../src/data/resource';
import { createBody } from '../../src/screens/projects/new/form-submit';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import {
  atlasDetail,
  atlasItem,
  atlasMembers,
  page,
  query,
  recording,
  type Sent,
} from '../helpers/projects-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
let sent: Sent[] = [];
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};
/** How many times `path` was read: every request to it but the writes `recording` wrote down. */
const reads = (path: string) =>
  (server?.calls ?? []).filter((u) => new URL(u).pathname === path).length -
  sent.filter((s) => s.path === path).length;

beforeEach(() => {
  forgetAllResources();
  sent = [];
});
afterEach(() => {
  server?.restore();
  server = null;
});

const DETAIL = '/api/app/projects/p-atlas';
const reads200 = () => ({
  '/api/app/projects/p-atlas/members': { body: atlasMembers() },
  '/api/app/projects?': { body: page([atlasItem()]) },
});

describe('saveProject', () => {
  test('fields, then status, then the Lead; the detail and list are read again', async () => {
    serve({
      ...reads200(),
      '/p-atlas/status': recording(sent, { body: atlasDetail() }),
      '/p-atlas/lead': recording(sent, { body: atlasDetail() }),
      [DETAIL]: (url, init) =>
        init?.method === 'PATCH'
          ? recording(sent, { body: atlasDetail() })(url, init)
          : { body: atlasDetail() },
    });
    await projectResource('p-atlas').ensure();
    await projectsResource.ensure();
    await saveProject('p-atlas', {
      fields: { name: 'Atlas v2' },
      status: 'on_hold',
      leadId: 'u-rina',
    });
    expect(sent).toEqual([
      { method: 'PATCH', path: DETAIL, body: { name: 'Atlas v2' } },
      { method: 'POST', path: `${DETAIL}/status`, body: { status: 'on_hold' } },
      { method: 'PUT', path: `${DETAIL}/lead`, body: { userId: 'u-rina' } },
    ]);
    expect(reads(DETAIL)).toBe(2);
    expect(reads('/api/app/projects')).toBe(2);
  });

  test('a refused status stops before the Lead, is thrown, and what was saved is still read again', async () => {
    serve({
      '/p-atlas/status': recording(sent, {
        status: 422,
        body: { error: 'Status tidak valid.', code: 'VALIDATION' },
      }),
      '/p-atlas/lead': recording(sent),
      [DETAIL]: (url, init) =>
        init?.method === 'PATCH'
          ? recording(sent, { body: atlasDetail() })(url, init)
          : { body: atlasDetail() },
    });
    await projectResource('p-atlas').ensure();
    await expect(
      saveProject('p-atlas', { fields: { priority: 'low' }, status: 'active', leadId: 'u-rina' }),
    ).rejects.toMatchObject({ code: 'VALIDATION', message: 'Status tidak valid.' });
    expect(sent.map((s) => s.method)).toEqual(['PATCH', 'POST']);
    expect(reads(DETAIL)).toBe(2);
  });

  test('a refused first step marks nothing stale', async () => {
    serve({
      [DETAIL]: (url, init) =>
        init?.method === 'PATCH'
          ? recording(sent, { status: 403, body: { error: 'Tidak boleh.', code: 'FORBIDDEN' } })(
              url,
              init,
            )
          : { body: atlasDetail() },
    });
    await projectResource('p-atlas').ensure();
    await expect(saveProject('p-atlas', { fields: { name: 'X' } })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(reads(DETAIL)).toBe(1);
  });
});

describe('the edit form', () => {
  test('only what changed is sent; a cleared description is null; no Lead change without a Lead', async () => {
    serve({ [DETAIL]: { body: atlasDetail() } });
    await projectResource('p-atlas').ensure();
    const from = getEditForm('p-atlas');
    if (!from) throw new Error('the detail was not read');
    expect(editChange(from, from)).toEqual({});
    expect(
      editChange(from, { ...from, name: ' Atlas v2 ', description: '  ', status: 'completed' }),
    ).toEqual({ fields: { name: 'Atlas v2', description: null }, status: 'completed' });
    expect(editChange({ ...from, leadId: 'u-nico' }, { ...from, leadId: null })).toEqual({});
  });

  test('who may lead: the Managers once the members are in, the current Lead before', async () => {
    serve({
      '/api/app/projects/p-atlas/members': {
        body: {
          items: [
            ...atlasMembers().items,
            { ...atlasMembers().items[1], userId: 'u-sari', name: 'Sari Dewi', role: 'manager' },
          ],
        },
      },
      [DETAIL]: { body: atlasDetail() },
    });
    await projectResource('p-atlas').ensure();
    expect(getLeadChoices('p-atlas')).toEqual([{ value: 'u-nico', label: 'Nico Pratama' }]);
    await projectMembersResource('p-atlas').ensure();
    expect(getLeadChoices('p-atlas').map((c) => c.label)).toEqual(['Nico Pratama', 'Sari Dewi']);
  });
});

describe('Trash and its Undo', () => {
  test('DELETE forgets the detail (a 404 now) and reads the list again; restore posts to the Trash', async () => {
    serve({
      '/api/app/projects?': { body: page([atlasItem()]) },
      '/api/app/trash/project/p-atlas/restore': recording(sent, {
        body: { id: 'p-atlas', tasks: 10 },
      }),
      [DETAIL]: (url, init) =>
        init?.method === 'DELETE'
          ? recording(sent, { body: { id: 'p-atlas', tasks: 10 } })(url, init)
          : { body: atlasDetail() },
    });
    await projectResource('p-atlas').ensure();
    await projectsResource.ensure();
    await expect(trashProject('p-atlas')).resolves.toEqual({ id: 'p-atlas', tasks: 10 });
    expect(projectResource('p-atlas').peek().phase).toBe('empty');
    expect(reads(DETAIL)).toBe(1);
    expect(reads('/api/app/projects')).toBe(2);
    await restoreProject('p-atlas');
    expect(sent).toEqual([
      { method: 'DELETE', path: DETAIL, body: undefined },
      { method: 'POST', path: '/api/app/trash/project/p-atlas/restore', body: undefined },
    ]);
  });
});

describe('members and phases', () => {
  test('add, change role, remove and a phase step send what the server takes', async () => {
    const log = recording(sent, { body: { items: [] } });
    serve({ '/api/app/projects/p-atlas/': log });
    await addMember('p-atlas', 'u-sari', 'viewer');
    await setMemberRole('p-atlas', 'u-rina', 'manager');
    await removeMember('p-atlas', 'u-rina');
    await setPhaseStatus('p-atlas', 'ph-2', 'done');
    expect(sent).toEqual([
      { method: 'POST', path: `${DETAIL}/members`, body: { userId: 'u-sari', role: 'viewer' } },
      { method: 'PATCH', path: `${DETAIL}/members/u-rina`, body: { role: 'manager' } },
      { method: 'DELETE', path: `${DETAIL}/members/u-rina`, body: undefined },
      { method: 'PATCH', path: `${DETAIL}/phases/ph-2`, body: { status: 'done' } },
    ]);
  });

  test('the people picker: a trimmed name, the project, the server default limit', async () => {
    const s = serve({ '/api/app/team/picker': { body: { items: [] } } });
    await searchPeople('  sari ', 'p-atlas');
    await searchPeople('');
    expect(s.calls.map(query)).toEqual([
      { limit: '20', q: 'sari', projectId: 'p-atlas' },
      { limit: '20' },
    ]);
  });
});

describe('the create body', () => {
  const base = {
    name: ' Leave app ',
    description: ' ',
    status: 'active' as const,
    priority: 'medium' as const,
    startDate: '2026-10-07',
    dueDate: '2026-11-07',
  };

  test('the creator leading is not sent; blanks are left out', () => {
    expect(createBody('u-nico', { ...base, leadId: 'u-nico', picked: [] })).toEqual({
      name: 'Leave app',
      status: 'active',
      priority: 'medium',
      startDate: '2026-10-07',
      dueDate: '2026-11-07',
    });
  });

  test('another Lead is sent, and goes as a Manager whatever role was picked', () => {
    const picked = [
      { id: 'u-sari', name: 'Sari Dewi', role: 'member' as const },
      { id: 'u-budi', name: 'Budi Santoso', role: 'viewer' as const },
    ];
    expect(createBody('u-nico', { ...base, leadId: 'u-sari', picked })).toMatchObject({
      leadId: 'u-sari',
      members: [
        { userId: 'u-sari', role: 'manager' },
        { userId: 'u-budi', role: 'viewer' },
      ],
    });
  });
});
