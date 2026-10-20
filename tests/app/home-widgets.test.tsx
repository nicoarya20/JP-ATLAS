/** Beranda widgets: what each block shows from real data, its empty state and its retry prompt. */
import { describe, expect, it } from 'bun:test';
import { HomeActivity } from '../../app/components/home/HomeActivity';
import { HomeAgenda } from '../../app/components/home/HomeAgenda';
import { HomeAskData } from '../../app/components/home/HomeAskData';
import { HomeBriefing } from '../../app/components/home/HomeBriefing';
import { HomeCounters } from '../../app/components/home/HomeCounters';
import { HomeDone } from '../../app/components/home/HomeDone';
import { HomeFocus } from '../../app/components/home/HomeFocus';
import { renderUi } from '../support/render-ui';
import { BUSY, FAILED, NOW, RETRY } from './home.fixtures';

const COUNTERS = BUSY.counters.ok ? BUSY.counters.data : null;
const withCounters = (over: Partial<NonNullable<typeof COUNTERS>>) =>
  ({ ok: true, data: { ...(COUNTERS as NonNullable<typeof COUNTERS>), ...over } }) as const;
const focusOf = (over: Partial<Extract<typeof BUSY.focus, { ok: true }>['data']>) =>
  ({
    ok: true,
    data: { ...(BUSY.focus as Extract<typeof BUSY.focus, { ok: true }>).data, ...over },
  }) as const;

describe('Daily Briefing', () => {
  it('shows the sentences and the real time it was put together, never a fixed one', async () => {
    const html = await renderUi(<HomeBriefing widget={BUSY.briefing} retry={RETRY} />);
    expect(html).toContain('Ada 1 tugas yang terlambat');
    expect(html).toContain('Hari ini ada 2 tugas.');
    expect(html).toContain('Disusun otomatis dari data proyek · diperbarui 10.00');
    expect(html).not.toContain('07.30');
  });

  it('asks to retry when the briefing could not be built', async () => {
    const html = await renderUi(<HomeBriefing widget={FAILED} retry={RETRY} />);
    expect(html).toContain('Bagian ini belum bisa dimuat.');
    expect(html).toContain('Coba lagi');
  });
});

describe('counter tiles', () => {
  it('shows the three numbers with what they count', async () => {
    const html = await renderUi(<HomeCounters widget={BUSY.counters} retry={RETRY} />);
    for (const word of ['Unassigned', 'In Progress', 'Completed', '>3<', '>8<', '>12<']) {
      expect(html).toContain(word);
    }
    expect(html).toContain('di proyek yang Anda kelola');
  });

  it('says why there are no tiles for someone who manages nothing, or belongs to nothing', async () => {
    const none = await renderUi(
      <HomeCounters widget={withCounters({ managedProjects: 0 })} retry={RETRY} />,
    );
    expect(none).toContain('Anda belum mengelola proyek apa pun');
    expect(none).not.toContain('Unassigned');
    const lone = await renderUi(
      <HomeCounters
        widget={withCounters({ managedProjects: 0, memberProjects: 0 })}
        retry={RETRY}
      />,
    );
    expect(lone).toContain('Anda belum masuk proyek apa pun');
  });

  it('asks to retry on failure', async () => {
    expect(await renderUi(<HomeCounters widget={FAILED} retry={RETRY} />)).toContain('Coba lagi');
  });
});

