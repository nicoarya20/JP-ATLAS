/** Leave UI on /app/settings: the card in its four states, the request dialog, the approval list, the blocks per right. */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeaveApprovalList } from '../../app/components/leave/LeaveApprovalList';
import { LeaveCard } from '../../app/components/leave/LeaveCard';
import { LeaveRejectView } from '../../app/components/leave/LeaveRejectModal';
import { LeaveRequestView } from '../../app/components/leave/LeaveRequestModal';
import { LeaveSections } from '../../app/components/leave/LeaveSections';
import { ApiError, describeApiError } from '../../app/lib/http';
import type {
  LeaveMeDto,
  LeavePageData,
  LeavePendingDto,
  LeaveRequestDto,
} from '../../app/lib/leave-api';
import { submitLeave } from '../../app/lib/leave-api';
import { render } from './project-fixtures';

const TODAY = '2026-10-10'; // test-only

const req = (over: Partial<LeaveRequestDto> = {}): LeaveRequestDto => ({
  id: 'l-1',
  userId: 'u-1',
  startDate: '2026-10-14',
  endDate: '2026-10-16',
  days: 3,
  note: null,
  status: 'pending',
  decidedBy: null,
  decidedAt: null,
  rejectReason: null,
  createdAt: '2026-10-09T03:00:00.000Z',
  canCancel: true,
  ...over,
});

const me = (state: LeaveMeDto['state'], request: LeaveRequestDto | null): LeaveMeDto => ({
  state,
  request,
  history: request ? [request] : [],
  requiresApproval: true,
});

const card = (m: LeaveMeDto) =>
  render(
    <LeaveCard
      me={m}
      approvers="manager_or_admin"
      today={TODAY}
      busy={false}
      onRequest={() => {}}
      onCancel={() => {}}
    />,
  );

