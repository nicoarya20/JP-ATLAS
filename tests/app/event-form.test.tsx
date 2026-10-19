/** Two-stage event form (S7 E-10): what opens first, the details, checks, refusals and the save call. */
import { describe, expect, it, mock } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { EventFormView } from '../../app/components/events/EventFormView';
import {
  type EventFormValues,
  hasDetailError,
  newEventValues,
  validateEvent,
} from '../../app/lib/event-form';
import { EVENT_FORM_COPY as COPY } from '../../app/lib/event-form.copy';
import { eventProjectOptions } from '../../app/lib/event-form.projects';
import { describeEventSaveError, SERVICE_MESSAGE_FIELD } from '../../app/lib/event-form-errors';
import { ApiError } from '../../app/lib/http';
import { EVENT_WRITE_MESSAGES } from '../../server/event/events.validate';

const TODAY = '2026-10-20'; // test-only
const WIB = 'Asia/Jakarta'; // test-only

type Form = ReturnType<typeof useForm<EventFormValues>>;
type HarnessProps = {
  more?: boolean;
  saving?: boolean;
  serverError?: string | null;
  values?: Partial<EventFormValues>;
  errors?: Record<string, string>;
  projects?: { value: string; label: string }[];
  onToggleMore?: () => void;
  capture?: (form: Form) => void;
};

/** A real Mantine form around the view, so the markup is what the browser would first paint. */
function Harness(p: HarnessProps) {
  const form = useForm<EventFormValues>({
    initialValues: { ...newEventValues(TODAY), ...p.values },
    initialErrors: p.errors,
  });
  p.capture?.(form);
  return (
    <EventFormView
      form={form}
      projects={p.projects ?? []}
      more={p.more ?? false}
      onToggleMore={p.onToggleMore ?? (() => {})}
      saving={p.saving ?? false}
      serverError={p.serverError ?? null}
      cancelTo="/app/events"
      onSubmit={() => {}}
    />
  );
}

function render(props: HarnessProps = {}) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <MemoryRouter initialEntries={['/app/events/new']}>
          <Harness {...props} />
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

const fieldsIn = (html: string) =>
  [...html.matchAll(/data-event-field="([a-z]+)"/g)].map((m) => m[1]);

describe('Event form — stage 1', () => {
  it('opens on exactly four fields: judul, waktu, lokasi, peserta', () => {
    const html = render();
    expect(fieldsIn(html)).toEqual(['title', 'when', 'location', 'participants']);
    // Nothing of stage 2 is on the page yet; its defaults are stated in one dimmed line instead.
    for (const label of [COPY.kind, COPY.project, COPY.agenda, COPY.meetingUrl, COPY.reminders]) {
      expect(html).not.toContain(label);
    }
    expect(html).toContain(COPY.autoDefaults);
  });

  it('fills the date from the server today and leaves both times for the user', () => {
    const html = render();
    expect(html).toContain('value="2026-10-20"');
    expect(newEventValues(TODAY)).toMatchObject({ date: TODAY, startTime: '', endTime: '' });
  });

  it('offers "Tambahkan rincian" collapsed, with Simpan event and Batal', () => {
    const html = render();
    expect(html).toContain(COPY.showMore);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(COPY.save);
    expect(html).toContain(COPY.cancel);
  });
});

/** Walks a React element tree (without rendering it) for the first element with `props[key] === value`. */
function find(node: ReactNode, key: string, value: string): ReactElement | null {
  if (!isValidElement(node)) return null;
  const props = node.props as Record<string, unknown>;
  if (props[key] === value) return node;
  const kids = Array.isArray(props.children) ? props.children : [props.children];
  for (const kid of kids as ReactNode[]) {
    const hit = find(kid, key, value);
    if (hit) return hit;
  }
  return null;
}

