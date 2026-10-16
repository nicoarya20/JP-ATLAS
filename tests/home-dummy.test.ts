/** Guards the hardcoded Beranda data: every value must be one the badges/progress can render. */
import { describe, expect, it } from 'bun:test';
import {
  DUMMY_ACTIVITIES,
  DUMMY_PROJECTS,
  DUMMY_STATS,
  DUMMY_TASKS,
} from '../app/components/home/home.dummy';
import { PROJECT_CONDITIONS, PROJECT_PRIORITIES, TASK_STATUSES } from '../server/pm/enums';

describe('Beranda dummy data', () => {
  it('uses only known task statuses and priorities, with unique task numbers', () => {
    for (const t of DUMMY_TASKS) {
      expect(TASK_STATUSES).toContain(t.status);
      expect(PROJECT_PRIORITIES).toContain(t.priority);
      expect(t.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(new Set(DUMMY_TASKS.map((t) => t.number)).size).toBe(DUMMY_TASKS.length);
  });

  it('keeps project progress consistent', () => {
    for (const p of DUMMY_PROJECTS) {
      expect(PROJECT_CONDITIONS).toContain(p.condition);
      expect(p.done).toBeGreaterThanOrEqual(0);
      expect(p.done).toBeLessThanOrEqual(p.total);
      expect(p.timePct).toBeGreaterThanOrEqual(0);
      expect(p.timePct).toBeLessThanOrEqual(100);
    }
  });

  it('has stat tiles and activities with unique keys', () => {
    expect(new Set(DUMMY_STATS.map((s) => s.key)).size).toBe(DUMMY_STATS.length);
    expect(new Set(DUMMY_ACTIVITIES.map((a) => a.id)).size).toBe(DUMMY_ACTIVITIES.length);
    expect(DUMMY_STATS.find((s) => s.key === 'projects')?.value).toBe(DUMMY_PROJECTS.length);
  });
});
