/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  // True dok korisnik aktivno sluša radio. Postavlja ga AudioContext; čita ga
  // registracija service worker-a u main.tsx da bi novu verziju primenila tek
  // kad se ne prekida reprodukcija.
  __radioIsPlaying?: boolean;
}