describe('Event form — stage 2', () => {
  it('"Tambahkan rincian" asks the form to open the details', () => {
    let form: Form | undefined;
    render({ capture: (f) => (form = f) });
    const onToggleMore = mock(() => {});
    // The view keeps no state, so calling it gives the element tree it would draw.
    const tree = EventFormView({
      form: form as Form,
      projects: [],
      more: false,
      onToggleMore,
      saving: false,
      serverError: null,
      cancelTo: '/app/events',
      onSubmit: () => {},
    });
    const toggle = find(tree, 'data-testid', 'event-more-toggle');
    expect(toggle).not.toBeNull();
    if (!toggle) throw new Error('The toggle button is missing from the form.');
    (toggle.props as { onClick: () => void }).onClick();
    expect(onToggleMore).toHaveBeenCalledTimes(1);
  });

  it('shows jenis, proyek, tautan, agenda and pengingat once open, keeping the four basics', () => {
    const html = render({ more: true, projects: [{ value: 'p1', label: 'Atlas' }] });
    for (const label of [COPY.kind, COPY.project, COPY.agenda, COPY.meetingUrl, COPY.reminders]) {
      expect(html).toContain(label);
    }
    expect(fieldsIn(html)).toEqual(['title', 'when', 'location', 'participants']);
    expect(html).toContain(COPY.hideMore);
    expect(html).toContain('aria-expanded="true"');
    // Both default reminders are ticked, and nothing but the server's own offsets is offered.
    expect(html).toContain(COPY.reminderLabel(1440));
    expect(html).toContain(COPY.reminderLabel(30));
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html.match(/type="checkbox"[^>]*checked/g)).toHaveLength(2);
  });

  it('says why Proyek is disabled when the user has no project to offer', () => {
    const html = render({ more: true, projects: [] });
    expect(html).toContain(COPY.projectNone);
    expect(html).toMatch(/<input[^>]*disabled[^>]*placeholder="Tanpa proyek"/);
  });
});

describe('Proyek choices', () => {
  const project = (id: string, status: 'active' | 'done' = 'active') =>
    ({ id, name: `Proyek ${id}`, status, lead: null }) as never;
  const since = new Date('2026-01-01T00:00:00Z'); // test-only
  const projects = [project('kelola'), project('anggota'), project('pantau'), project('luar')];
  const memberships = new Map([
    ['kelola', { role: 'manager' as const, joinedAt: since }],
    ['anggota', { role: 'member' as const, joinedAt: since }],
    ['pantau', { role: 'viewer' as const, joinedAt: since }],
  ]);

  it('leaves out the project a Pemantau only watches', () => {
    const me = { id: 'u1', appRole: 'member' as const, impersonating: false };
    const options = eventProjectOptions(me, projects, memberships);
    expect(options.map((o) => o.value)).toEqual(['kelola', 'anggota']);
  });

  it('leaves out a project a Project Manager only reads, but offers a finished one they work in', () => {
    const pm = { id: 'u2', appRole: 'project_manager' as const, impersonating: false };
    const finished = [project('kelola', 'done'), project('luar')];
    expect(eventProjectOptions(pm, finished, memberships).map((o) => o.value)).toEqual(['kelola']);
  });

  it('offers every project to an Admin', () => {
    const admin = { id: 'u3', appRole: 'admin' as const, impersonating: false };
    expect(eventProjectOptions(admin, projects, new Map())).toHaveLength(4);
  });
});

const filled = (over: Partial<EventFormValues> = {}): EventFormValues => ({
  ...newEventValues(TODAY),
  title: '  Rapat mingguan  ',
  date: '2026-10-21',
  startTime: '09:00',
  endTime: '10:30',
  ...over,
});

describe('Event form — checks', () => {
  it('refuses an end time at or before the start time, with the sentence under the end time', () => {
    for (const endTime of ['09:00', '08:59']) {
      const errors = validateEvent(filled({ endTime }), WIB);
      expect(errors.endTime).toBe('Jam selesai harus setelah jam mulai.');
    }
    const html = render({ errors: { endTime: COPY.endBeforeStart } });
    expect(html).toContain(COPY.endBeforeStart);
    expect(validateEvent(filled(), WIB)).toEqual({});
  });

  it('asks for what is missing in plain words', () => {
    const errors = validateEvent(
      filled({ title: '   ', date: null, startTime: '', endTime: '' }),
      WIB,
    );
    expect(errors).toEqual({
      title: COPY.titleRequired,
      date: COPY.dateRequired,
      startTime: COPY.startRequired,
      endTime: COPY.endRequired,
    });
  });

  it('rejects a meeting link that is not http(s), and text that is too long', () => {
    expect(validateEvent(filled({ meetingUrl: 'javascript:alert(1)' }), WIB).meetingUrl).toBe(
      COPY.meetingUrlBad,
    );
    expect(validateEvent(filled({ meetingUrl: 'rapat online' }), WIB).meetingUrl).toBe(
      COPY.meetingUrlBad,
    );
    expect(validateEvent(filled({ meetingUrl: 'https://meet.example/abc' }), WIB)).toEqual({});
    expect(validateEvent(filled({ title: 'a'.repeat(151) }), WIB).title).toBe(
      COPY.titleTooLong(150),
    );
  });

  it('opens the details when the refused field lives there', () => {
    expect(hasDetailError({ meetingUrl: 'x' })).toBe(true);
    expect(hasDetailError({ endTime: 'x', participantIds: 'x' })).toBe(false);
  });
});

