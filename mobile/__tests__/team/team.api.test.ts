// The Team requests: what goes to the server, and what the offset paging does with the answers.
import { ApiError } from '../../src/api/errors';
import { getTeam } from '../../src/data/team';
import { teamList, teamPerson, teamQueryKey } from '../../src/data/team.api';
import { serveAppApi, teamBody, teamMember } from '../helpers/team-trash-server';

const PEOPLE = Array.from({ length: 24 }, (_, i) =>
  teamMember({ id: `u-${i}`, name: `Person ${i}` }),
);

const server = serveAppApi(({ path, search }) => {
  if (path === '/api/app/team') {
    const offset = Number(search.get('offset') ?? 0);
    const limit = Number(search.get('limit') ?? 24);
    const q = search.get('q');
    const all = q ? PEOPLE.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : PEOPLE;
    return { body: teamBody(all.slice(offset, offset + limit), { total: all.length + 10 }) };
  }
  if (path === '/api/app/team/u-rina') {
    return { body: { person: { id: 'u-rina', name: 'Rina', jobTitle: null, department: null, email: 'r@k.id' }, projects: [], availability: null, tasksVisible: false } };
  }
  if (path === '/api/app/team/u-gone') {
    return { status: 404, body: { error: 'Tidak ditemukan.', code: 'NOT_FOUND', status: 404 } };
  }
  return { status: 500, body: { error: `no stub for ${path}`, code: 'X', status: 500 } };
});

describe('the list request', () => {
  test('sort and limit always go; an empty search does not', async () => {
    await teamList({ q: '', sort: 'name' }).ensure();
    const asked = server.to('/api/app/team')[0]?.search;
    expect(asked?.get('sort')).toBe('name');
    expect(asked?.get('limit')).toBe('24');
    expect(asked?.get('offset')).toBe('0');
    expect(asked?.has('q')).toBe(false);
  });

  test('a search goes to the server, not to a filter over one page', async () => {
    await teamList({ q: 'Person 1', sort: 'name' }).ensure();
    expect(server.to('/api/app/team')[0]?.search.get('q')).toBe('Person 1');
  });

  test('two queries are two resources, so changing the filter does not reuse the rows', () => {
    expect(teamQueryKey({ q: 'a', sort: 'name' })).not.toBe(teamQueryKey({ q: 'a', sort: 'active' }));
    expect(teamList({ q: 'a', sort: 'name' })).toBe(teamList({ q: 'a', sort: 'name' }));
  });

  test('a second ensure() does not ask again (rule 1)', async () => {
    const list = teamList({ q: '', sort: 'name' });
    await list.ensure();
    await list.ensure();
    expect(server.to('/api/app/team')).toHaveLength(1);
  });
});

describe('load more', () => {
  test('appends the next slice and stops once every matching row is on hand', async () => {
    const list = teamList({ q: '', sort: 'name' });
    await list.ensure();
    expect(getTeam({ q: '', sort: 'name' }, 'pm')?.people).toHaveLength(24);
    expect(getTeam({ q: '', sort: 'name' }, 'pm')?.hasMore).toBe(true);

    await list.more();

    expect(server.to('/api/app/team')[1]?.search.get('offset')).toBe('24');
    // The stub holds 24 people but claims 34, so the second slice is empty and nothing is lost.
    const d = getTeam({ q: '', sort: 'name' }, 'pm');
    expect(d?.people).toHaveLength(24);
    expect(d?.total).toBe(34);
  });

  test('a reload starts again from the first slice rather than appending to it', async () => {
    const list = teamList({ q: '', sort: 'name' });
    await list.ensure();
    await list.more();
    await list.reload();
    expect(list.current()?.rows).toHaveLength(24);
    expect(server.to('/api/app/team').at(-1)?.search.get('offset')).toBe('0');
  });
});

describe('one person', () => {
  test('is held per id, so the person you left is not redrawn as the one you opened', () => {
    expect(teamPerson('u-rina')).toBe(teamPerson('u-rina'));
    expect(teamPerson('u-rina')).not.toBe(teamPerson('u-dodi'));
  });

  test('a 404 is the answer for a hidden account as well as a missing one', async () => {
    const state = await teamPerson('u-gone').ensure();
    expect(state.phase).toBe('failed');
    expect(state.error).toBeInstanceOf(ApiError);
    expect(state.error?.status).toBe(404);
  });
});
