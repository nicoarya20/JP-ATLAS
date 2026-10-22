import { describe, expect, it } from 'bun:test';
import { greetingName } from '../../server/profile/profile.greeting';

const BASE = { nickname: null, displayName: null, name: 'Nico Pratama' }; // test-only

describe('greetingName', () => {
  it('prefers the nickname', () => {
    expect(greetingName({ ...BASE, nickname: ' Nico ' })).toBe('Nico');
  });
  it('falls back to the first word of the display name, then of the account name', () => {
    expect(greetingName({ ...BASE, displayName: 'Budi Santoso' })).toBe('Budi');
    expect(greetingName(BASE)).toBe('Nico');
  });
  it('never returns an empty greeting', () => {
    expect(greetingName({ nickname: '  ', displayName: ' ', name: '   ' })).toBe('pengguna');
  });
});
