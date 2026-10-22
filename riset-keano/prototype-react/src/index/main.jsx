// Index entry (index.html): sidebar with role/mode switch and screen links, plus the phone iframe.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/atlas.css';
import '../styles/tokens.css';
import './index.css';
import '../screens';
import { IndexShell } from './IndexShell';

createRoot(document.getElementById('root')).render(<StrictMode><IndexShell /></StrictMode>);
