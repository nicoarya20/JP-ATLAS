import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { MilestoneDto, PhaseDto } from '@server/project/project-plan.dto';
import { renderToStaticMarkup } from 'react-dom/server';
import { MilestoneList } from '../../app/components/projects/plan/MilestoneList';
import { PhaseList } from '../../app/components/projects/plan/PhaseList';
import { PHASE_STATUS_LABELS, PLAN_COPY } from '../../app/components/projects/plan/plan.copy';
import { MILESTONES_PER_PROJECT, PHASES_PER_PROJECT } from '../../server/project/project.limits';

const TODAY = '2026-10-19'; // test-only
const phase = (over: Partial<PhaseDto> = {}): PhaseDto => ({
  id: 'ph-1',
  projectId: 'p-1',
  name: 'Perencanaan',
  description: null,
  position: 0,
  startDate: '2026-10-01',
  endDate: '2026-10-15',
  status: 'not_started',
  startedAt: null,
  finishedAt: null,
  taskCount: 0,
  doneCount: 0,
  ...over,
});
const milestone = (over: Partial<MilestoneDto> = {}): MilestoneDto => ({
  id: 'm-1',
  projectId: 'p-1',
  phaseId: null,
  title: 'Serah terima',
  description: null,
  dueDate: '2026-11-30',
  reachedAt: null,
  ...over,
});

const design = phase({
  id: 'ph-1',
  name: 'Perencanaan',
  status: 'done',
  taskCount: 4,
  doneCount: 4,
});
const build = phase({
  id: 'ph-2',
  name: 'Pengembangan',
  position: 1,
  status: 'in_progress',
  startDate: '2026-10-16',
  endDate: null,
  taskCount: 5,
  doneCount: 2,
});
const test = phase({ id: 'ph-3', name: 'Pengujian', position: 2, startDate: null, endDate: null });

const noop = () => {};
const handlers = { onMove: noop, onEdit: noop, onRemove: noop, onAdd: noop };
const phaseHtml = (phases: PhaseDto[], canManage: boolean) =>
  renderToStaticMarkup(
    <MantineProvider>
      <PhaseList phases={phases} canManage={canManage} busy={null} {...handlers} />
    </MantineProvider>,
  );
const mHandlers = { onEdit: noop, onRemove: noop, onToggleReached: noop, onAdd: noop };
const milestoneHtml = (milestones: MilestoneDto[], canManage: boolean, phases = [design]) =>
  renderToStaticMarkup(
    <MantineProvider>
      <MilestoneList
        milestones={milestones}
        phases={phases}
        today={TODAY}
        canManage={canManage}
        busy={null}
        {...mHandlers}
      />
    </MantineProvider>,
  );

/** Every `<button>` tag whose aria-label contains `label`. */
const buttons = (html: string, label: string) =>
  html.match(new RegExp(`<button[^>]*aria-label="[^"]*${label}[^"]*"[^>]*>`, 'g')) ?? [];
const isDisabled = (tag: string) => / disabled=""/.test(tag);

describe('PhaseList', () => {
  const html = phaseHtml([design, build, test], true);

  it('lists the phases in the given order', () => {
    const at = (name: string) => html.indexOf(name);
    expect(at('Perencanaan')).toBeGreaterThan(-1);
    expect(at('Perencanaan')).toBeLessThan(at('Pengembangan'));
    expect(at('Pengembangan')).toBeLessThan(at('Pengujian'));
    expect(html).toContain('<ol');
    expect(html).toContain(PLAN_COPY.position(2, 3));
  });

  it('shows each status as words, with an icon beside them', () => {
    for (const label of Object.values(PHASE_STATUS_LABELS)) expect(html).toContain(label);
    // The badge label is preceded by its aria-hidden icon.
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><\/span>.*?Selesai/s);
  });

  it('shows the task progress bar and count per phase', () => {
    expect(html).toContain('2 dari 5 tugas selesai');
    expect(html).toContain('Progres tugas 40%');
    expect(html).toContain('4 dari 4 tugas selesai');
    // A phase with no tasks says so instead of 0%.
    expect(html).toContain('Belum ada tugas');
  });

  it('writes the date range, one date, or that none is set', () => {
    expect(html).toContain('1 Okt 2026 – 15 Okt 2026');
    expect(html).toContain('Mulai 16 Okt 2026');
    expect(html).toContain(PLAN_COPY.noDates);
  });

  it('gives a manager the add, edit, remove and move buttons', () => {
    expect(html).toContain(PLAN_COPY.addPhase);
    expect(buttons(html, 'Ubah tahapan Perencanaan')).toHaveLength(1);
    expect(buttons(html, 'Hapus tahapan Pengembangan')).toHaveLength(1);
    expect(buttons(html, 'Naikkan tahapan Pengembangan')).toHaveLength(1);
  });

  it('disables moving the first phase up and the last one down, with the reason in its name', () => {
    const [up] = buttons(html, 'Naikkan tahapan Perencanaan');
    const [down] = buttons(html, 'Turunkan tahapan Pengujian');
    expect(isDisabled(up ?? '')).toBe(true);
    expect(up).toContain(PLAN_COPY.atTop);
    expect(isDisabled(down ?? '')).toBe(true);
    expect(down).toContain(PLAN_COPY.atBottom);
    const [mid] = buttons(html, 'Naikkan tahapan Pengembangan');
    expect(isDisabled(mid ?? '')).toBe(false);
  });

  it('shows a member or viewer only the list: no add, edit, remove or move', () => {
    const read = phaseHtml([design, build, test], false);
    expect(read).toContain('Pengembangan');
    expect(read).not.toContain(PLAN_COPY.addPhase);
    expect(read).not.toContain('Ubah tahapan');
    expect(read).not.toContain('Hapus tahapan');
    expect(read).not.toContain('Naikkan tahapan');
    expect(read).not.toContain('<button');
  });

  it('explains an empty plan and offers the first phase to a manager', () => {
    const empty = phaseHtml([], true);
    expect(empty).toContain(PLAN_COPY.phasesEmptyTitle);
    expect(empty).toContain('Perencanaan, Pengembangan, Pengujian');
    expect(empty).toContain(PLAN_COPY.addPhase);
    expect(empty).not.toContain('<ol');
  });

  it('tells a reader who cannot add phases that nobody has yet, without a button', () => {
    const empty = phaseHtml([], false);
    expect(empty).toContain(PLAN_COPY.phasesEmptyTitle);
    expect(empty).toContain(PLAN_COPY.phasesEmptyReader);
    expect(empty).not.toContain('<button');
  });

  it('disables the add button at the limit and says why', () => {
    const many = Array.from({ length: PHASES_PER_PROJECT }, (_, i) =>
      phase({ id: `ph-${i}`, name: `Tahap ${i}`, position: i }),
    );
    const full = phaseHtml(many, true);
    const add = full.match(/<button[^>]*>(?:(?!<\/button>).)*Tambah tahapan.*?<\/button>/s)?.[0];
    expect(isDisabled(add ?? '')).toBe(true);
    expect(full).toContain(PLAN_COPY.phaseLimit(PHASES_PER_PROJECT));
    // One below the limit still allows it.
    const almost = phaseHtml(many.slice(1), true);
    const open = almost.match(/<button[^>]*>(?:(?!<\/button>).)*Tambah tahapan.*?<\/button>/s)?.[0];
    expect(isDisabled(open ?? '')).toBe(false);
    expect(almost).not.toContain(PLAN_COPY.phaseLimit(PHASES_PER_PROJECT));
  });

  it('wraps its header and action rows so they fit a 375px screen', () => {
    expect(html).not.toContain('flex-wrap:nowrap');
  });
});

