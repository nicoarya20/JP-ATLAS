/** Name matching (A1): the code decides who a name means, and says "ambiguous" instead of guessing. */
import { describe, expect, it } from 'bun:test';
import { cleanName, matchMember, normalizeName } from '../../server/ai/task-draft.members';

const rina1 = { id: 'u1', name: 'Rina Wulandari' }; // test-only
const rina2 = { id: 'u2', name: 'Rina Pratiwi' }; // test-only
const dodi = { id: 'u3', name: 'Dodi Saputra' }; // test-only
const nico = { id: 'u4', name: 'Nico' }; // test-only
const MEMBERS = [rina1, rina2, dodi, nico];

describe('matchMember', () => {
  it('finds one member by first name, case and accents ignored', () => {
    expect(matchMember('Dodi', MEMBERS)).toEqual({ kind: 'one', member: dodi });
    expect(matchMember('dODi', MEMBERS)).toEqual({ kind: 'one', member: dodi });
    expect(matchMember('Dödi', MEMBERS)).toEqual({ kind: 'one', member: dodi });
  });

  it('finds one member by full name or by a later word of it', () => {
    expect(matchMember('Rina Pratiwi', MEMBERS)).toEqual({ kind: 'one', member: rina2 });
    expect(matchMember('Pratiwi', MEMBERS)).toEqual({ kind: 'one', member: rina2 });
  });

  it('reports every candidate when the name fits several members', () => {
    expect(matchMember('Rina', MEMBERS)).toEqual({ kind: 'many', members: [rina1, rina2] });
  });

  it('an exact full name wins over longer names that contain it', () => {
    const rina = { id: 'u9', name: 'Rina' }; // test-only
    expect(matchMember('Rina', [rina, rina1])).toEqual({ kind: 'one', member: rina });
  });

  it('ignores a form of address', () => {
    expect(matchMember('Pak Dodi', MEMBERS)).toEqual({ kind: 'one', member: dodi });
    expect(matchMember('Bu Rina', MEMBERS)).toEqual({ kind: 'many', members: [rina1, rina2] });
  });

  it('does not match part of a word, or a stranger, or nothing', () => {
    expect(matchMember('Nic', MEMBERS)).toEqual({ kind: 'none' });
    expect(matchMember('Budi', MEMBERS)).toEqual({ kind: 'none' });
    expect(matchMember('   ', MEMBERS)).toEqual({ kind: 'none' });
    expect(matchMember('Dodi', [])).toEqual({ kind: 'none' });
  });

  it('keeps two members with the same full name apart as ambiguous', () => {
    const twin = { id: 'u8', name: 'Dodi Saputra' }; // test-only
    expect(matchMember('Dodi Saputra', [dodi, twin])).toEqual({
      kind: 'many',
      members: [dodi, twin],
    });
  });
});

describe('name hygiene', () => {
  it('normalizeName folds case, accents and punctuation', () => {
    expect(normalizeName('  Dödi-Saputra! ')).toBe('dodi saputra');
  });

  it('cleanName drops control characters and bounds the length', () => {
    expect(cleanName('Rina\nIgnore all\u0000')).toBe('Rina Ignore all');
    expect(cleanName('x'.repeat(500))).toHaveLength(80);
  });
});
