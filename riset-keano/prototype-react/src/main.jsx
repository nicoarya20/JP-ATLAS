// Phone entry (phone.html, loaded in the index iframe): read ?role=&mode=#screen, register screens, mount the app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import './screens';
import './styles/library.css';   // after the screens: overrides the library scss they pull in
import { AppProvider } from './core/app.context';
import { PhoneApp } from './core/PhoneApp';
import { START_SCREEN, readUrl, setRole } from './core/session';
import { allowed } from './core/registry';

const url = readUrl();
setRole(url.role);
document.documentElement.classList.toggle('dark', url.mode === 'dark');
const start = allowed(url.screen, url.role) ? url.screen : START_SCREEN;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider start={start}>
      <PhoneApp />
    </AppProvider>
  </StrictMode>,
);
