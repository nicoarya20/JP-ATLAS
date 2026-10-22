/** Pengaturan › Pemberitahuan: the two switches mirror the saved state and the always-on cards get no switch. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { NOTIFICATIONS_COPY } from '../../app/components/account/account.copy';
import { NotificationsCard } from '../../app/components/account/NotificationsCard';
import type { NotificationPrefs } from '../../app/lib/profile-api';

const render = (initial: NotificationPrefs) =>
  renderToString(
    <MantineProvider>
      <QueryClientProvider client={new QueryClient()}>
        <NotificationsCard initial={initial} />
      </QueryClientProvider>
    </MantineProvider>,
  );

const SWITCH_ORDER: string[] = [NOTIFICATIONS_COPY.eventReminder, NOTIFICATIONS_COPY.inboxNews];

/** The `checked` state of the switch labelled `label` (switches render in `SWITCH_ORDER`). */
function isChecked(html: string, label: string): boolean {
  const inputs = [...html.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)].map((m) => m[0]);
  return /\bchecked(=""|\s|\/|>)/.test(inputs[SWITCH_ORDER.indexOf(label)] ?? '');
}

describe('NotificationsCard', () => {
  it('shows exactly two switches, both on for a user who never opted out', () => {
    const html = render({ eventReminder: true, inboxNews: true });
    expect(html).toContain(NOTIFICATIONS_COPY.eventReminder);
    expect(html).toContain(NOTIFICATIONS_COPY.inboxNews);
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(isChecked(html, NOTIFICATIONS_COPY.eventReminder)).toBe(true);
    expect(isChecked(html, NOTIFICATIONS_COPY.inboxNews)).toBe(true);
  });

  it('reflects a saved opt-out on the right switch only', () => {
    const html = render({ eventReminder: true, inboxNews: false });
    expect(isChecked(html, NOTIFICATIONS_COPY.eventReminder)).toBe(true);
    expect(isChecked(html, NOTIFICATIONS_COPY.inboxNews)).toBe(false);
  });

  it('tells the reader that the tasks waiting on them always show up', () => {
    expect(render({ eventReminder: false, inboxNews: false })).toContain(
      'selalu tampil dan tidak bisa dimatikan',
    );
  });
});
