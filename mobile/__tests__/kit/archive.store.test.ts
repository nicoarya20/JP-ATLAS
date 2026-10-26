import {
  addEntry,
  entryKey,
  findEntry,
  listEntries,
  removeEntry,
  resetArchive,
} from '../../src/data/archive.store';

afterEach(resetArchive);

const TASK = {
  kind: 'TASK',
  title: '#12 Fix SSO login',
  where: 'Atlas Project',
  by: 'Nico',
  date: '2026-10-07',
  ref: 12,
} as const;

test('starts with the prototype sample, newest first', () => {
  expect(listEntries().map((e) => e.title)).toEqual([
    'Test meeting',
    '#21 Duplicate login test',
    'Senior app trial',
    '#19 Revise the button color',
    'Old Client Portal',
  ]);
  expect(findEntry('project-senior-app-trial')?.includes).toBe('8 tasks and 2 events');
});

test('keys are unique and URL-safe', () => {
  const keys = listEntries().map((e) => e.key);
  expect(new Set(keys).size).toBe(keys.length);
  for (const k of keys) expect(k).toMatch(/^[a-z0-9-]+$/);
  expect(entryKey('PROJECT', 'atlas')).toBe('project-atlas');
});

test('addEntry lists the item first under its kind + ref key; removeEntry takes it out again', () => {
  const added = addEntry(TASK);
  expect(added.key).toBe('task-12');
  expect(listEntries()[0]).toEqual({ ...TASK, key: 'task-12' });
  expect(listEntries()).toHaveLength(6);

  expect(removeEntry('task-12')).toEqual(added);
  expect(findEntry('task-12')).toBeUndefined();
  expect(listEntries()).toHaveLength(5);
});

test('archiving the same item twice or removing a missing entry fails with the key', () => {
  addEntry(TASK);
  expect(() => addEntry(TASK)).toThrow('Cannot archive task-12: it is already in Archive');
  expect(() => removeEntry('event-review')).toThrow(
    'Cannot remove event-review from Archive: no such entry',
  );
});

test('resetArchive brings back the sample', () => {
  addEntry({
    kind: 'EVENT',
    title: 'Onboarding design review',
    where: 'Atlas Project',
    by: 'Nico',
    date: '2026-10-07',
    ref: 'review',
  });
  removeEntry('task-21');
  resetArchive();
  expect(listEntries()).toHaveLength(5);
  expect(findEntry('event-review')).toBeUndefined();
  expect(findEntry('task-21')).toBeDefined();
});
