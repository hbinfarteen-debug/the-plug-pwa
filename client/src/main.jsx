import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW Registered!', reg);
        // Request notification permission if not yet granted
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      })
      .catch(err => console.log('SW Registration Failed', err));
  });
}
