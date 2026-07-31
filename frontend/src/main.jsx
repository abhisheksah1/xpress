import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { StoreProvider } from './context/StoreContext';
import ScrollToTop from './components/ScrollToTop.jsx';
import App from './App';
import './index.css';

// Server-injected H1/meta body is for crawlers only — remove before React mounts.
document.getElementById('seo-prerender')?.remove();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <ScrollToTop />
        <App />
        <Toaster position="top-right" />
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>
);
