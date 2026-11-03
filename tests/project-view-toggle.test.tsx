import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { renderToString } from 'react-dom/server';
import { ViewToggle } from '../app/components/projects/ViewToggle';

const html = renderToString(
  <MantineProvider>
    <ViewToggle value="list" onChange={() => {}} />
  </MantineProvider>,
);

describe('project ViewToggle', () => {
  it('renders List, Grid and Gantt with one icon each', () => {
    for (const label of ['List', 'Grid', 'Gantt']) expect(html).toContain(label);
    expect(html.match(/<svg/g)).toHaveLength(3);
  });

  it('keeps icon and word of every option on one line (no wrap in a narrow row)', () => {
    // Each option label is a Group: it must not be allowed to wrap its icon above the text.
    const groups = html.match(/<span [^>]*--group-wrap[^>]*>/g) ?? [];
    expect(groups).toHaveLength(3);
    for (const g of groups) expect(g).toContain('--group-wrap:nowrap');
  });
});
