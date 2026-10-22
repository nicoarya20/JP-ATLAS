/** The Beranda page as a whole: greeting from the server clock, every block in place, nothing left of the sample data. */
import { describe, expect, it } from 'bun:test';
import AppHome from '../../app/routes/app/home';
import { renderUi } from '../support/render-ui';
import { BUSY, FAILED } from './home.fixtures';

const props = (data = BUSY, name = 'Nico') =>
  ({ loaderData: { seed: { data, loadedAt: Date.parse(data.now.iso) }, name } }) as Parameters<
    typeof AppHome
  >[0];

describe('Beranda page', () => {
  it('greets by the server time of day and date, not a fixed "Selamat pagi"', async () => {
    const morning = await renderUi(<AppHome {...props()} />);
    expect(morning).toContain('Kamis, 8 Oktober 2026 · Selamat pagi, Nico');
    const evening = await renderUi(
      <AppHome {...props({ ...BUSY, now: { ...BUSY.now, greeting: 'malam' } }, 'Rina')} />,
    );
    expect(evening).toContain('Selamat malam, Rina');
    expect(evening).not.toContain('Selamat pagi');
  });

  it('shows every block of the wireframe in reading order', async () => {
    const html = await renderUi(<AppHome {...props()} />);
    const blocks = [
      'Daily Briefing',
      'Unassigned',
      'My Focus',
      'Tasks Completed This Week',
      'Ask Data',
      'Agenda &amp; Projects',
      'Latest Activity',
    ].map((b) => html.indexOf(b));
    expect(blocks.every((i) => i >= 0)).toBe(true);
    expect([...blocks].sort((a, b) => a - b)).toEqual(blocks);
  });

  it('keeps no sample data: only what the loader sent is on the page', async () => {
    const html = await renderUi(<AppHome {...props()} />);
    for (const sample of [
      'diperbarui 07.30',
      'Arisan RT',
      'Kamis, 8 Oktober 2026 · Selamat pagi, Nico Uji',
    ]) {
      expect(html).not.toContain(sample);
    }
    expect(html).toContain('Bayar DP tukang');
  });

  it('keeps the page up when every section failed: each card asks to retry, the greeting stays', async () => {
    const dead = {
      ...BUSY,
      briefing: FAILED,
      counters: FAILED,
      focus: FAILED,
      done: FAILED,
      projects: FAILED,
      agenda: FAILED,
      activity: FAILED,
      ask: FAILED,
    } as typeof BUSY;
    const html = await renderUi(<AppHome {...props(dead)} />);
    expect(html).toContain('Selamat pagi, Nico');
    expect(html.match(/Bagian ini belum bisa dimuat\./g)?.length).toBeGreaterThanOrEqual(7);
    expect(html).toContain('Coba lagi');
  });
});
