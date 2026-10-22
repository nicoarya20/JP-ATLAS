/** "Perlu perhatian" on the project list: the chip, how it combines with the status chips, its empty state. */
import { describe, expect, it } from 'bun:test';
import { ATTENTION_COPY } from '../../app/components/projects/attention.copy';
import {
  clearFiltersHref,
  emptyKind,
  ProjectEmpty,
} from '../../app/components/projects/ProjectEmpty';
import { ProjectFilters } from '../../app/components/projects/ProjectFilters';
import { EMPTY_COPY } from '../../app/components/projects/projects.copy';
import {
  attentionPatch,
  DEFAULT_PROJECT_FILTERS,
  type ProjectFilters as Filters,
  statusPatch,
} from '../../app/lib/projects-filters';
import { render } from './project-fixtures';

const filters = (over: Partial<Filters> = {}) =>
  render(
    <ProjectFilters
      filters={{ ...DEFAULT_PROJECT_FILTERS, ...over }}
      canSeeAll
      onChange={() => undefined}
    />,
  );

/** The `<input>` of the chip whose label contains `text`. */
function chipInput(html: string, text: string): string {
  const at = html.indexOf(text);
  const start = html.lastIndexOf('<input', at);
  return html.slice(start, html.indexOf('>', start) + 1);
}

describe('AttentionChip in ProjectFilters', () => {
  it('shows an icon and the words, not just a colour', async () => {
    const html = await filters();
    expect(html).toContain(ATTENTION_COPY.chip);
    // The icon sits right before the words inside the chip's label.
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>Perlu perhatian/);
    expect(html).toContain(`title="${ATTENTION_COPY.hint}"`);
  });

  it('is pressed only when the filter is on', async () => {
    expect(chipInput(await filters(), ATTENTION_COPY.chip)).toContain('aria-pressed="false"');
    const on = chipInput(await filters({ perhatian: true }), ATTENTION_COPY.chip);
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain('checked');
  });

  it('stands to the right of the status chips behind a divider', async () => {
    const html = await filters();
    expect(html.indexOf('>Draf<')).toBeLessThan(html.indexOf('mantine-Divider-root'));
    expect(html.indexOf('mantine-Divider-root')).toBeLessThan(html.indexOf(ATTENTION_COPY.chip));
  });

  it('leaves every status chip unselected while it is on, and "Semua" selected otherwise', async () => {
    const statusOn = (html: string) =>
      (html.match(/<input[^>]*type="radio"[^>]*>/g) ?? []).filter(
        (i) => /value="(|berjalan|ditunda|selesai|draf)"/.test(i) && i.includes('checked'),
      );
    expect(statusOn(await filters({ perhatian: true }))).toHaveLength(0);
    const plain = statusOn(await filters());
    expect(plain).toHaveLength(1);
    expect(plain[0]).toContain('value=""');
  });
});

describe('chip URL patches', () => {
  it('turning attention on sets ?perhatian=1 and clears the status', () => {
    expect(attentionPatch(true)).toEqual({ perhatian: '1', status: null });
  });

  it('turning attention off only removes ?perhatian', () => {
    expect(attentionPatch(false)).toEqual({ perhatian: null, status: null });
  });

  it('choosing a status, even "Semua", switches attention off', () => {
    expect(statusPatch('selesai')).toEqual({ status: 'selesai', perhatian: null });
    expect(statusPatch('')).toEqual({ status: '', perhatian: null });
  });
});

describe('empty state of the attention filter', () => {
  it('has its own good-news message and still offers to clear the filter', async () => {
    const html = await render(
      <ProjectEmpty kind="attention" createTo="/app/projects/new" clearTo="/app/projects" />,
    );
    expect(html).toContain('Tidak ada proyek yang perlu perhatian.');
    expect(html).toContain('Semua berjalan lancar.');
    expect(html).toContain(EMPTY_COPY.filteredAction);
    expect(html).toContain('href="/app/projects"');
    expect(html).not.toContain(EMPTY_COPY.filteredTitle);
  });

  it('is chosen only for "Perlu perhatian" without a search', () => {
    expect(emptyKind(true, true, true)).toBe('attention');
    expect(emptyKind(true, false, true)).toBe('attention');
    expect(emptyKind(true, true, false)).toBe('filtered');
    expect(emptyKind(false, true, false)).toBe('creator');
  });

  it('clears attention along with search and status, keeping scope, sort and view', () => {
    const f = { ...DEFAULT_PROJECT_FILTERS, lingkup: 'semua', tampilan: 'gantt' } as const;
    expect(clearFiltersHref({ ...f, perhatian: true, q: 'dapur' })).toBe(
      '/app/projects?lingkup=semua&tampilan=gantt',
    );
  });
});