describe('LeaveCard', () => {
  it('none: the availability sentence and only the "Ajukan cuti" button', async () => {
    const html = await card(me('none', null));
    expect(html).toContain('Tidak sedang cuti. Rekan melihat Anda sebagai Tersedia.');
    expect(html).toContain('Ajukan cuti');
    expect(html).not.toContain('Menunggu persetujuan');
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it('pending: range, badge, who got it and "Batalkan pengajuan"', async () => {
    const html = await card(me('pending', req()));
    expect(html).toContain('Cuti 14–16 Okt 2026');
    expect(html).toContain('Menunggu persetujuan');
    expect(html).toContain('Dikirim ke Pengelola proyek Anda atau Admin');
    expect(html).toContain('Batalkan pengajuan');
    expect(html).not.toContain('Ajukan cuti');
  });

  it('approved: badge, the approver and "Cuti sampai", with "Batalkan cuti"', async () => {
    const request = req({
      status: 'approved',
      decidedBy: { id: 'a', name: 'Ayu' },
      startDate: '2026-10-09',
    });
    const html = await card(me('approved', request));
    expect(html).toContain('Disetujui');
    expect(html).toContain(
      'Disetujui oleh Ayu. Rekan melihat Anda sebagai Cuti sampai 16 Okt 2026.',
    );
    expect(html).toContain('Batalkan cuti');
    expect(html).not.toContain('Batalkan pengajuan');
  });

  it('approved without an approver: "Cuti langsung berlaku"', async () => {
    const html = await card(me('approved', req({ status: 'approved' })));
    expect(html).toContain('Cuti langsung berlaku.');
    expect(html).not.toContain('Disetujui oleh');
  });

  it('rejected: badge, the reason and "Ajukan lagi"', async () => {
    const request = req({
      status: 'rejected',
      decidedBy: { id: 'a', name: 'Ayu' },
      rejectReason: 'Ada tenggat tanggal 16 Okt',
      canCancel: false,
    });
    const html = await card(me('rejected', request));
    expect(html).toContain('Ditolak');
    expect(html).toContain('Alasan Ayu: Ada tenggat tanggal 16 Okt');
    expect(html).toContain('Ajukan lagi');
    expect(html).not.toContain('Batalkan');
  });

  it('lists earlier requests under the card without repeating the one on it', async () => {
    const older = req({
      id: 'l-0',
      status: 'canceled',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    });
    const current = req();
    const html = await card({ ...me('pending', current), history: [current, older] });
    expect(html).toContain('Riwayat cuti');
    expect(html).toContain('1–2 Sep 2026 · Dibatalkan');
    expect(html).not.toContain('14–16 Okt 2026 · Menunggu persetujuan');
  });

  it('shows no history block when there is nothing but the current request', async () => {
    expect(await card(me('pending', req()))).not.toContain('Riwayat cuti');
  });
});

const viewProps = {
  today: TODAY,
  approvers: 'manager_or_admin' as const,
  autoApproves: false,
  blocker: null,
  error: null,
  loading: false,
  onChange: () => {},
  onSubmit: () => {},
  onCancel: () => {},
};

describe('LeaveRequestView', () => {
  const values = { from: '2026-10-14', to: '2026-10-16', note: 'Cuti keluarga' };

  it('has both date fields, the note, Batal and "Kirim pengajuan" for a Member', async () => {
    const html = await render(<LeaveRequestView {...viewProps} values={values} />);
    expect(html).toContain('Dari tanggal');
    expect(html).toContain('Sampai tanggal');
    expect(html).toContain('Catatan (boleh kosong)');
    expect(html).toContain('Cuti keluarga');
    expect(html).toContain('>Batal<');
    expect(html).toContain('Kirim pengajuan');
    expect(html).toContain('Pengajuan dikirim ke Pengelola proyek Anda atau Admin.');
    expect(html).not.toContain('Simpan cuti');
  });

  it('says "Simpan cuti" when the leave is approved on the spot', async () => {
    const html = await render(
      <LeaveRequestView {...viewProps} approvers="none" autoApproves values={values} />,
    );
    expect(html).toContain('Simpan cuti');
    expect(html).not.toContain('Kirim pengajuan');
    expect(html).toContain('langsung berlaku');
  });

  it('tells a Project Manager the request goes to Admin', async () => {
    const html = await render(
      <LeaveRequestView {...viewProps} approvers="admin" values={values} />,
    );
    expect(html).toContain('Pengajuan dikirim ke Admin.');
  });

  it('disables the send button and says why while the form is incomplete', async () => {
    const html = await render(
      <LeaveRequestView
        {...viewProps}
        values={{ from: null, to: null, note: '' }}
        blocker="Pilih tanggal mulai cuti."
      />,
    );
    expect(html).toContain('Pilih tanggal mulai cuti.');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>).)*Kirim pengajuan/s);
  });

  it('keeps the fields and shows a server refusal inside the dialog', async () => {
    const error = 'Rentang ini beririsan dengan cuti Anda yang lain.';
    const html = await render(<LeaveRequestView {...viewProps} values={values} error={error} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain(error);
    expect(html).toContain('Cuti keluarga');
    expect(html).toContain('value="14 ');
    expect(html).toContain('value="16 ');
  });
});

