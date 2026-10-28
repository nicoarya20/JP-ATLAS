import { confirmOutcomes, eventsStore, findEvent, resetEvents } from '../../src/data/events.store';
import { getTask, resetTasks } from '../../src/data/tasks.store';

// What is left of the prototype's events.store.test.js: the sample events the hidden outcomes flow still writes to
// (E-1). Moving an event to the Trash is the server's now (events.write.test.ts).

afterEach(() => {
  resetEvents();
  resetTasks();
});

const ids = () => eventsStore.get().list.map((e) => e.id);

describe('events store', () => {
  test('confirms outcomes as To do tasks in the event’s project and marks the event Done', () => {
    const nos = confirmOutcomes(
      'daily',
      [{ title: 'Fix login', who: 'Rina', due: '2026-10-09' }],
      'Nico',
    );
    expect(getTask(nos[0] ?? 0)).toMatchObject({
      title: 'Fix login',
      who: 'Rina',
      due: '2026-10-09',
      status: 'To do',
      project: 'Atlas Project',
    });
    expect(findEvent('daily')).toMatchObject({
      status: 'Done',
      outcomes: { tasks: nos, by: 'Nico', date: '2026-10-07' },
    });
  });

  test('refuses outcomes while a draft has no due date, creating nothing', () => {
    const drafts = [
      { title: 'Fix the login page before Friday', who: 'Rina', due: '2026-10-09' },
      { title: 'Prepare test data once SSO is fixed', who: 'Dodi', due: '' },
    ];
    expect(() => confirmOutcomes('daily', drafts, 'Nico')).toThrow(
      'Cannot confirm the outcomes of event "daily": "Prepare test data once SSO is fixed" has no due date',
    );
    expect(findEvent('daily')).not.toHaveProperty('outcomes');
    expect(getTask(22)).toBeUndefined();
  });

  test('refuses outcomes for an event that is not there', () => {
    expect(() => confirmOutcomes('nope', [], 'Nico')).toThrow('no such event');
  });

  test('reset brings back the sample events', () => {
    confirmOutcomes('daily', [], 'Nico');
    resetEvents();
    expect(ids()).toEqual(['kickoff', 'review', 'daily', 'sinar', 'sprint', 'rehearsal', 'party']);
    expect(findEvent('daily')).not.toHaveProperty('outcomes');
  });
});
