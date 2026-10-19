// Phone shell: renders the current screen, its tab bar, the open sheet (bottom or full-height) and the toast; keeps the URL and the index in sync.
import { useEffect, useRef, useState } from 'react';
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from '@react-cupertino-ui/bottom-sheet';
import { Toast } from '@react-cupertino-ui/toast';
import { MSG, TOAST_MS, useApp } from './app.context';
import { getScreen, getSheet } from './registry';
import { FullSheet } from '../kit/fullsheet';
import { AppTabBar, TabBarHost } from '../kit/layout';

export const DEFAULT_SHEET_SNAP = 0.6;

/** Mirror the current screen into ?role=…#id (other query params kept) and tell the index which screen is open. */
function useUrlSync(current, role) {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    q.set('role', role);
    window.history.replaceState(null, '', `?${q}#${current}`);
    if (window.parent !== window) window.parent.postMessage({ type: MSG.screen, id: current }, window.location.origin);
  }, [current, role]);
}

/** Accept navigation requests from the index page (same origin only). */
function useIndexMessages(go) {
  useEffect(() => {
    const onMessage = e => {
      if (e.origin !== window.location.origin || e.data?.type !== MSG.go) return;
      go(e.data.id, { replace: !!e.data.replace });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [go]);
}

const titleOf = def => (typeof def.title === 'function' ? def.title() : def.title);

/** The open sheet: a library BottomSheet, or a FullSheet overlay for sheets registered with full: true. */
function OpenSheet() {
  const { sheet, closeSheet } = useApp();
  const def = sheet && getSheet(sheet.id);
  const bottom = def && !def.full ? def : null;
  const snap = bottom?.snap ?? DEFAULT_SHEET_SNAP;
  // The last full sheet stays rendered after it closes so its slide-down exit animation has something to move.
  const lastFull = useRef(null);
  if (def?.full) lastFull.current = { ...sheet, def };
  const full = lastFull.current;
  return (
    <>
      <BottomSheet open={!!bottom} onOpenChange={open => { if (!open) closeSheet(); }}>
        {bottom && (
          <BottomSheetContent key={sheet.id} snapPoints={[snap]} initialSnap={snap} aria-describedby={undefined}>
            {/* Radix needs a dialog title; sheets render their own visible heading through <Sheet title>. */}
            <BottomSheetTitle className="sr-only">{titleOf(bottom)}</BottomSheetTitle>
            <bottom.Component params={sheet.params} />
          </BottomSheetContent>
        )}
      </BottomSheet>
      {full && (
        <FullSheet open={!!def?.full} onClose={closeSheet} title={titleOf(full.def)}>
          <full.def.Component key={full.id} params={full.params} />
        </FullSheet>
      )}
    </>
  );
}

export function PhoneApp() {
  const app = useApp();
  useUrlSync(app.current, app.role);
  useIndexMessages(app.go);
  const Screen = getScreen(app.current).Component;
  const [tab, setTab] = useState(null);   // the shown screen's tab (via <Screen tab>); the bar lives here to outlast it
  return (
    <div className="phone-app">
      <div className="statusbar" aria-hidden="true"><span>9:41</span></div>
      <TabBarHost.Provider value={setTab}>
        <Screen key={app.current} params={app.params} />
      </TabBarHost.Provider>
      {tab && <AppTabBar active={tab} />}
      <OpenSheet />
      {app.toastState && (
        <Toast key={app.toastState.key} className="app-toast" title={app.toastState.msg} position="top-center" glass={false} duration={TOAST_MS} onClose={app.clearToast} />
      )}
    </div>
  );
}
