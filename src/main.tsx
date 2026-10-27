import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { buildApp } from './composition';
import { App } from './ui/App';
import './ui/styles.css';
const services = buildApp();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App {...services} />
  </StrictMode>,
);