describe('Event form — Simpan and refusals', () => {
  it('shows Simpan event as loading while the request runs, and idle otherwise', () => {
    const idle = render();
    const busy = render({ saving: true });
    expect(idle).not.toContain('data-loading');
    const submit = busy.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? '';
    expect(submit).toContain('data-loading="true"');
    // Mantine disables a loading button, which is what stops a second press.
    expect(submit).toContain('disabled');
  });

  it('shows the server sentence in an alert', () => {
    const html = render({ serverError: COPY.notMember });
    expect(html).toContain('role="alert"');
    expect(html).toContain(COPY.notMember);
    expect(render()).not.toContain('role="alert"');
  });

  const refusal = (status: number, code: string, body: object = {}) =>
    new ApiError({ status, code, ...body });

  it('403 NOT_MEMBER and a project in the Trash name the project field', () => {
    const notMember = describeEventSaveError(refusal(403, 'NOT_MEMBER'), true);
    expect(notMember.message).toBe(COPY.notMember);
    expect(notMember.fields.projectId).toBe(COPY.notMember);
    // The catalog answers 409 for a Trashed project; the code decides, not the status.
    for (const status of [409, 422]) {
      const trashed = describeEventSaveError(refusal(status, 'PROJECT_IN_TRASH'), true);
      expect(trashed.fields.projectId).toBe(COPY.projectInTrash);
      expect(trashed.message).toContain('Pulihkan proyeknya dulu');
    }
    expect(describeEventSaveError(refusal(404, 'NOT_FOUND'), true).fields.projectId).toBe(
      COPY.projectMissing,
    );
  });

  it('422 issues land on their fields in Indonesian, whatever language the schema used', () => {
    const err = refusal(422, 'VALIDATION', {
      message: 'Validasi gagal',
      issues: [
        { path: '/title', message: 'Expected string length greater or equal to 1' },
        { path: '/startsAt', message: 'Expected string to match format date-time' },
        { path: '/meetingUrl', message: 'Expected string length less or equal to 500' },
      ],
    });
    const { message, fields } = describeEventSaveError(err, false);
    expect(fields).toEqual({
      title: COPY.fieldInvalid,
      startTime: COPY.fieldInvalid,
      meetingUrl: COPY.fieldInvalid,
    });
    expect(message).toBe(COPY.checkFields);
    expect(JSON.stringify([message, fields])).not.toContain('Expected');
  });

  it('422 service sentences stay as written and mark their field', () => {
    const late = describeEventSaveError(
      refusal(422, 'VALIDATION', { message: 'Jam selesai harus setelah jam mulai.' }),
      false,
    );
    expect(late).toEqual({
      message: 'Jam selesai harus setelah jam mulai.',
      fields: { endTime: 'Jam selesai harus setelah jam mulai.' },
    });
    const guest = describeEventSaveError(
      refusal(422, 'VALIDATION', { message: EVENT_WRITE_MESSAGES.unknownGuest }),
      false,
    );
    expect(Object.keys(guest.fields)).toEqual(['participantIds']);
  });

  it('keeps the client copy of the service sentences equal to the server catalog', () => {
    const asked = Object.keys(SERVICE_MESSAGE_FIELD).sort();
    expect(asked).toEqual(
      [
        EVENT_WRITE_MESSAGES.endsBeforeStarts,
        EVENT_WRITE_MESSAGES.spanRequired,
        EVENT_WRITE_MESSAGES.unknownGuest,
      ].sort(),
    );
  });

  it('turns a dropped connection and a server fault into one actionable sentence', () => {
    expect(describeEventSaveError(new TypeError('fetch failed'), false).message).toContain(
      'Periksa koneksi internet',
    );
    const fault = describeEventSaveError(refusal(500, 'INTERNAL', { requestId: 'r-1' }), false);
    expect(fault.message).toContain('r-1');
    expect(fault.fields).toEqual({});
  });
});
