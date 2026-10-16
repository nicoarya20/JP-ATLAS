import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import {
  ProjectForm,
  type ProjectFormValues,
  toCreateInput,
  validateProject,
} from '../../app/components/projects/ProjectForm';
import { isEmptyPlan, toEditPlan } from '../../app/components/projects/project-edit';
import { EDIT_COPY } from '../../app/components/projects/project-edit.copy';
import { FORM_COPY, PICKER_COPY } from '../../app/components/projects/projects.copy';
import {
  QUICK_RANGES,
  quickRangeDates,
  quickRangeLabel,
} from '../../app/components/projects/QuickDates';
import { PROJECT_STATUS_LABELS } from '../../app/lib/pm-labels';
import type { IsoDate } from '../../server/metrics/types';
import { PROJECT_STATUSES } from '../../server/pm/enums';
import { PROJECT_NAME_MAX } from '../../server/project/project.limits';

const TODAY = '2026-10-17' as IsoDate; // test-only
const CREATOR = { id: 'u-1', name: 'Dodi' }; // test-only

/** Renders under a data router (the unsaved-changes guard needs one) and a query client (the picker). */
async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([{ id: 'root', path: '/', Component: () => node }]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <MantineProvider>
      <DatesProvider settings={{ locale: 'id' }}>
        <QueryClientProvider client={new QueryClient()}>
          <StaticRouterProvider router={router} context={context} hydrate={false} />
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>,
  );
}

const renderForm = () =>
  render(
    <ProjectForm
      creator={CREATOR}
      today={TODAY}
      onSubmit={async () => null}
      submitting={false}
      cancelTo="/app/projects"
    />,
  );

/** The `<label>` that holds `text`, plus whatever follows it up to the next label. */
function fieldBlock(html: string, text: string): string {
  const at = html.indexOf(`${text}<`);
  expect(at).toBeGreaterThan(-1);
  const start = html.lastIndexOf('<label', at);
  const next = html.indexOf('<label', at);
  return html.slice(start, next === -1 ? undefined : next);
}

const values = (over: Partial<ProjectFormValues> = {}): ProjectFormValues => ({
  name: 'Renovasi Dapur',
  description: '',
  status: 'draft',
  priority: 'medium',
  leadId: CREATOR.id,
  startDate: null,
  dueDate: null,
  ...over,
});

describe('ProjectForm markup', () => {
  it('puts every label above its field', async () => {
    const html = await renderForm();
    for (const label of [FORM_COPY.name, FORM_COPY.descriptionLabel, FORM_COPY.startDate]) {
      const block = fieldBlock(html, label);
      expect(block.indexOf(label)).toBeLessThan(block.search(/<(input|textarea|button)/));
    }
  });

  it('marks only the project name as required', async () => {
    const html = await renderForm();
    expect(fieldBlock(html, FORM_COPY.name)).toContain('mantine-InputWrapper-required');
    for (const label of [FORM_COPY.descriptionLabel, FORM_COPY.startDate, FORM_COPY.dueDate]) {
      expect(fieldBlock(html, label)).not.toContain('mantine-InputWrapper-required');
    }
  });

  it('shows the four quick-date buttons, the creator as Pengelola and a named submit', async () => {
    const html = await renderForm();
    for (const r of QUICK_RANGES) expect(html).toContain(`>${quickRangeLabel(r)}<`);
    expect(html).toContain(`${CREATOR.name} ${PICKER_COPY.you}`);
    expect(html).toContain(FORM_COPY.submit);
    expect(html).not.toMatch(/>(OK|Submit)</);
  });
});

describe('quick date buttons', () => {
  it("fill start from the server's today and due from the range", () => {
    expect(quickRangeDates(null, TODAY, 'w1')).toEqual({
      startDate: TODAY,
      dueDate: '2026-10-24' as IsoDate,
    });
    expect(quickRangeDates(null, TODAY, 'm3').dueDate).toBe('2027-01-17' as IsoDate);
  });
});

describe('validateProject', () => {
  it('requires a name and caps its length', () => {
    expect(validateProject(values({ name: '   ' })).name).toBe(FORM_COPY.nameRequired);
    expect(validateProject(values({ name: 'x'.repeat(PROJECT_NAME_MAX + 1) })).name).toBe(
      FORM_COPY.nameTooLong(PROJECT_NAME_MAX),
    );
    expect(validateProject(values())).toEqual({});
  });

  it('rejects a due date before the start date', () => {
    const errors = validateProject(values({ startDate: '2026-10-20', dueDate: '2026-10-19' }));
    expect(errors.dueDate).toBe(FORM_COPY.dueBeforeStart);
  });
});

