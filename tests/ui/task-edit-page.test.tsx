/** "Ubah tugas" page when the viewer may not edit: the reason replaces the form and a way back stays. */
import { describe, expect, it } from 'bun:test';
import type { ReactNode } from 'react';
import { TASK_FORM_COPY } from '../../app/components/tasks/task-form.copy';
import TaskEditPage from '../../app/routes/app/task-edit';
import { renderUi } from '../support/render-ui';

describe('Ubah tugas page', () => {
  it('shows the reason and the link back instead of the form', async () => {
    const Page = TaskEditPage as unknown as (props: { loaderData: unknown }) => ReactNode;
    const html = await renderUi(
      <Page
        loaderData={{
          allowed: false,
          reason: TASK_FORM_COPY.editForbidden,
          detail: '/app/tasks/7',
        }}
      />,
    );
    expect(html).toContain('Anda tidak bisa mengubah tugas ini.');
    expect(html).toContain('href="/app/tasks/7"');
    expect(html).not.toContain(TASK_FORM_COPY.editSubmit);
  });
});
