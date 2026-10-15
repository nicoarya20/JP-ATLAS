import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { TaskLabel } from '@server/metrics/types';
import {
  PROJECT_CONDITIONS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
} from '@server/pm/enums';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { ConditionPill } from '../app/components/pm/ConditionPill';
import { PriorityBadge } from '../app/components/pm/PriorityBadge';
import { NO_TASKS_LABEL, ProgressBar } from '../app/components/pm/ProgressBar';
import { StatusBadge } from '../app/components/pm/StatusBadge';
import { TaskLabelChip } from '../app/components/pm/TaskLabelChip';
import { AvatarStack, MemberAvatar } from '../app/components/ui/MemberAvatar';
import {
  CONDITION_LABELS,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  TASK_LABEL_LABELS,
  TASK_STATUS_LABELS,
} from '../app/lib/pm-labels';

const render = (node: ReactNode) => renderToString(<MantineProvider>{node}</MantineProvider>);
const TASK_LABELS = Object.keys(TASK_LABEL_LABELS) as TaskLabel[];

describe('StatusBadge', () => {
  it.each([...TASK_STATUSES])('task status %s shows an icon and its label', (status) => {
    const html = render(<StatusBadge status={status} />);
    expect(html).toContain('<svg');
    expect(html).toContain(TASK_STATUS_LABELS[status].label);
  });

  it.each([...PROJECT_STATUSES])('project status %s shows an icon and its label', (status) => {
    const html = render(<StatusBadge status={status} />);
    expect(html).toContain('<svg');
    expect(html).toContain(PROJECT_STATUS_LABELS[status].label);
  });
});

describe('PriorityBadge', () => {
  it.each([...PROJECT_PRIORITIES])('priority %s shows an icon and its label', (priority) => {
    const html = render(<PriorityBadge priority={priority} />);
    expect(html).toContain('<svg');
    expect(html).toContain(PRIORITY_LABELS[priority].label);
  });
});

describe('ConditionPill', () => {
  it.each([...PROJECT_CONDITIONS])('condition %s shows an icon and its label', (condition) => {
    const html = render(<ConditionPill condition={condition} />);
    expect(html).toContain('<svg');
    expect(html).toContain(CONDITION_LABELS[condition].label);
  });

  it('uses the plain words Lancar, Perlu perhatian and Terlambat', () => {
    expect(render(<ConditionPill condition="on_track" />)).toContain('Lancar');
    expect(render(<ConditionPill condition="at_risk" />)).toContain('Perlu perhatian');
    expect(render(<ConditionPill condition="off_track" />)).toContain('Terlambat');
  });
});

describe('TaskLabelChip', () => {
  it('covers every task label', () => {
    expect(TASK_LABELS.length).toBe(5);
  });

  it.each(TASK_LABELS)('label %s shows an icon and its label', (label) => {
    const html = render(<TaskLabelChip label={label} />);
    expect(html).toContain('<svg');
    expect(html).toContain(TASK_LABEL_LABELS[label].label);
  });
});

describe('ProgressBar', () => {
  it('says "Belum ada tugas" with an icon when there are no tasks', () => {
    const html = render(<ProgressBar done={0} total={0} />);
    expect(html).toContain(`>${NO_TASKS_LABEL}<`);
    expect(NO_TASKS_LABEL).toBe('Belum ada tugas');
    expect(html).toContain('<svg');
    expect(html).not.toContain('0%');
  });

  it('rounds 1 of 6 to 17%', () => {
    const html = render(<ProgressBar done={1} total={6} />);
    expect(html).toContain('>17%<');
    expect(html).toContain('1 dari 6 tugas selesai');
  });

  it('shows 0% when tasks exist but none is done', () => {
    expect(render(<ProgressBar done={0} total={4} />)).toContain('0%');
  });

  it('keeps 99% until every task is done, then shows 100%', () => {
    expect(render(<ProgressBar done={199} total={200} />)).toContain('>99%<');
    expect(render(<ProgressBar done={200} total={200} />)).toContain('>100%<');
  });

  it('clamps done above total instead of passing 100%', () => {
    expect(render(<ProgressBar done={9} total={6} />)).toContain('>100%<');
  });

  it('adds a labelled time bar only when timePct is given', () => {
    expect(render(<ProgressBar done={1} total={6} />)).not.toContain('Waktu terpakai');
    const html = render(<ProgressBar done={1} total={6} timePct={150} />);
    expect(html).toContain('>Waktu terpakai 100%<');
    expect(html).toContain('<svg');
  });
});

describe('MemberAvatar and AvatarStack', () => {
  const members = ['Ani Putri', 'Budi Santoso', 'Citra Dewi', 'Dedi Kurnia', 'Eka Sari'].map(
    (name, i) => ({ id: `u${i}`, name }),
  );

  it('falls back to initials when there is no photo', () => {
    const html = render(<MemberAvatar name="Ani Putri" />);
    expect(html).toContain('AP');
    expect(html).not.toContain('<img');
  });

  it('renders the photo when an image is given', () => {
    const html = render(<MemberAvatar name="Ani Putri" image="https://img.test/a.png" />);
    expect(html).toContain('<img');
    expect(html).toContain('https://img.test/a.png');
  });

  it('collapses members beyond the maximum into a +N counter', () => {
    const html = render(<AvatarStack members={members} max={3} />);
    expect(html).toContain('>+2<');
    expect(html).toContain('2 anggota lainnya');
    expect(html).toContain('AP');
    expect(html).not.toContain('DK');
  });

  it('shows no counter when everyone fits', () => {
    expect(render(<AvatarStack members={members.slice(0, 2)} />)).not.toContain('+');
  });

  it('says "Belum ada anggota" with an icon for an empty team', () => {
    const html = render(<AvatarStack members={[]} />);
    expect(html).toContain('Belum ada anggota');
    expect(html).toContain('<svg');
  });
});
