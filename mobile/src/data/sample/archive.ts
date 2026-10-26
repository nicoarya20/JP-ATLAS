// Archived items of the prototype (riset-keano/prototype-react/src/data/sample.js `archive`), newest first.
// These entries came from no list in the sample, so they carry no `ref` and Undo never applies to them.
import type { ArchiveEntry } from '../archive.store';

export const ARCHIVE: readonly ArchiveEntry[] = [
  {
    key: 'event-test-meeting',
    kind: 'EVENT',
    title: 'Test meeting',
    where: 'No project',
    by: 'Nico',
    date: '2026-10-06',
  },
  {
    key: 'task-21',
    kind: 'TASK',
    title: '#21 Duplicate login test',
    where: 'Atlas Project',
    by: 'Dodi',
    date: '2026-10-05',
  },
  {
    key: 'project-senior-app-trial',
    kind: 'PROJECT',
    title: 'Senior app trial',
    where: 'Project',
    by: 'Nico',
    date: '2026-10-03',
    includes: '8 tasks and 2 events',
  },
  {
    key: 'task-19',
    kind: 'TASK',
    title: '#19 Revise the button color',
    where: 'Atlas Project',
    by: 'Rina',
    date: '2026-10-01',
  },
  {
    key: 'project-old-client-portal',
    kind: 'PROJECT',
    title: 'Old Client Portal',
    where: 'Project',
    by: 'Lea',
    date: '2026-09-28',
    includes: '5 tasks and 1 event',
  },
];
