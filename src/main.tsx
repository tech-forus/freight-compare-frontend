import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Set up global axios defaults/interceptors (auth header from cookie, etc.)
import './lib/axiosSetup';
import './index.css';
import { AuthProvider } from './hooks/useAuth';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
