import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { modals } from '@mantine/modals';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import {
  DISCARD_LABEL,
  DISCARD_TITLE,
  openDiscardConfirm,
  STAY_LABEL,
  useUnsavedGuard,
} from '../app/lib/use-unsaved-guard';

type ConfirmProps = Parameters<typeof modals.openConfirmModal>[0];
const spies: Array<{ mockRestore: () => void }> = [];
afterEach(() => {
  for (const s of spies.splice(0)) s.mockRestore();
});

function captureDialog() {
  let props: ConfirmProps | null = null;
  spies.push(
    spyOn(modals, 'openConfirmModal').mockImplementation(((p: ConfirmProps) => {
      props = p;
      return 'm1';
    }) as unknown as typeof modals.openConfirmModal),
  );
  return () => props as ConfirmProps;
}

describe('openDiscardConfirm', () => {
  it('asks "Buang perubahan?" with verb labels, never "OK"', () => {
    const dialog = captureDialog();
    openDiscardConfirm({ onDiscard: () => {}, onStay: () => {} });
    expect(dialog().title).toBe(DISCARD_TITLE);
    expect(dialog().labels).toEqual({ confirm: DISCARD_LABEL, cancel: STAY_LABEL });
  });

  it('discards on confirm, and the close that follows does not also count as "stay"', () => {
    const dialog = captureDialog();
    const log: string[] = [];
    openDiscardConfirm({ onDiscard: () => log.push('discard'), onStay: () => log.push('stay') });
    dialog().onConfirm?.();
    dialog().onClose?.();
    expect(log).toEqual(['discard']);
  });

  it('stays on cancel and on a bare close (Escape / X / outside click), once', () => {
    const dialog = captureDialog();
    const log: string[] = [];
    openDiscardConfirm({ onDiscard: () => log.push('discard'), onStay: () => log.push('stay') });
    dialog().onCancel?.();
    dialog().onClose?.();
    expect(log).toEqual(['stay']);

    const second = captureDialog();
    openDiscardConfirm({ onDiscard: () => log.push('discard'), onStay: () => log.push('stay2') });
    second().onClose?.();
    expect(log).toEqual(['stay', 'stay2']);
  });
});

describe('useUnsavedGuard', () => {
  // Proves the ASSUMPTION of R05 §3.4: `useBlocker` works under a data router (what framework mode uses).
  it('mounts under a data router in both the clean and the dirty state', async () => {
    function Form({ dirty }: { dirty: boolean }) {
      useUnsavedGuard(dirty);
      return <p>form {dirty ? 'kotor' : 'bersih'}</p>;
    }
    for (const dirty of [false, true]) {
      const handler = createStaticHandler([
        { id: 'r', path: '/', Component: () => <Form dirty={dirty} /> },
      ]);
      const context = await handler.query(new Request('http://x/'));
      if (context instanceof Response) throw new Error('unexpected redirect');
      const router = createStaticRouter(handler.dataRoutes, context);
      const html = renderToString(
        <StaticRouterProvider router={router} context={context} hydrate={false} />,
      );
      expect(html).toContain(dirty ? 'kotor' : 'bersih');
    }
  });
});
