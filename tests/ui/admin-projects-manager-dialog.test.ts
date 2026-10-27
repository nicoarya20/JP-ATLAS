/**
 * The Ganti Pengelola confirm dialog copy (AD-13): it names the project, who loses the lead status,
 * the new Pengelola and how much of the project (task count) they take on — the "dampak nyata" the
 * T2 standard requires (CLAUDE.md UX §1/§6). Pure text, so no modal is rendered.
 */
import { describe, expect, it } from 'bun:test';
import { managerChangeDialog } from '../../app/components/admin/projects/projects.copy';

const project = (over: Partial<Parameters<typeof managerChangeDialog>[0]> = {}) => ({
  name: 'Renovasi Dapur',
  lead: { name: 'Dodi' } as { name: string } | null,
  progress: { total: 6 },
  ...over,
});

describe('managerChangeDialog', () => {
  it('names the project in the title and spells out the impact when a lead exists', () => {
    const { title, body } = managerChangeDialog(project(), 'Rina');
    expect(title).toContain('Renovasi Dapur');
    expect(body).toContain('Dodi'); // the lead who steps down
    expect(body).toContain('Rina'); // the new Pengelola
    expect(body).toContain('6 tugas'); // how much of the project follows
    expect(body).toContain('tidak lagi menjadi Pengelola utama');
  });

  it('handles a project with no current lead without naming an undefined person', () => {
    const { body } = managerChangeDialog(project({ lead: null }), 'Rina');
    expect(body).toContain('belum punya Pengelola');
    expect(body).toContain('Rina');
    expect(body).not.toContain('undefined');
  });
});
