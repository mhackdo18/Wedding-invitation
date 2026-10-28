import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Mobile toolbars resize the viewport on scroll; only re-measure on width changes (rotation) so full-screen sections stay fixed
let lastWidth = 0;
const setStableViewportHeight = () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  document.documentElement.style.setProperty('--stable-vh', `${window.innerHeight}px`);
};
setStableViewportHeight();
window.addEventListener('resize', setStableViewportHeight);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
