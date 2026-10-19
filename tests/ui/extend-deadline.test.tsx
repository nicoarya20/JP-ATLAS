import { describe, expect, it } from 'bun:test';
import { EXTENSION_REASON_CATEGORIES } from '@server/pm/enums';
import { EXTENSION_REASON_MAX } from '@server/project/project.limits';
import { quickDueDate } from '../../app/components/projects/QuickDates';
import { ExtendDeadlineView } from '../../app/components/projects/summary/ExtendDeadlineModal';
import {
  EMPTY_EXTEND,
  EXTEND_QUICK,
  type ExtendValues,
  extendBlocker,
  isLater,
  toExtendInput,
} from '../../app/components/projects/summary/extend-deadline';
import {
  EXTEND_CATEGORY_LABELS,
  EXTEND_COPY,
} from '../../app/components/projects/summary/summary.copy';
import { render } from './project-fixtures';

const DUE = '2026-10-31'; // test-only
const valid: ExtendValues = {
  newDueDate: '2026-11-14',
  category: 'dependency',
  reason: 'Menunggu vendor',
};

describe('extendBlocker', () => {
  it('asks for a date first, then a later date, a category and a reason, in that order', () => {
    expect(extendBlocker(EMPTY_EXTEND, DUE)).toBe(EXTEND_COPY.needDate);
    expect(extendBlocker({ ...valid, newDueDate: DUE }, DUE)).toBe(EXTEND_COPY.notLater);
    expect(extendBlocker({ ...valid, newDueDate: '2026-10-01' }, DUE)).toBe(EXTEND_COPY.notLater);
    expect(extendBlocker({ ...valid, category: null }, DUE)).toBe(EXTEND_COPY.needCategory);
    expect(extendBlocker({ ...valid, reason: '   ' }, DUE)).toBe(EXTEND_COPY.needReason);
    expect(extendBlocker(valid, DUE)).toBeNull();
  });

  it('refuses a reason longer than the server accepts, counting the trimmed text', () => {
    const edge = 'a'.repeat(EXTENSION_REASON_MAX);
    expect(extendBlocker({ ...valid, reason: ` ${edge} ` }, DUE)).toBeNull();
    expect(extendBlocker({ ...valid, reason: `${edge}a` }, DUE)).toBe(
      EXTEND_COPY.tooLong(EXTENSION_REASON_MAX),
    );
  });

  it('compares calendar dates as text, across a month and a year', () => {
    expect(isLater('2026-11-01', '2026-10-31')).toBe(true);
    expect(isLater('2027-01-01', '2026-12-31')).toBe(true);
    expect(isLater('2026-10-31', '2026-10-31')).toBe(false);
  });
});

describe('toExtendInput', () => {
  it('is null until the form is valid, then sends the trimmed reason', () => {
    expect(toExtendInput(EMPTY_EXTEND, DUE)).toBeNull();
    expect(toExtendInput({ ...valid, reason: '  Menunggu vendor  ' }, DUE)).toEqual({
      newDueDate: '2026-11-14',
      reasonCategory: 'dependency',
      reason: 'Menunggu vendor',
    });
  });
});

describe('quick buttons', () => {
  it('count from the current due date and always land after it', () => {
    expect(EXTEND_QUICK.map((q) => q.label)).toEqual(['+1 minggu', '+2 minggu', '+1 bulan']);
    expect(EXTEND_QUICK.map((q) => quickDueDate(DUE, q.range))).toEqual([
      '2026-11-07',
      '2026-11-14',
      '2026-11-30', // 31 Oct + 1 month clamps to the last day of November
    ]);
    for (const q of EXTEND_QUICK) expect(isLater(quickDueDate(DUE, q.range), DUE)).toBe(true);
  });
});

describe('categories', () => {
  it('has plain Indonesian words for every category the server accepts', () => {
    expect(EXTENSION_REASON_CATEGORIES.map((c) => EXTEND_CATEGORY_LABELS[c])).toEqual([
      'Perubahan cakupan',
      'Menunggu pihak lain',
      'Kekurangan sumber daya',
      'Lainnya',
    ]);
  });
});

const view = (over: Partial<Parameters<typeof ExtendDeadlineView>[0]> = {}) => {
  const values = over.values ?? EMPTY_EXTEND;
  return render(
    <ExtendDeadlineView
      currentDue={DUE}
      values={values}
      onChange={() => {}}
      blocker={extendBlocker(values, DUE)}
      error={null}
      loading={false}
      onSubmit={() => {}}
      onCancel={() => {}}
      {...over}
    />,
  );
};

/** The opening tag of the button whose label is `label`. */
const buttonTag = (html: string, label: string) =>
  [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<\/button>/g)]
    .map((m) => m[0])
    .find((b) => b.replace(/<[^>]*>/g, '').trim() === label)
    ?.match(/<button\b[^>]*>/)?.[0];

describe('ExtendDeadlineView', () => {
  it('shows the current due date and the quick buttons', async () => {
    const html = await view();
    expect(html).toContain(`${EXTEND_COPY.current}: `);
    expect(html).toContain('31 Okt 2026');
    for (const q of EXTEND_QUICK) expect(html).toContain(q.label);
  });

  it('keeps the submit button off, with the reason beside it, until the form is valid', async () => {
    const html = await view();
    expect(buttonTag(html, EXTEND_COPY.submit)).toContain('disabled');
    expect(html).toContain(EXTEND_COPY.needDate);
    const noReason = await view({ values: { ...valid, reason: '' } });
    expect(buttonTag(noReason, EXTEND_COPY.submit)).toContain('disabled');
    expect(noReason).toContain(EXTEND_COPY.needReason);
  });

  it('turns the button on once the date is later and the reason is written', async () => {
    const html = await view({ values: valid });
    expect(buttonTag(html, EXTEND_COPY.submit)).not.toContain('disabled');
    for (const blocker of [EXTEND_COPY.needDate, EXTEND_COPY.needReason, EXTEND_COPY.notLater]) {
      expect(html).not.toContain(blocker);
    }
  });

  it('shows how much of the reason is used', async () => {
    const html = await view({ values: { ...valid, reason: 'abcd' } });
    expect(html).toContain(EXTEND_COPY.counter(4, EXTENSION_REASON_MAX));
  });

  it('shows a failed send as an alert and keeps the form usable', async () => {
    const message = 'Tenggat baru harus lebih lambat dari tenggat sekarang.';
    const html = await view({ values: valid, error: message });
    expect(html).toContain('role="alert"');
    expect(html).toContain(message);
    expect(buttonTag(html, EXTEND_COPY.submit)).not.toContain('disabled');
  });

  it('marks the submit button as loading while the request runs', async () => {
    const html = await view({ values: valid, loading: true });
    expect(buttonTag(html, EXTEND_COPY.submit)).toContain('data-loading');
  });
});
