import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

console.log('InfinityPlay Radio App v2.0 - API Refactor Loaded');

// NAMERNO ne osvežavamo stranicu na SW update — korisnici slušaju radio, pa ne
// želimo da im deploy prekine reprodukciju. Nova verzija se primeni pri sledećem
// prirodnom otvaranju/osvežavanju aplikacije.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
