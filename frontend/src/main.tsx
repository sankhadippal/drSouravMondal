import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// ─── Clear stale SQLite-era data from localStorage ────────────────────────────
// If the stored token contains old SQLite IDs (not real UUIDs), wipe them
// so the user gets redirected to login with fresh credentials.
(function clearStaleLocalStorage() {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    try {
      // Decode JWT payload (middle section, base64)
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      if (payload?.id && !UUID_RE.test(payload.id)) {
        // Old SQLite ID like "admin-000-0000-0000-000000000001"
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        console.info('[app] Cleared stale auth token (SQLite-era ID)');
      }
    } catch {
      // Corrupt token — clear it
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  // App version bump — clear all stale session/booking state from sessionStorage
  const APP_VERSION = 'v2-pg';
  if (sessionStorage.getItem('app_version') !== APP_VERSION) {
    sessionStorage.clear();
    sessionStorage.setItem('app_version', APP_VERSION);
    console.info('[app] Session storage cleared (new version)');
  }
})();
// ─────────────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' },
          success: { style: { background: '#f0fdfa', border: '1px solid #0d9488', color: '#134e4a' } },
          error: { style: { background: '#fff1f2', border: '1px solid #e11d48', color: '#881337' } },
        }}
      />
    </HelmetProvider>
  </React.StrictMode>
);
