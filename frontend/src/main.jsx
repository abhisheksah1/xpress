import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { StoreProvider } from './context/StoreContext';
import ScrollToTop from './components/ScrollToTop.jsx';
import App from './App';
import './index.css';

/**
 * Keep server H1 until React paints its own — Rank Math / non-JS crawlers need a real H1
 * in the first HTML. Removing it too early (or using a hidden H1) fails external audits.
 */
function removeSeoPrerenderWhenPageHasH1() {
  const tryRemove = () => {
    const root = document.getElementById('root');
    const pageH1 = root?.querySelector('h1');
    if (!pageH1) return false;
    document.getElementById('seo-prerender')?.remove();
    return true;
  };

  if (tryRemove()) return;

  const root = document.getElementById('root');
  if (!root || typeof MutationObserver === 'undefined') {
    setTimeout(tryRemove, 2500);
    return;
  }

  const observer = new MutationObserver(() => {
    if (tryRemove()) observer.disconnect();
  });
  observer.observe(root, { childList: true, subtree: true });
  setTimeout(() => {
    observer.disconnect();
    tryRemove();
  }, 8000);
}

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

removeSeoPrerenderWhenPageHasH1();
