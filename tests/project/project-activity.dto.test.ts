/** Activity sentences (S5a-03): Indonesian wording per action, the deleted-account label and the safe fallback. */
import { describe, expect, it } from 'bun:test';
import {
  actorLabel,
  describeActivity,
  mentionedUserIds,
  toActivityItem,
} from '../../server/project/project-activity.dto';

const names = new Map([['u2', 'Budi']]);

describe('describeActivity', () => {
  it.each([
    [
      'deadline.extended',
      { from: '2030-10-15', to: '2030-10-31', category: 'resource' },
      'Nico memperpanjang tenggat 15 Okt → 31 Okt',
    ],
    [
      'deadline.extended',
      { from: '2030-12-20', to: '2031-01-10' },
      'Nico memperpanjang tenggat 20 Des 2030 → 10 Jan 2031',
    ],
    ['created', { status: 'draft' }, 'Nico membuat proyek ini'],
    ['updated', { fields: ['name'] }, 'Nico mengubah keterangan proyek'],
    [
      'status_changed',
      { from: 'draft', to: 'active' },
      'Nico mengubah status proyek menjadi Berjalan',
    ],
    ['lead_changed', { from: 'u1', to: 'u2' }, 'Nico menjadikan Budi sebagai Pengelola utama'],
    ['trashed', { tasks: 3 }, 'Nico memindahkan proyek ke Sampah'],
    ['restored', { tasks: 3 }, 'Nico memulihkan proyek dari Sampah'],
    [
      'member_added',
      { userId: 'u2', role: 'member' },
      'Nico menambahkan Budi ke proyek sebagai Anggota',
    ],
    [
      'member_role_changed',
      { userId: 'u2', from: 'member', to: 'manager' },
      'Nico mengubah peran Budi menjadi Pengelola',
    ],
    ['member_removed', { userId: 'u2', role: 'member' }, 'Nico mengeluarkan Budi dari proyek'],
    [
      'condition.overridden',
      { condition: 'at_risk' },
      'Nico mengatur kondisi proyek secara manual menjadi Perlu perhatian',
    ],
    ['condition.override_cleared', {}, 'Nico menghapus kondisi manual proyek'],
    ['phase.created', { name: 'Persiapan' }, 'Nico menambahkan fase Persiapan'],
    ['phase.finished', { name: 'Persiapan' }, 'Nico menyelesaikan fase Persiapan'],
    [
      'milestone.reached',
      { title: 'Peluncuran' },
      'Nico menandai milestone Peluncuran sudah tercapai',
    ],
    ['milestone.deleted', {}, 'Nico menghapus milestone'],
  ])('%s reads as a plain sentence', (action, payload, expected) => {
    expect(describeActivity(action, payload, 'Nico', names)).toBe(expected);
  });

  it('names a removed or unknown person generically instead of an id', () => {
    expect(describeActivity('member_removed', { userId: 'gone' }, 'Nico', names)).toBe(
      'Nico mengeluarkan seorang anggota dari proyek',
    );
  });

  it.each([
    ['an unknown action', 'something.new', { x: 1 }],
    ['a phase action it does not know', 'phase.teleported', { name: 'A' }],
    ['a null payload', 'deadline.extended', null],
    ['a payload of the wrong type', 'status_changed', 'oops'],
    ['an unknown status', 'status_changed', { to: 'zzz' }],
  ])('never throws on %s', (_n, action, payload) => {
    const out = describeActivity(action, payload, 'Nico', names);
    expect(out.startsWith('Nico ')).toBe(true);
  });

  it('falls back to "Seseorang" when no name was ever kept', () => {
    expect(describeActivity('created', {}, null)).toBe('Seseorang membuat proyek ini');
  });
});

describe('actor label', () => {
  it('adds "(akun dihapus)" only once the account id is gone', () => {
    expect(actorLabel('u1', 'Nico')).toBe('Nico');
    expect(actorLabel(null, 'Nico')).toBe('Nico (akun dihapus)');
    expect(actorLabel(null, null)).toBeNull();
  });

  it('flows into the item and its sentence', () => {
    const item = toActivityItem(
      {
        id: 'a1',
        action: 'trashed',
        payload: {},
        actorId: null,
        actorName: 'Nico',
        createdAt: new Date('2030-01-01T00:00:00Z'),
      },
      new Map(),
    );
    expect(item).toEqual({
      id: 'a1',
      action: 'trashed',
      text: 'Nico (akun dihapus) memindahkan proyek ke Sampah',
      actorId: null,
      actorName: 'Nico (akun dihapus)',
      createdAt: '2030-01-01T00:00:00.000Z',
    });
  });
});

describe('mentionedUserIds', () => {
  it('lists the person a sentence names, nothing for other actions', () => {
    expect(mentionedUserIds('member_added', { userId: 'u2' })).toEqual(['u2']);
    expect(mentionedUserIds('lead_changed', { to: 'u3' })).toEqual(['u3']);
    expect(mentionedUserIds('trashed', { userId: 'u2' })).toEqual([]);
    expect(mentionedUserIds('member_added', null)).toEqual([]);
  });
});
