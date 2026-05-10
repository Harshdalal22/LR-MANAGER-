import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// StrictMode causes every useEffect to run twice in development.
// In production we skip it to avoid double Supabase API calls on startup.
const isDev = (import.meta as any).env?.DEV === true;

root.render(
  isDev
    ? <React.StrictMode><App /></React.StrictMode>
    : <App />
);

// Hide the splash screen once React has painted its first frame
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('app-splash');
    if (splash) splash.classList.add('hidden');
  });
});
