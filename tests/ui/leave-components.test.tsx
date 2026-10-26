/**
 * Leave UI since P14: Ketersediaan on /app/settings is read-only (CU-05) and the Inbox rejection
 * dialog is the last piece of the old approval flow still standing (it leaves in CU-06).
 */
import { describe, expect, it } from 'bun:test';
import { LeaveCard } from '../../app/components/leave/LeaveCard';
import {
  type LeaveRejectTarget,
  LeaveRejectView,
} from '../../app/components/leave/LeaveRejectModal';
import { LeaveSections } from '../../app/components/leave/LeaveSections';
import type { LeavePageData } from '../../app/lib/leave-api';
import { render } from './project-fixtures';

const TODAY = '2026-10-10'; // test-only

const card = (onLeaveUntil: string | null) => render(<LeaveCard onLeaveUntil={onLeaveUntil} />);

describe('LeaveCard is read-only', () => {
  it('here: says so and offers no button at all', async () => {
    const html = await card(null);
    expect(html).toContain('Tidak sedang cuti. Rekan melihat Anda sebagai Tersedia.');
    expect(html).not.toContain('Ajukan cuti');
    expect(html.match(/<button/g)).toBeNull();
  });

  it('on leave: names the last day and still offers no button', async () => {
    const html = await card('2026-10-16');
    expect(html).toContain('Cuti sampai 16 Okt 2026.');
    expect(html).toContain('Sedang cuti');
    expect(html.match(/<button/g)).toBeNull();
  });

  it('says where leave is arranged instead, in both states (P14 §8 R4)', async () => {
    // Without this sentence the Member only sees a button that disappeared.
    for (const until of [null, '2026-10-16']) {
      const html = await card(until);
      expect(html).toContain('Pengajuan cuti diurus lewat HRD atau atasanmu, bukan di aplikasi ini.');
    }
  });
});

const target = (over: Partial<LeaveRejectTarget> = {}): LeaveRejectTarget => ({
  id: 'l-9',
  name: 'Dodi',
  startDate: '2026-10-14',
  endDate: '2026-10-16',
  ...over,
});

describe('LeaveRejectView', () => {
  it('names the requester, explains the impact and has an optional reason', async () => {
    const html = await render(
      <LeaveRejectView
        item={target()}
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
        item={target()}
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

const page = (onLeaveUntil: string | null = null): LeavePageData => ({
  onLeaveUntil,
  today: TODAY,
});

const sections = (data: LeavePageData) => render(<LeaveSections leave={data} />);

describe('LeaveSections', () => {
  it('is Ketersediaan alone: no approval queue and no team switch left', async () => {
    const html = await sections(page());
    expect(html).toContain('Ketersediaan');
    expect(html).not.toContain('Persetujuan cuti');
    expect(html).not.toContain('Pengaturan tim');
    expect(html).not.toContain('Cuti perlu persetujuan');
    expect(html).not.toContain('Ajukan cuti');
    expect(html).not.toMatch(/type="checkbox"/);
  });

  it('reads the same for everyone: there is no role flag to follow any more (P14 D3)', async () => {
    const html = await sections(page('2026-10-16'));
    expect(html).toContain('Cuti sampai 16 Okt 2026.');
    expect(html).not.toContain('Pengaturan tim');
  });
});
