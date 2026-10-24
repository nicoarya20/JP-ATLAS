import { allowedScreen, SCREEN_IDS } from '../../src/navigation/screen-roles';

// Port of the prototype's role gating (core/registry.js `allowed` + the `roles` in screens/*/index.js), per id and role.

const MANAGERS_ONLY = [
  'tasks.return',
  'projects.new',
  'projects.form',
  'projects.story',
  'projects.draft',
  'projects.template',
  'projects.extend',
  'projects.edit',
  'projects.archive',
];
const ADMIN_ONLY = ['users.approve', 'users.roles', 'archive.delete'];
const MEMBER_ONLY = ['events.empty', 'team.empty'];

test('the 71 prototype ids, each once', () => {
  expect(SCREEN_IDS).toHaveLength(71);
  expect(new Set(SCREEN_IDS).size).toBe(71);
});

test.each(SCREEN_IDS.map((id) => [id]))('%s opens for the right roles', (id) => {
  const expected = MANAGERS_ONLY.includes(id)
    ? { member: false, pm: true, admin: true }
    : ADMIN_ONLY.includes(id)
      ? { member: false, pm: false, admin: true }
      : MEMBER_ONLY.includes(id)
        ? { member: true, pm: false, admin: false }
        : { member: true, pm: true, admin: true };
  expect({
    member: allowedScreen(id, 'member'),
    pm: allowedScreen(id, 'pm'),
    admin: allowedScreen(id, 'admin'),
  }).toEqual(expected);
});

test('unknown ids are never allowed', () => {
  expect(allowedScreen('home.more', 'admin')).toBe(false);
  expect(allowedScreen('', 'pm')).toBe(false);
});
