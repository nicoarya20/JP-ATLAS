import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { TaskLabel } from '@server/metrics/types';
import {
  CONDITION_LABELS,
  type PmLabel,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  TASK_LABEL_LABELS,
  TASK_LABEL_PRIORITY,
  TASK_STATUS_LABELS,
} from '../app/lib/pm-labels';
import {
  PROJECT_CONDITIONS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
} from '../server/pm/enums';

const ROOT = path.join(import.meta.dir, '..');
// `TaskLabel` is a type only; the compiler checks this list is exhaustive via the Record below.
const TASK_LABELS = ['overdue', 'awaiting_my_review', 'blocked', 'stale', 'reopened'] as const;
const _exhaustive: Record<(typeof TASK_LABELS)[number], TaskLabel> = {
  overdue: 'overdue',
  awaiting_my_review: 'awaiting_my_review',
  blocked: 'blocked',
  stale: 'stale',
  reopened: 'reopened',
};

const GROUPS: Record<string, { values: readonly string[]; map: Record<string, PmLabel> }> = {
  taskStatus: { values: TASK_STATUSES, map: TASK_STATUS_LABELS },
  projectStatus: { values: PROJECT_STATUSES, map: PROJECT_STATUS_LABELS },
  priority: { values: PROJECT_PRIORITIES, map: PRIORITY_LABELS },
  condition: { values: PROJECT_CONDITIONS, map: CONDITION_LABELS },
  taskLabel: { values: TASK_LABELS, map: TASK_LABEL_LABELS },
};

describe('pm-labels cover every enum value', () => {
  for (const [name, { values, map }] of Object.entries(GROUPS)) {
    it(`${name}: exactly the enum values, each with label, icon and colour`, () => {
      expect(Object.keys(map).sort()).toEqual([...values].sort());
      for (const v of values) {
        expect(map[v].label.trim().length).toBeGreaterThan(0);
        expect(typeof map[v].icon).toBe('function');
        expect(map[v].color.length).toBeGreaterThan(0);
      }
    });

    it(`${name}: no two values share an icon or a label`, () => {
      const icons = values.map((v) => map[v].icon);
      const labels = values.map((v) => map[v].label);
      expect(new Set(icons).size).toBe(icons.length);
      expect(new Set(labels).size).toBe(labels.length);
    });
  }

  it('an icon shared across groups always carries the same word', () => {
    const wordByIcon = new Map<unknown, string>();
    for (const { map } of Object.values(GROUPS)) {
      for (const { icon, label } of Object.values(map)) {
        const word = wordByIcon.get(icon);
        if (word === undefined) wordByIcon.set(icon, label);
        else expect(label).toBe(word);
      }
    }
  });

  it('TASK_LABEL_PRIORITY orders all five task labels once', () => {
    expect([...TASK_LABEL_PRIORITY].sort()).toEqual([...TASK_LABELS].sort());
    expect(TASK_LABEL_PRIORITY[0]).toBe('overdue');
  });
});

describe('pm-labels use the R11 glossary wording', () => {
  it('task status, project status, priority and condition read as agreed', () => {
    const words = (map: Record<string, PmLabel>, values: readonly string[]) =>
      values.map((v) => map[v].label);
    expect(words(TASK_STATUS_LABELS, TASK_STATUSES)).toEqual([
      'Belum dikerjakan',
      'Sedang dikerjakan',
      'Menunggu diperiksa',
      'Selesai',
      'Dibatalkan',
    ]);
    expect(words(PROJECT_STATUS_LABELS, PROJECT_STATUSES)).toEqual([
      'Draf',
      'Berjalan',
      'Ditunda',
      'Selesai',
      'Dibatalkan',
    ]);
    expect(words(PRIORITY_LABELS, PROJECT_PRIORITIES)).toEqual([
      'Rendah',
      'Sedang',
      'Tinggi',
      'Kritis',
    ]);
    expect(words(CONDITION_LABELS, PROJECT_CONDITIONS)).toEqual([
      'Lancar',
      'Perlu perhatian',
      'Terlambat',
    ]);
  });

  it('never uses a word the glossary forbids', () => {
    const forbidden =
      /\b(overdue|on track|at risk|in progress|to do|on hold|blocked|low|high|urgent)\b/i;
    for (const { map } of Object.values(GROUPS)) {
      for (const { label } of Object.values(map)) expect(label).not.toMatch(forbidden);
    }
  });
});

describe('shared UI icon sizing', () => {
  it('ui components and pm-labels set no pixel icon size (size={16})', () => {
    const dir = path.join(ROOT, 'app/components/ui');
    const files = readdirSync(dir).map((f) => path.join(dir, f));
    files.push(path.join(ROOT, 'app/lib/pm-labels.ts'));
    const offenders = files.filter((f) => /size=\{\d+\}/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
