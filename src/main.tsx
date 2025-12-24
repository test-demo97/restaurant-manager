/**
 * RESTAURANT MANAGER SYSTEM
 *
 * Copyright (c) 2025 Andrea Fabbri. Tutti i diritti riservati.
 *
 * Questo software è proprietario e confidenziale.
 * L'uso, la copia, la modifica o la distribuzione non autorizzata
 * di questo software è severamente vietata.
 *
 * Licenza: Proprietaria - Vedere file LICENSE per i dettagli
 * Versione: 3.0
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initRealtime } from './lib/realtime';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Avvia le sottoscrizioni realtime (se Supabase è configurato)
try {
  initRealtime();
} catch (e) {
  // ignore
}
