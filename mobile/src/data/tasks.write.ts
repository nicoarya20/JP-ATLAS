import { monthDay } from './dates';
import { findProject } from './projects.state';
import { CSV_PREVIEW, CSV_STATE_LABEL, type CsvRow, QUICK_WRITE } from './sample/tasks.extra';
import { ATLAS_ID } from './tasks.shared';

/*
 * New task · Just write ✦ and Import CSV (prototype tasks.new.jsx). Both are sample data in Phase 1: no LLM drafts the
 * tasks and no file is read; saving or importing only shows a toast.
 */

/** The project both screens add to: Atlas, as in the prototype. */
function atlasName(what: string): string {
  const project = findProject(ATLAS_ID);
  if (!project) throw new Error(`Cannot open ${what}: no project "${ATLAS_ID}"`);
  return project.name;
}

/** "Just write ✦": the project, the text, the AI drafts with their due labels ("Oct 8 (tomorrow)") and the ambiguous-name ask. */
export function getQuickWrite() {
  const { text, drafts, ask } = QUICK_WRITE;
  return {
    project: atlasName('Just write'),
    text,
    drafts: drafts.map((d) => ({ ...d, dueLabel: `${monthDay(d.due)} (${d.dueHint})` })),
    ask,
    /** "Which Rina?". */
    askTitle: `Which ${ask[0]?.split(' ')[0] ?? ''}?`,
    /** "Save 2 tasks". */
    saveLabel: `Save ${drafts.length} tasks`,
  };
}

export type CsvPreviewRow = CsvRow & {
  label: string;
  /** "rina@kantor.id · Due Oct 15", or the defaults an empty row gets. */
  line: string;
};

const EMPTY_LINE = '(empty → no assignee) · (empty → Medium) · (empty → no due date)';

/** Import CSV preview: file, target project, summary and rows; error rows are not imported. */
export function getCsvImport() {
  const { file, rows } = CSV_PREVIEW;
  const errors = rows.filter((r) => r.state === 'error').length;
  const notes = rows.filter((r) => r.state === 'note').length;
  const ok = rows.length - errors;
  return {
    file: `${file} · ${rows.length} rows`,
    project: atlasName('Import CSV'),
    summary: `${ok} ready (${notes} with a note) · ${errors} error${errors === 1 ? '' : 's'}`,
    rows: rows.map(
      (r): CsvPreviewRow => ({
        ...r,
        label: CSV_STATE_LABEL[r.state],
        line: r.email && r.due ? `${r.email} · Due ${monthDay(r.due)}` : EMPTY_LINE,
      }),
    ),
    importCount: ok,
    /** "Import 4 tasks". */
    importLabel: `Import ${ok} tasks`,
  };
}
