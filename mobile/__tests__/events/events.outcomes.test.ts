// The sample outcomes and results still behind the hidden record / outcomes flow (E-1), on the prototype's sample
// day (Wed, Oct 7, 2026).
import { resetArchive } from '../../src/data/archive.store';
import { getEventResults, getOutcomes } from '../../src/data/events.results';
import { confirmOutcomes, resetEvents } from '../../src/data/events.store';
import { moveTask, resetTasks } from '../../src/data/tasks.store';

afterEach(() => {
  resetEvents();
  resetTasks();
  resetArchive();
});

describe('meeting outcomes', () => {
  test('a Member only reads the stand-up drafts', () => {
    expect(getOutcomes('member', 'daily')).toMatchObject({
      readOnly: true,
      project: 'Atlas Project',
    });
    expect(getOutcomes('pm', 'daily')?.minutes.tasks.map((t) => t.due)).toEqual(['2026-10-09', '']);
    expect(getOutcomes('pm', 'nope')).toBeNull();
  });

  test('the kickoff results read their tasks live from Tasks', () => {
    const r = getEventResults('kickoff');
    expect(r?.tasks.map((t) => [t.no, t.status])).toEqual([
      [8, 'Done'],
      [12, 'In progress'],
      [14, 'To do'],
    ]);
    expect(r).toMatchObject({ done: 1, confirmed: 'Confirmed by Nico · Oct 1, 2026, 11:40 AM' });
    moveTask(14, 'Done');
    expect(getEventResults('kickoff')?.done).toBe(2);
    expect(getEventResults('review')).toBeNull();
  });

  test('Step 3 results list the tasks it created', () => {
    const nos = confirmOutcomes(
      'daily',
      [{ title: 'Fix login', who: 'Rina', due: '2026-10-09' }],
      'Nico',
    );
    expect(getEventResults('daily')).toMatchObject({
      confirmed: 'Confirmed by Nico · Oct 7',
      tasks: [{ no: nos[0], title: 'Fix login', status: 'To do', who: 'Rina', exists: true }],
      done: 0,
      source: ['Source: voice recording', 'Written by Dodi (note-taker) · last edited 9:20 AM'],
    });
  });
});
