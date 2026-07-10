import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { StoreProvider } from './context/StoreContext';
import ScrollToTop from './components/ScrollToTop.jsx';
import App from './App';
import './index.css';

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