describe('toCreateInput', () => {
  it('trims, leaves blanks out and sends picked members with their role', () => {
    const input = toCreateInput(
      values({ name: '  Atlas  ', description: '  ', dueDate: '2026-11-01' }),
      [{ id: 'u-2', name: 'Sari', jobTitle: null, image: null, role: 'viewer' }],
    );
    expect(input).toEqual({
      name: 'Atlas',
      status: 'draft',
      priority: 'medium',
      leadId: CREATOR.id,
      dueDate: '2026-11-01',
      members: [{ userId: 'u-2', role: 'viewer' }],
    });
  });
});

describe('403 copy', () => {
  it('uses the exact sentence from the spec', () => {
    expect(FORM_COPY.forbidden).toBe('Hanya Admin dan Project Manager yang bisa membuat proyek.');
  });
});

// test-only: a saved project as the edit page loads it
const SAVED: ProjectFormValues = {
  name: 'Renovasi Dapur',
  description: 'Dapur baru',
  status: 'completed',
  priority: 'high',
  leadId: 'u-2',
  startDate: '2026-10-01',
  dueDate: '2026-10-31',
};
const MANAGERS = [CREATOR, { id: 'u-2', name: 'Rina' }]; // test-only

const renderEdit = () =>
  render(
    <ProjectForm
      mode="edit"
      initial={SAVED}
      managers={MANAGERS}
      today={TODAY}
      onSubmit={async () => null}
      submitting={false}
      cancelTo="/app/projects/p-1"
    />,
  );

describe('ProjectForm edit mode', () => {
  it('fills every field with the saved values', async () => {
    const html = await renderEdit();
    expect(html).toMatch(/data-path="name"[^>]*value="Renovasi Dapur"/);
    expect(html).toMatch(/data-path="description"[^>]*>Dapur baru</);
    expect(html).toMatch(/data-path="priority"[^>]*value="Tinggi"/);
    expect(html).toMatch(/data-path="leadId"[^>]*value="Rina"/);
    expect(html).toContain('<input type="hidden" value="2026-10-01"/>');
    expect(html).toContain('<input type="hidden" value="2026-10-31"/>');
    expect(html).toMatch(/type="radio"[^>]*checked=""[^>]*value="completed"/);
  });

  it('offers all five statuses (KB-12), not only the initial two', async () => {
    const html = await renderEdit();
    const radios = html.match(/type="radio"[^>]*value="([a-z_]+)"/g) ?? [];
    expect(radios.map((r) => r.replace(/.*value="/, '').replace('"', ''))).toEqual([
      ...PROJECT_STATUSES,
    ]);
    for (const s of PROJECT_STATUSES) expect(html).toContain(`>${PROJECT_STATUS_LABELS[s].label}<`);
    expect(html).toContain(EDIT_COPY.statusHint);
  });

  it('has no member picker, a Lead hint and a named save button', async () => {
    const html = await renderEdit();
    expect(html).not.toContain(PICKER_COPY.search);
    expect(html).toContain(EDIT_COPY.leadHint);
    expect(html).toContain(`>${EDIT_COPY.submit}<`);
    expect(html).not.toContain(`>${FORM_COPY.submit}<`);
  });

  it('keeps the create form on the two initial statuses', async () => {
    const html = await renderForm();
    expect(html.match(/type="radio"/g)?.length).toBe(2);
  });
});

describe('toEditPlan', () => {
  it('sends nothing when nothing changed', () => {
    expect(isEmptyPlan(toEditPlan(SAVED, { ...SAVED, name: ' Renovasi Dapur ' }))).toBe(true);
  });

  it('puts info and dates in the patch, clearing emptied fields with null', () => {
    const plan = toEditPlan(SAVED, { ...SAVED, description: '  ', dueDate: null, priority: 'low' });
    expect(plan).toEqual({
      patch: { description: null, dueDate: null, priority: 'low' },
      status: null,
      leadId: null,
    });
  });

  it('sends status and Lead on their own, only when changed', () => {
    expect(toEditPlan(SAVED, { ...SAVED, status: 'active', leadId: 'u-1' })).toEqual({
      patch: null,
      status: 'active',
      leadId: 'u-1',
    });
  });
});
