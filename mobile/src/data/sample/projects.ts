// Sample projects from the prototype; due dates as ISO dates.

export type ProjectStatus = 'Active' | 'On hold' | 'Draft' | 'Done' | 'Canceled';

export type Project = {
  id: string;
  name: string;
  lead: string;
  status: ProjectStatus;
  progress: number;
  due: string;
  members: string[];
};

export const PROJECTS: Project[] = [
  {
    id: 'atlas',
    name: 'Atlas Project',
    lead: 'Nico',
    status: 'Active',
    progress: 70,
    due: '2026-10-31',
    members: ['Nico', 'Rina', 'Dodi', 'Sri'],
  },
  {
    id: 'sinar',
    name: 'PT Sinar Client Portal',
    lead: 'Rina',
    status: 'Active',
    progress: 35,
    due: '2026-10-20',
    members: ['Rina', 'Nico', 'Lea'],
  },
  {
    id: 'migration',
    name: 'Legacy Data Migration',
    lead: 'Dodi',
    status: 'Active',
    progress: 80,
    due: '2026-09-30',
    members: ['Dodi', 'Sri'],
  },
  {
    id: 'tools',
    name: 'Internal Tools',
    lead: 'Nico',
    status: 'On hold',
    progress: 50,
    due: '2026-12-15',
    members: ['Nico', 'Dodi'],
  },
  {
    id: 'attendance',
    name: 'Attendance App',
    lead: 'Nico',
    status: 'Draft',
    progress: 0,
    due: '2026-12-07',
    members: ['Nico'],
  },
  {
    id: 'website',
    name: 'Company Profile Website',
    lead: 'Rina',
    status: 'Done',
    progress: 100,
    due: '2026-09-01',
    members: ['Rina', 'Lea'],
  },
];
