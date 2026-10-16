/** Guards the hardcoded Beranda data: values the cards and badges depend on must stay consistent. */
import { describe, expect, it } from 'bun:test';
import {
  ASK_ITEMS,
  COUNTERS,
  FOCUS_GROUP_LABELS,
  FOCUS_TASKS,
  HOME_PROJECTS,
} from '../app/components/home/home.dummy';
import { PROJECT_CONDITIONS } from '../server/pm/enums';

const unique = (xs: string[]) => new Set(xs).size === xs.length;

describe('Beranda dummy data', () => {
  it('puts every focus task in a known group, with unique ids', () => {
    for (const t of FOCUS_TASKS) expect(Object.keys(FOCUS_GROUP_LABELS)).toContain(t.group);
    expect(unique(FOCUS_TASKS.map((t) => t.id))).toBe(true);
  });

  it('keeps project progress and condition valid', () => {
    for (const p of HOME_PROJECTS) {
      expect(PROJECT_CONDITIONS).toContain(p.condition);
      expect(p.done).toBeLessThanOrEqual(p.total);
    }
  });

  it('keeps ask-data bars between 0 and 100 with unique questions and counters', () => {
    for (const i of ASK_ITEMS) for (const b of i.bars) expect(b.pct).toBeGreaterThanOrEqual(0);
    for (const i of ASK_ITEMS) for (const b of i.bars) expect(b.pct).toBeLessThanOrEqual(100);
    expect(unique(ASK_ITEMS.map((i) => i.question))).toBe(true);
    expect(unique(COUNTERS.map((c) => c.key))).toBe(true);
  });
});
