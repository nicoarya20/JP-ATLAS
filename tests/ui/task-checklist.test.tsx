/** Task checklist (S2-13): progress "2/3", and the controls exist only for a viewer who may change the task. */
import { describe, expect, it } from 'bun:test';
import { TaskChecklist } from '../../app/components/tasks/TaskChecklist';
import { CHECKLIST_COPY } from '../../app/components/tasks/task-body.copy';
import { renderUi } from '../support/render-ui';

const items = [
  { id: 's1', text: 'Ukur lantai', isDone: true, position: 0 },
  { id: 's2', text: 'Pesan keramik', isDone: true, position: 1 },
  { id: 's3', text: 'Pasang keramik', isDone: false, position: 2 },
];
const show = (canEdit: boolean, list = items) =>
  renderUi(
    <TaskChecklist
      taskRef="7"
      canEdit={canEdit}
      checklist={{
        done: list.filter((i) => i.isDone).length,
        total: list.length,
        items: list,
      }}
    />,
  );

describe('TaskChecklist', () => {
  it('shows the progress as 2/3', async () => {
    expect(await show(true)).toContain('2/3');
  });

  it('gives an editor ticks, add, rename and remove', async () => {
    const html = await show(true);
    expect(html).toContain(CHECKLIST_COPY.add);
    expect(html).toContain(`aria-label="${CHECKLIST_COPY.edit}"`);
    expect(html).toContain(`aria-label="${CHECKLIST_COPY.remove}"`);
    expect(html).not.toMatch(/<input[^>]*disabled=""[^>]*type="checkbox"/);
  });

  it('is read-only for everyone else', async () => {
    const html = await show(false);
    expect(html).toContain('Pesan keramik');
    expect(html).not.toContain(CHECKLIST_COPY.add);
    expect(html).not.toContain(CHECKLIST_COPY.remove);
    expect(html).not.toContain(CHECKLIST_COPY.edit);
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*type="checkbox"/);
  });

  it('explains an empty list in plain words', async () => {
    expect(await show(true, [])).toContain(CHECKLIST_COPY.empty);
    expect(await show(false, [])).toContain(CHECKLIST_COPY.emptyReadOnly);
  });
});
