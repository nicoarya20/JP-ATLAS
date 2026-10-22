/** Warns before leaving a form with unsaved changes (in-app navigation and tab close). */
import { modals } from '@mantine/modals';
import { useEffect } from 'react';
import { useBlocker } from 'react-router';

export const DISCARD_TITLE = 'Buang perubahan?';
export const DISCARD_BODY =
  'Perubahan yang belum disimpan akan hilang dan tidak bisa dikembalikan.';
export const DISCARD_LABEL = 'Buang perubahan';
export const STAY_LABEL = 'Lanjut mengisi';

/** Opens the discard dialog; exactly one of `onDiscard`/`onStay` runs, whichever way the dialog closes. */
export function openDiscardConfirm(handlers: { onDiscard: () => void; onStay: () => void }) {
  let decided = false;
  const decide = (discard: boolean) => {
    if (decided) return;
    decided = true;
    if (discard) handlers.onDiscard();
    else handlers.onStay();
  };
  modals.openConfirmModal({
    title: DISCARD_TITLE,
    children: DISCARD_BODY,
    labels: { confirm: DISCARD_LABEL, cancel: STAY_LABEL },
    confirmProps: { color: 'danger' },
    onConfirm: () => decide(true),
    onCancel: () => decide(false),
    // Escape / the close button / a click outside also mean "stay"; `decided` ignores the close after a confirm.
    onClose: () => decide(false),
  });
}

/** Blocks navigation while `dirty` is true and asks first; also arms the browser's own tab-close prompt. */
export function useUnsavedGuard(dirty: boolean) {
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    openDiscardConfirm({ onDiscard: () => blocker.proceed(), onStay: () => blocker.reset() });
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
