import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import CmsBlockRenderer from '../../components/store/CmsBlockRenderer.jsx';
import LandingPopup from '../../components/store/LandingPopup.jsx';
import SeoHead from '../../components/store/SeoHead.jsx';
import { mergeEntitySeo } from '../../utils/seoMeta.js';
import { storeUrlForPage } from '../../components/admin/CmsPageFormModal.jsx';

export default function HomePage() {
  const location = useLocation();
  const { settings } = useStore();
  const [homePage, setHomePage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadHome = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    storeApi.getPageByType('home')
      .then((res) => setHomePage(res.data.data))
      .catch(() => {
        setHomePage(null);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHome();
  }, [location.pathname, loadHome]);

  useEffect(() => {
    const onRefresh = () => loadHome();
    window.addEventListener('store:home-refresh', onRefresh);
    return () => window.removeEventListener('store:home-refresh', onRefresh);
  }, [loadHome]);

  if (loading) {
    return (
      <div className="cms-page animate-pulse" aria-busy="true" aria-label="Loading homepage">
        <div className="w-full aspect-[21/9] max-h-[420px] bg-gray-100" />
        <div className="cms-section space-y-4">
          <div className="mx-auto h-7 w-48 rounded bg-gray-100" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
        <div className="cms-section space-y-4">
          <div className="mx-auto h-7 w-40 rounded bg-gray-100" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square rounded-lg bg-gray-100" />
                <div className="h-3 w-3/4 rounded bg-gray-100" />
                <div className="h-3 w-1/3 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!homePage?.blocks?.length) {
    return (
      <>
        <SeoHead
          siteSettings={settings}
          fallbacks={{
            title: settings.meta_title || 'KoseliXpress — Gifts & Flowers in Nepal',
            description: settings.meta_description || 'Send gifts across Nepal with KoseliXpress.',
            path: '/',
            schemaType: 'WebPage',
          }}
          jsonLdContext={{ title: settings.store_name || 'KoseliXpress', path: '/' }}
          jsonLdId="home-json-ld"
        />
        <div className="cms-page py-16 sm:py-24 text-center text-gray-400 px-4 sm:px-6 max-w-lg mx-auto">
          {loadError ? (
            <>
              <p className="text-lg font-medium text-gray-500">Could not load homepage content.</p>
              <p className="text-sm mt-2">
                Make sure the backend is running on port <strong className="text-gray-600">5001</strong> and open the storefront at{' '}
                <strong className="text-gray-600">http://127.0.0.1:5173</strong> (not an old dev port).
              </p>
              <button type="button" onClick={loadHome} className="btn-primary mt-6">
                Retry
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-500">Homepage content is not configured yet.</p>
              <p className="text-sm mt-2">
                In Admin → Content Manager, create a page with type <strong className="text-gray-600">home</strong> and add content blocks,
                or click <strong className="text-gray-600">Create default homepage</strong>.
              </p>
            </>
          )}
        </div>
        <LandingPopup />
      </>
    );
  }

  const seo = mergeEntitySeo(homePage);
  const path = storeUrlForPage(homePage);
  const pageH1 = String(homePage.title || settings.store_name || 'KoseliXpress').trim();
  const hasHeroTitle = (homePage.blocks || []).some(
    (b) => b.isActive !== false && b.type === 'hero' && String(b.title || '').trim()
  );

  return (
    <>
      <SeoHead
        seo={seo}
        siteSettings={settings}
        fallbacks={{
          title: homePage.title || settings.meta_title,
          description: homePage.metaDescription || settings.meta_description,
          path,
          schemaType: 'WebPage',
        }}
        jsonLdContext={{ title: pageH1, path }}
        jsonLdId="home-json-ld"
      />
      {/* Page H1 band — compact, responsive; hero owns H1 when present */}
      {!hasHeroTitle && (
        <header className="border-b border-slate-200/80 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 md:py-5">
            <h1 className="text-center md:text-left text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-snug text-balance max-w-4xl md:max-w-none mx-auto md:mx-0">
              {pageH1}
            </h1>
          </div>
        </header>
      )}
      <CmsBlockRenderer blocks={homePage.blocks} hasPageH1={!hasHeroTitle} />
      <LandingPopup />
    </>
  );
}
