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
    return <div className="py-20 text-center text-gray-400">Loading...</div>;
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
        jsonLdContext={{ title: homePage.title, path }}
        jsonLdId="home-json-ld"
      />
      <CmsBlockRenderer blocks={homePage.blocks} />
      <LandingPopup />
    </>
  );
}
