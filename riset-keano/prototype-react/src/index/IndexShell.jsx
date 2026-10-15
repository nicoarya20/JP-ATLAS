// Index page: role + mode switch and grouped screen links on the left, the phone (iframe of phone.html) on the right.
// Role/mode changes reload the frame (?role=&mode=); link clicks navigate inside it via postMessage.
import { useEffect, useRef, useState } from 'react';
import { MODES, ROLES, readUrl, setRole as setSessionRole } from '../core/session';
import { MSG } from '../core/app.context';
import { grouped } from '../core/registry';

const PHONE_PAGE = 'phone.html';

/** URL of the phone frame for a role/mode/screen. */
export const phoneSrc = (role, mode, screen) => `${PHONE_PAGE}?role=${role}&mode=${mode}#${screen}`;

export function IndexShell() {
  const initial = readUrl();
  const [role, setRole] = useState(initial.role);
  const [mode, setMode] = useState(initial.mode);
  const [current, setCurrent] = useState(initial.screen);
  // Frame src changes only on role/mode switch; screen changes inside the frame must not reload it.
  const [src, setSrc] = useState(() => phoneSrc(initial.role, initial.mode, initial.screen));
  const frame = useRef(null);

  useEffect(() => {
    const onMessage = e => {
      if (e.origin !== window.location.origin || e.data?.type !== MSG.screen) return;
      setCurrent(e.data.id);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', `?role=${role}&mode=${mode}#${current}`);
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [role, mode, current]);

  const switchTo = (nextRole, nextMode) => {
    setRole(nextRole); setMode(nextMode);
    setSrc(phoneSrc(nextRole, nextMode, current));
  };
  setSessionRole(role); // screen titles may read the role (e.g. "Home · Admin")
  const open = (id, isSheet) => frame.current?.contentWindow?.postMessage({ type: MSG.go, id, replace: !isSheet }, window.location.origin);

  return (
    <div className="ix">
      <aside className="ix-side">
        <h1 className="ix-title">PM Dashboard</h1>
        <p className="ix-note">Role: {ROLES[role]} · sample data</p>
        <Switch label="Role" options={ROLES} value={role} onPick={r => switchTo(r, mode)} />
        <Switch label="Mode" options={MODES} value={mode} onPick={m => switchTo(role, m)} />
        <nav aria-label="Screens">
          {Object.entries(grouped(role)).map(([group, list]) => (
            <section key={group}>
              <h2 className="ix-group">{group}</h2>
              {list.map(s => (
                <a key={s.id} href={`#${s.id}`} aria-current={s.id === current ? 'page' : undefined}
                  onClick={e => { e.preventDefault(); open(s.id, s.sheet); }}>
                  {s.title}{s.sheet ? ' (sheet)' : ''}
                </a>
              ))}
            </section>
          ))}
        </nav>
      </aside>
      <main className="ix-stage">
        <iframe ref={frame} className="ix-phone" src={src} title="Phone prototype" />
      </main>
    </div>
  );
}

/** Small button group for role/mode. */
function Switch({ label, options, value, onPick }) {
  return (
    <div className="ix-switch" role="group" aria-label={label}>
      {Object.entries(options).map(([k, text]) => (
        <button key={k} type="button" aria-pressed={k === value} onClick={() => onPick(k)}>{text}</button>
      ))}
    </div>
  );
}
