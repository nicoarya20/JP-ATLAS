// The Inbox badge count is asked again, without polling, when the app comes back to the foreground and when the More
// panel unfolds (src/navigation/use-inbox-badge-refresh.ts). The count endpoint is stubbed; nothing else is asked.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { inboxCountResource } from '../../src/data/inbox.api';
import { forgetAllResources } from '../../src/data/resource';
import { useInboxBadgeRefresh } from '../../src/navigation/use-inbox-badge-refresh';
import { serveAuth } from '../helpers/auth-server';

let server: ReturnType<typeof serveAuth>;
let change: ((next: AppStateStatus) => void) | null = null;
const remove = jest.fn();

beforeEach(() => {
  forgetAllResources();
  remove.mockClear();
  let action = 2;
  server = serveAuth({
    '/api/app/inbox/count': () => ({ body: { action: action++, infoUnread: 0 } }),
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    change = handler as (next: AppStateStatus) => void;
    return { remove } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});
afterEach(() => {
  server.restore();
  change = null;
  jest.restoreAllMocks();
});

const asked = () => server.calls.filter((u) => u.includes('/api/app/inbox/count')).length;
const goTo = (next: AppStateStatus) => act(() => change?.(next));

test('back from the background asks the count again; staying active does not', async () => {
  await inboxCountResource.ensure();
  await renderHook(() => useInboxBadgeRefresh(false));
  expect(asked()).toBe(1);
  await goTo('background');
  expect(asked()).toBe(1);
  await goTo('active');
  await waitFor(() => expect(inboxCountResource.current()?.action).toBe(3));
  expect(asked()).toBe(2);
  await goTo('active');
  expect(asked()).toBe(2);
});

test('each time the More panel unfolds the count is asked again', async () => {
  await inboxCountResource.ensure();
  const hook = await renderHook<void, { open: boolean }>(({ open }) => useInboxBadgeRefresh(open), {
    initialProps: { open: false },
  });
  await hook.rerender({ open: true });
  await waitFor(() => expect(asked()).toBe(2));
  await hook.rerender({ open: false });
  await hook.rerender({ open: true });
  await waitFor(() => expect(asked()).toBe(3));
  expect(inboxCountResource.current()?.action).toBe(4);
});

test('a count nobody has asked for yet is not fetched; leaving stops listening', async () => {
  const hook = await renderHook(() => useInboxBadgeRefresh(true));
  await goTo('background');
  await goTo('active');
  expect(asked()).toBe(0);
  await hook.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});
