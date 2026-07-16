import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and suppress benign Vite development server websocket/HMR connection errors in the iframe
if (typeof window !== 'undefined') {
  const isBenignWebsocketError = (event: any) => {
    let reason = '';
    if (event && event.reason) {
      reason = event.reason.message || String(event.reason);
    } else if (event && event.message) {
      reason = event.message;
    } else if (event && event.error) {
      reason = event.error.message || String(event.error);
    }
    
    const reasonStr = String(reason).toLowerCase();
    
    if (
      reasonStr.includes('websocket') ||
      reasonStr.includes('failed to connect') ||
      reasonStr.includes('hmr') ||
      reasonStr.includes('closeevent') ||
      reasonStr.includes('headers timeout') ||
      reasonStr.includes('closed without opened')
    ) {
      return true;
    }
    
    if (event && event.reason && typeof event.reason === 'object') {
      const name = event.reason.constructor ? event.reason.constructor.name : '';
      if (name === 'CloseEvent' || name === 'WebSocket' || name === 'ErrorEvent') {
        return true;
      }
    }
    
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isBenignWebsocketError(event)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isBenignWebsocketError(event)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for PWA installability
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerSW = () => {
    const isAISPreview = window.location.pathname.includes('/ais-') || window.location.host.includes('europe-west2.run.app');
    const swUrl = isAISPreview ? './sw.js' : '/sw.js';

    navigator.serviceWorker.register(swUrl)
      .then((registration) => {
        console.log('PWA ServiceWorker registered successfully with scope: ', registration.scope);
        // Force immediate check for Service Worker updates to refresh cache strategies
        registration.update().catch(() => {});
      })
      .catch((error) => {
        console.log('PWA ServiceWorker registration failed: ', error);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}