describe('My Focus', () => {
  const render = (widget = BUSY.focus, counters = BUSY.counters) =>
    renderUi(<HomeFocus widget={widget} counters={counters} today={NOW.today} retry={RETRY} />);

  it('groups the rows by urgency in order and links each task', async () => {
    const html = await render();
    const order = ['Terlambat', 'Hari ini', 'Minggu ini', 'Tanpa tenggat'].map((h) =>
      html.indexOf(h),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain('href="/app/tasks/12"');
    expect(html).toContain('Terlambat 2 hari');
    expect(html).toContain('Hajatan Keluarga');
  });

  it('gives a row the button the server allowed: Selesai, Mulai kerjakan, or none', async () => {
    const html = await render();
    expect(html.match(/>Selesai</g)).toHaveLength(2);
    expect(html.match(/>Mulai kerjakan</g)).toHaveLength(1);
    // The fourth task has no action: its row holds the title and no button of its own.
    expect(html).toContain('Tunggu kabar');
  });

  it('offers Periksa only for a task waiting on me, and counts it in the footer', async () => {
    const html = await render();
    expect(html).toContain('Periksa tombol simpan');
    expect(html).toContain('href="/app/tasks/20"');
    expect(html).toContain('Lihat semua tugas (9) · 1 menunggu diperiksa');
    const none = await render(focusOf({ awaitingReview: [], awaitingReviewTotal: 0 }));
    expect(none).not.toContain('>Periksa<');
    expect(none).toContain('Lihat semua tugas (9)');
    expect(none).not.toContain('menunggu diperiksa');
  });

  it('tells a finished day from a person with no project', async () => {
    const empty = focusOf({
      items: [],
      total: 0,
      overdueTotal: 0,
      todayTotal: 0,
      awaitingReview: [],
      awaitingReviewTotal: 0,
    });
    expect(await render(empty)).toContain('Tidak ada tugas yang menunggu Anda. Semua beres.');
    const lone = await render(empty, withCounters({ memberProjects: 0, managedProjects: 0 }));
    expect(lone).toContain('Anda belum masuk proyek apa pun');
    expect(lone).toContain('Minta Admin atau Project Manager');
  });

  it('asks to retry on failure', async () => {
    expect(await render(FAILED)).toContain('Coba lagi');
  });
});

describe('Tasks Completed This Week', () => {
  it('lists who finished what and when, with the real total', async () => {
    const html = await renderUi(<HomeDone widget={BUSY.done} retry={RETRY} />);
    expect(html).toContain('Survei harga keramik');
    expect(html).toContain('Anda · hari ini');
    expect(html).toContain('Dodi · Rabu');
    expect(html).toContain('Lihat semua (4)');
    expect(html).toContain('status=selesai');
  });

  it('says nothing was finished yet, or asks to retry', async () => {
    const empty = await renderUi(
      <HomeDone widget={{ ok: true, data: { items: [], total: 0 } }} retry={RETRY} />,
    );
    expect(empty).toContain('Belum ada tugas selesai pekan ini.');
    expect(await renderUi(<HomeDone widget={FAILED} retry={RETRY} />)).toContain('Coba lagi');
  });
});

describe('Ask Data', () => {
  it('offers the fixed questions and shows the first answer with its bars', async () => {
    const html = await renderUi(<HomeAskData widget={BUSY.ask} retry={RETRY} />);
    for (const q of [
      'Proyek mana yang tertinggal?',
      'Tugas apa yang paling lama tertunda?',
      'Siapa paling banyak tugas?',
    ]) {
      expect(html).toContain(q);
    }
    expect(html).toContain('Hajatan Keluarga paling tertinggal');
    expect(html).toContain('40%');
    expect(html).toContain('aria-pressed="true"');
  });

  it('has no text box and no microphone: nothing could answer a free question honestly', async () => {
    const html = await renderUi(<HomeAskData widget={BUSY.ask} retry={RETRY} />);
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('Ucapkan');
    expect(html).toContain('Tanya bebas belum tersedia');
  });

  it('asks to retry on failure', async () => {
    expect(await renderUi(<HomeAskData widget={FAILED} retry={RETRY} />)).toContain('Coba lagi');
  });
});

describe('Agenda & Projects', () => {
  const render = (agenda = BUSY.agenda, projects = BUSY.projects) =>
    renderUi(
      <HomeAgenda agenda={agenda} projects={projects} timeZone={NOW.timeZone} retry={RETRY} />,
    );

  it('shows today and tomorrow with the clock of the team zone and links to the events', async () => {
    const html = await render();
    expect(html).toContain('Hari ini');
    expect(html).toContain('Besok');
    expect(html).toContain('>10.00<'); // 03:00Z is 10.00 WIB
    expect(html).toContain('>09.00<'); // 02:00Z on the next day
    expect(html).toContain('href="/app/events/e1"');
    expect(html).toContain('Rapat panitia hajatan');
  });

  it('shows each project with its condition, progress and what makes it so', async () => {
    const html = await render();
    expect(html).toContain('href="/app/projects/p1"');
    expect(html).toContain('Perlu perhatian');
    expect(html).toContain('Lancar');
    expect(html).toContain('4 dari 10 tugas selesai');
    expect(html).toContain('1 tugas penting terlambat');
    expect(html).toContain('tenggat 24 Okt 2026');
    expect(html).toContain('href="/app/projects"');
  });

  it('has an empty state for each half', async () => {
    const html = await render({ ok: true, data: [] }, { ok: true, data: [] });
    expect(html).toContain('Tidak ada acara hari ini atau besok.');
    expect(html).toContain('Belum ada proyek berjalan.');
  });

  it('fails one half without losing the other', async () => {
    const html = await render(FAILED);
    expect(html).toContain('Coba lagi');
    expect(html).toContain('Hajatan Keluarga');
  });
});

describe('Latest Activity', () => {
  it('shows the sentence, the project and a link to the task', async () => {
    const html = await renderUi(<HomeActivity widget={BUSY.activity} retry={RETRY} />);
    expect(html).toContain('Anda menyelesaikan &quot;Survei harga keramik&quot;');
    expect(html).toContain('Hajatan Keluarga');
    expect(html).toContain('href="/app/tasks/30"');
  });

  it('has an empty state and a retry prompt', async () => {
    const empty = await renderUi(<HomeActivity widget={{ ok: true, data: [] }} retry={RETRY} />);
    expect(empty).toContain('Belum ada aktivitas di proyek Anda.');
    expect(await renderUi(<HomeActivity widget={FAILED} retry={RETRY} />)).toContain('Coba lagi');
  });
});
