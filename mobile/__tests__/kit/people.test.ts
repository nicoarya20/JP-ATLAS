import { listPeople, me, person, ROLE_LABEL, ROLE_TAG } from '../../src/data/people';

test('person by key or first name joins profile, email and account role', () => {
  expect(person('rina')).toEqual({
    key: 'rina',
    name: 'Rina',
    full: 'Rina Wulandari',
    title: 'UI Designer',
    division: 'Product',
    email: 'rina@kantor.id',
    role: 'Member',
  });
  expect(person('Lea')).toMatchObject({
    key: 'lea',
    email: 'lea@kantor.id',
    role: 'Project Manager',
  });
  expect(person('Budi')).toBeUndefined();
});

test('me per role: Member = Dodi, Project Manager = Nico, Admin = Ayu', () => {
  expect(me('member').key).toBe('dodi');
  expect(me('pm')).toMatchObject({ full: 'Nico Pratama', role: 'Project Manager' });
  expect(me('admin')).toMatchObject({ name: 'Ayu', email: 'ayu@email.com', role: 'Admin' });
});

test('everyone in the sample order, with a role label and reviewer tag', () => {
  expect(listPeople().map((p) => p.name)).toEqual(['Nico', 'Rina', 'Dodi', 'Sri', 'Ayu', 'Lea']);
  expect(ROLE_LABEL).toEqual({ member: 'Member', pm: 'Project Manager', admin: 'Admin' });
  const nico = person('Nico');
  expect(nico && `${nico.name} (${ROLE_TAG[nico.role]})`).toBe('Nico (Manager)');
  expect(ROLE_TAG.Member).toBeUndefined();
});
