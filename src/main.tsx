import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { buildApp } from './app/composition';
import { App } from './app/App';
import './app/globals.css';
const services = buildApp();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App {...services} />
  </StrictMode>,
);
