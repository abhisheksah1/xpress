import { useState } from 'react';
import { useStore } from '../../context/StoreContext.jsx';
import CmsNavLink from './CmsNavLink.jsx';
import { resolveCmsHref } from '../../utils/cmsLinks.js';

const STORAGE_PREFIX = 'koseli_landing_popup_';

const DEFAULT_POPUP = {
  enabled: false,
  mode: 'text',
  title: '',
  text: '',
  imageUrl: '',
  buttonText: 'Learn more',
  redirectUrl: '',
  version: '1',
};

function normalizePopup(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_POPUP };
  return { ...DEFAULT_POPUP, ...raw };
}

function hasPopupContent(popup) {
  const mode = popup.mode || 'text';
  const title = String(popup.title || '').trim();
  const text = String(popup.text || '').trim();
  const imageUrl = String(popup.imageUrl || '').trim();

  if (mode === 'image') return Boolean(imageUrl);
  if (mode === 'image_text') return Boolean(imageUrl) && Boolean(title || text);
  return Boolean(title || text);
}

export default function LandingPopup() {
  const { settings } = useStore();
  const popup = normalizePopup(settings.landing_popup);
  const version = String(popup.version || '1');
  const storageKey = `${STORAGE_PREFIX}${version}`;

  const [dismissed, setDismissed] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(storageKey) === 'dismissed';
  });

  if (!popup.enabled || dismissed || !hasPopupContent(popup)) return null;

  const mode = popup.mode || 'text';
  const title = String(popup.title || '').trim();
  const text = String(popup.text || '').trim();
  const imageUrl = String(popup.imageUrl || '').trim();
  const buttonText = String(popup.buttonText || 'Learn more').trim() || 'Learn more';
  const redirectUrl = resolveCmsHref(popup.redirectUrl);
  const showText = mode === 'text' || mode === 'image_text';
  const showImage = mode === 'image' || mode === 'image_text';

  const dismiss = () => {
    localStorage.setItem(storageKey, 'dismissed');
    setDismissed(true);
  };

  const imageEl = (
    <img src={imageUrl} alt={title || 'Notice'} className="w-full max-h-[50vh] object-cover" />
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
        aria-label="Close popup"
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'landing-popup-title' : undefined}
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        <button
          type="button"
          className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white/90 text-slate-500 hover:text-slate-800 shadow flex items-center justify-center text-xl leading-none"
          aria-label="Close"
          onClick={dismiss}
        >
          ×
        </button>

        {showImage && imageUrl && (
          <div className={showText ? 'border-b border-slate-100' : ''}>
            {redirectUrl && mode === 'image' ? (
              <CmsNavLink to={popup.redirectUrl} className="block" onClick={dismiss}>
                {imageEl}
              </CmsNavLink>
            ) : (
              imageEl
            )}
          </div>
        )}

        {showText && (title || text) && (
          <div className="p-5 sm:p-6 space-y-3">
            {title && (
              <h2 id="landing-popup-title" className="text-xl font-bold text-slate-900 pr-8">
                {title}
              </h2>
            )}
            {text && (
              <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{text}</p>
            )}
          </div>
        )}

        {redirectUrl && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6">
            <CmsNavLink to={popup.redirectUrl} className="btn-primary w-full text-center block" onClick={dismiss}>
              {buttonText}
            </CmsNavLink>
          </div>
        )}
      </div>
    </div>
  );
}
