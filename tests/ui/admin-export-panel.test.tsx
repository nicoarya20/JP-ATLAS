/**
 * Ekspor data panel (P11 AD-10): one card per kind the endpoint serves, a download button for each,
 * the warning that says what the file holds and that the export is recorded, and the file-name
 * parsing the download helper does on the response header.
 */
import { describe, expect, it } from 'bun:test';
import { EXPORT_KINDS } from '@server/api/admin-export.kinds';
import { SETTINGS_PANELS } from '../../app/components/admin/settings/panels';
import { EksporDataPanel } from '../../app/components/admin/settings/panels/ekspor-data';
import {
  EXPORT_ITEMS,
  EXPORT_PANEL_COPY,
  missingExportCards,
} from '../../app/components/admin/settings/panels/ekspor-data.content';
import { filenameFromDisposition } from '../../app/components/admin/settings/panels/ekspor-data.download';
import { renderUi } from '../support/render-ui';

describe('Ekspor data panel content', () => {
  it('is the panel registered for the ekspor-data tab', () => {
    expect(SETTINGS_PANELS['ekspor-data']).toBe(EksporDataPanel);
  });

  it('shows a card for every kind the endpoint serves', () => {
    expect(missingExportCards()).toEqual([]);
    expect(EXPORT_ITEMS.map((i) => i.kind)).toEqual([...EXPORT_KINDS]);
  });

  it('labels every button with the action, not with "Unduh" alone', () => {
    for (const item of EXPORT_ITEMS) {
      expect(item.action).toStartWith('Unduh CSV ');
      expect(item.action.length).toBeGreaterThan('Unduh CSV '.length);
      expect(item.description.length).toBeGreaterThan(20);
    }
  });
});

describe('Ekspor data panel render', () => {
  it('renders the three cards with their descriptions and buttons', async () => {
    const html = await renderUi(<EksporDataPanel />);
    for (const item of EXPORT_ITEMS) {
      expect(html).toContain(item.label);
      expect(html).toContain(item.action);
    }
    expect(html).toContain('Unduh data organisasi');
  });

  it('says that every download is recorded and what the file holds', async () => {
    const html = await renderUi(<EksporDataPanel />);
    expect(EXPORT_PANEL_COPY.auditNote).toContain('dicatat');
    expect(EXPORT_PANEL_COPY.auditNote).toContain('email');
    expect(html).toContain('Aktivitas beserta jenis dan jumlah barisnya');
  });

  it('offers no confirmation dialog: an export destroys nothing', async () => {
    const html = await renderUi(<EksporDataPanel />);
    expect(html).not.toContain('Hapus');
    expect(html).not.toContain('permanen');
  });
});

describe('filenameFromDisposition', () => {
  it('reads the quoted and the bare form', () => {
    expect(filenameFromDisposition('attachment; filename="anggota-2026-10-21.csv"')).toBe(
      'anggota-2026-10-21.csv',
    );
    expect(filenameFromDisposition('attachment; filename=proyek-2026-10-21.csv')).toBe(
      'proyek-2026-10-21.csv',
    );
  });

  it('falls back to null when the header is missing, empty or has no name', () => {
    expect(filenameFromDisposition(null)).toBeNull();
    expect(filenameFromDisposition('')).toBeNull();
    expect(filenameFromDisposition('attachment')).toBeNull();
  });

  it('refuses a name carrying a path separator', () => {
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"')).toBeNull();
    expect(filenameFromDisposition('attachment; filename="a\\b.csv"')).toBeNull();
  });
});