describe('MilestoneList', () => {
  const late = milestone({ id: 'm-1', title: 'Gambar disetujui', dueDate: '2026-10-10' });
  const done = milestone({
    id: 'm-2',
    title: 'Pondasi selesai',
    dueDate: '2026-10-12',
    phaseId: 'ph-1',
    reachedAt: '2026-10-11T03:00:00.000Z',
  });
  const next = milestone({ id: 'm-3', title: 'Serah terima', dueDate: '2026-11-30' });

  it('shows title, date, phase and reached state in the given order', () => {
    const html = milestoneHtml([late, done, next], true);
    expect(html.indexOf('Gambar disetujui')).toBeLessThan(html.indexOf('Pondasi selesai'));
    expect(html.indexOf('Pondasi selesai')).toBeLessThan(html.indexOf('Serah terima'));
    expect(html).toContain('Tanggal: 30 Nov 2026');
    expect(html).toContain('Tahapan: Perencanaan');
    expect(html).toContain(PLAN_COPY.noPhase);
    expect(html).toContain('Tercapai 11 Okt 2026');
    expect(html).toContain(PLAN_COPY.notReached);
  });

  it('flags only an unreached milestone whose date has passed', () => {
    const html = milestoneHtml([late, done, next], false);
    expect(html.split(PLAN_COPY.overdue)).toHaveLength(2); // exactly one badge
  });

  it('offers the right toggle: mark when open, take back when reached', () => {
    const html = milestoneHtml([done, next], true);
    expect(buttons(html, 'Tandai milestone Serah terima tercapai')).toHaveLength(1);
    expect(buttons(html, 'Batalkan tanda tercapai milestone Pondasi selesai')).toHaveLength(1);
    expect(buttons(html, 'Ubah milestone Serah terima')).toHaveLength(1);
    expect(buttons(html, 'Hapus milestone Serah terima')).toHaveLength(1);
    expect(html).toContain(PLAN_COPY.addMilestone);
  });

  it('shows a reader the list only', () => {
    const html = milestoneHtml([late, next], false);
    expect(html).toContain('Gambar disetujui');
    expect(html).not.toContain(PLAN_COPY.addMilestone);
    expect(html).not.toContain('<button');
  });

  it('explains an empty list for each kind of reader', () => {
    const manager = milestoneHtml([], true);
    expect(manager).toContain(PLAN_COPY.milestonesEmptyTitle);
    expect(manager).toContain(PLAN_COPY.addMilestone);
    const reader = milestoneHtml([], false);
    expect(reader).toContain(PLAN_COPY.milestonesEmptyReader);
    expect(reader).not.toContain('<button');
  });

  it('disables the add button at the limit and says why', () => {
    const many = Array.from({ length: MILESTONES_PER_PROJECT }, (_, i) =>
      milestone({ id: `m-${i}`, title: `Titik ${i}` }),
    );
    const full = milestoneHtml(many, true);
    const add = full.match(/<button[^>]*>(?:(?!<\/button>).)*Tambah milestone.*?<\/button>/s)?.[0];
    expect(isDisabled(add ?? '')).toBe(true);
    expect(full).toContain(PLAN_COPY.milestoneLimit(MILESTONES_PER_PROJECT));
  });
});
