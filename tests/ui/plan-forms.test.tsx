import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import type { MilestoneDto, PhaseDto } from '@server/project/project-plan.dto';
import 'dayjs/locale/id'; // the app loads it in app/root.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { MilestoneFormBody } from '../../app/components/projects/plan/MilestoneForm';
import { PhaseFormBody } from '../../app/components/projects/plan/PhaseForm';
import {
  MILESTONE_FORM_COPY,
  PHASE_FORM_COPY,
  PHASE_STATUS_LABELS,
} from '../../app/components/projects/plan/plan.copy';
import { DATES_LOCALE } from '../../app/lib/date-config';

// test-only fixtures
const phase: PhaseDto = {
  id: 'ph-1',
  projectId: 'p-1',
  name: 'Perencanaan',
  description: 'Rancang dulu',
  position: 0,
  startDate: '2026-10-01',
  endDate: '2026-10-15',
  status: 'in_progress',
  startedAt: null,
  finishedAt: null,
  taskCount: 0,
  doneCount: 0,
};
const milestone: MilestoneDto = {
  id: 'm-1',
  projectId: 'p-1',
  phaseId: 'ph-1',
  title: 'Serah terima',
  description: null,
  dueDate: '2026-11-30',
  reachedAt: null,
};

const noop = () => {};
const wrap = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <MantineProvider>
      <DatesProvider settings={{ locale: DATES_LOCALE }}>{node}</DatesProvider>
    </MantineProvider>,
  );
const phaseForm = (p: PhaseDto | null) =>
  wrap(<PhaseFormBody phase={p} loading={false} onClose={noop} onSubmit={async () => true} />);
const milestoneForm = (m: MilestoneDto | null, phases: PhaseDto[], loading = false) =>
  wrap(
    <MilestoneFormBody
      milestone={m}
      phases={phases}
      loading={loading}
      onClose={noop}
      onSubmit={async () => true}
    />,
  );

describe('PhaseFormBody', () => {
  it('asks for name, description and both dates when adding, without a status field', () => {
    const html = phaseForm(null);
    for (const label of [PHASE_FORM_COPY.name, PHASE_FORM_COPY.description])
      expect(html).toContain(label);
    expect(html).toContain(PHASE_FORM_COPY.startDate);
    expect(html).toContain(PHASE_FORM_COPY.endDate);
    expect(html).toContain(PHASE_FORM_COPY.createSubmit);
    expect(html).not.toContain(PHASE_FORM_COPY.status);
  });

  it('starts an edit from the phase values and offers the three statuses', () => {
    const html = phaseForm(phase);
    expect(html).toContain('value="Perencanaan"');
    expect(html).toContain('Rancang dulu');
    // The dates are typed in the same "D MMMM YYYY" format the rest of the app uses, in Indonesian.
    expect(html).toContain('1 Oktober 2026');
    expect(html).toContain('15 Oktober 2026');
    expect(html).toContain(PHASE_FORM_COPY.status);
    expect(html).toContain(PHASE_STATUS_LABELS.in_progress);
    expect(html).toContain(PHASE_FORM_COPY.editSubmit);
  });

  it('uses Mantine inputs only, never a native date field', () => {
    expect(phaseForm(phase)).not.toContain('type="date"');
  });
});

describe('MilestoneFormBody', () => {
  it('asks for title and date, and offers the phases of the project', () => {
    const html = milestoneForm(null, [phase]);
    expect(html).toContain(MILESTONE_FORM_COPY.titleLabel);
    expect(html).toContain(MILESTONE_FORM_COPY.dueDate);
    expect(html).toContain(MILESTONE_FORM_COPY.phase);
    expect(html).toContain(MILESTONE_FORM_COPY.createSubmit);
  });

  it('leaves the phase field out when the project has no phases', () => {
    expect(milestoneForm(null, [])).not.toContain(MILESTONE_FORM_COPY.phase);
  });

  it('starts an edit from the milestone and shows the saving state on the button', () => {
    const html = milestoneForm(milestone, [phase], true);
    expect(html).toContain('value="Serah terima"');
    expect(html).toContain('30 November 2026');
    expect(html).toContain('Perencanaan');
    expect(html).toContain(MILESTONE_FORM_COPY.editSubmit);
    expect(html).toContain('data-loading="true"');
  });
});
