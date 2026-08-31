import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';

console.log('InfinityPlay Radio App v2.0 - API Refactor Loaded');

// Service worker: nova verzija se instalira i "čeka". Primenimo je AUTOMATSKI čim
// je bezbedno — tj. kad korisnik ne sluša radio — pa se prečica na telefonu sama
// osveži, bez brisanja i ponovnog dodavanja. Slušanje se nikad ne prekida: ako
// deploy stigne usred emitovanja, čekamo da reprodukcija pauzira (event 'radio:idle'
// ili poll na svakih 30s), pa tek onda aktiviramo novi SW i osvežimo. Pri otvaranju
// prečice ništa ne svira, pa se update primeni odmah i nevidljivo.
const updateSW = registerSW({
  onNeedRefresh() {
    let applied = false;
    const applyIfIdle = () => {
      if (applied) return;
      if (!window.__radioIsPlaying) {
        applied = true;
        window.removeEventListener('radio:idle', applyIfIdle);
        updateSW(true); // aktiviraj čekajući SW (skipWaiting) + reload sa svežim kodom
      }
    };
    window.addEventListener('radio:idle', applyIfIdle);
    const poll = setInterval(() => {
      if (applied) { clearInterval(poll); return; }
      applyIfIdle();
    }, 30000);
    applyIfIdle(); // pri otvaranju prečice ništa ne svira -> primeni odmah
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
