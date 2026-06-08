import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { registerServiceWorker } from './utils/pushNotifications';
import { initPwaInstallCapture } from './utils/pwaInstall';
import './index.css';

initPwaInstallCapture();

if ('serviceWorker' in navigator) {
  registerServiceWorker().catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);