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
import { FORM_COPY, PICKER_COPY } from '../../app/components/projects/projects.copy';
import {
  QUICK_RANGES,
  quickRangeDates,
  quickRangeLabel,
} from '../../app/components/projects/QuickDates';
import type { IsoDate } from '../../server/metrics/types';
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