describe('a refused request reaches the dialog as the server wrote it', () => {
  afterEach(() => spyOn(globalThis, 'fetch').mockRestore());

  it('turns a 409 LEAVE_OVERLAP answer into the sentence the dialog shows', async () => {
    const message = 'Rentang ini beririsan dengan cuti Anda yang lain.';
    spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: message, code: 'LEAVE_OVERLAP', status: 409 }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const err = await submitLeave({
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      note: null,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('LEAVE_OVERLAP');
    expect(describeApiError(err)).toBe(message);
  });
});

const pending = (over: Partial<LeavePendingDto> = {}): LeavePendingDto => ({
  id: 'l-9',
  requester: { id: 'u-9', name: 'Dodi' },
  startDate: '2026-10-14',
  endDate: '2026-10-16',
  days: 3,
  note: 'Ke dokter',
  createdAt: '2026-10-09T03:00:00.000Z',
  dueTasks: 2,
  ...over,
});

const list = (items: LeavePendingDto[], total = items.length, approvingId: string | null = null) =>
  render(
    <LeaveApprovalList
      page={{ items, total, page: 1, limit: 20 }}
      approvingId={approvingId}
      onApprove={() => {}}
      onReject={() => {}}
    />,
  );

describe('LeaveApprovalList', () => {
  it('shows who asks, the range, the days, the due tasks, the note and both buttons', async () => {
    const html = await list([pending()]);
    expect(html).toContain('Dodi');
    expect(html).toContain('14–16 Okt 2026 · 3 hari');
    expect(html).toContain('2 tugas jatuh tempo selama cuti');
    expect(html).toContain('Catatan: Ke dokter');
    expect(html).toContain('Setujui');
    expect(html).toContain('Tolak');
  });

  it('says there are no due tasks instead of "0 tugas"', async () => {
    const html = await list([pending({ dueTasks: 0, note: null })]);
    expect(html).toContain('Tidak ada tugas jatuh tempo');
    expect(html).not.toContain('0 tugas');
    expect(html).not.toContain('Catatan:');
  });

  it('shows an informative empty state', async () => {
    const html = await list([]);
    expect(html).toContain('Tidak ada pengajuan yang menunggu');
    expect(html).not.toContain('Setujui');
  });

  it('says how many are shown when the list is cut', async () => {
    expect(await list([pending()], 31)).toContain('Menampilkan 1 dari 31 pengajuan.');
  });

  it('spins the approve button of the request being approved and holds its Tolak button', async () => {
    const html = await list([pending(), pending({ id: 'l-10' })], 2, 'l-9');
    expect(html.match(/<button[^>]*data-loading="true"/g)).toHaveLength(1);
    expect(html.match(/<button[^>]*data-disabled="true"/g)).toHaveLength(1);
  });
});

describe('LeaveRejectView', () => {
  it('names the requester, explains the impact and has an optional reason', async () => {
    const html = await render(
      <LeaveRejectView
        item={pending()}
        reason="Ada tenggat"
        error={null}
        loading={false}
        onReason={() => {}}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain('Dodi, 14–16 Okt 2026.');
    expect(html).toContain('Pemohon dikabari');
    expect(html).toContain('Alasan (boleh kosong)');
    expect(html).toContain('Ada tenggat');
    expect(html).toContain('Tolak pengajuan');
    expect(html).toContain('>Batal<');
  });

  it('keeps a refusal such as ALREADY_DECIDED inside the dialog', async () => {
    const html = await render(
      <LeaveRejectView
        item={pending()}
        reason=""
        error="Pengajuan ini sudah diputuskan."
        loading={false}
        onReason={() => {}}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Pengajuan ini sudah diputuskan.');
  });
});

const page = (flags: Partial<LeavePageData['flags']>, withPending = false): LeavePageData => ({
  me: me('none', null),
  today: TODAY,
  pending: withPending ? { items: [pending()], total: 1, page: 1, limit: 20 } : null,
  flags: {
    canDecide: false,
    canManageSwitch: false,
    autoApproves: false,
    approvers: 'manager_or_admin',
    ...flags,
  },
});

const sections = (data: LeavePageData) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LeaveSections leave={data} />
    </QueryClientProvider>,
  );

describe('LeaveSections follow the loader flags', () => {
  it('a Member sees Ketersediaan only', async () => {
    const html = await sections(page({}));
    expect(html).toContain('Ketersediaan');
    expect(html).not.toContain('Persetujuan cuti');
    expect(html).not.toContain('Pengaturan tim');
    expect(html).not.toContain('Cuti perlu persetujuan');
  });

  it('an approver also sees Persetujuan cuti with the waiting requests, but not the team switch', async () => {
    const html = await sections(page({ canDecide: true, approvers: 'admin' }, true));
    expect(html).toContain('Persetujuan cuti');
    expect(html).toContain('Dodi');
    expect(html).not.toContain('Pengaturan tim');
  });

  it('an Admin sees all three, the switch with its explanation', async () => {
    const html = await sections(
      page({ canDecide: true, canManageSwitch: true, autoApproves: true, approvers: 'none' }, true),
    );
    expect(html).toContain('Ketersediaan');
    expect(html).toContain('Persetujuan cuti');
    expect(html).toContain('Pengaturan tim');
    expect(html).toContain('Cuti perlu persetujuan');
    expect(html).toContain('Bila dimatikan, semua cuti langsung berlaku.');
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
  });

  it('shows the switch off when the workspace does not require approval', async () => {
    const data = page({ canManageSwitch: true });
    data.me = { ...data.me, requiresApproval: false };
    const html = await sections(data);
    expect(html).toContain('Mati');
    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
  });
});
