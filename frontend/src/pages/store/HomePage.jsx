import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import CmsBlockRenderer from '../../components/store/CmsBlockRenderer.jsx';

export default function HomePage() {
  const location = useLocation();
  const [homePage, setHomePage] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadHome = useCallback(() => {
    setLoading(true);
    storeApi.getPageByType('home')
      .then((res) => setHomePage(res.data.data))
      .catch(() => setHomePage(null))
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
      <div className="cms-page py-16 sm:py-24 text-center text-gray-400 px-4 sm:px-6 max-w-lg mx-auto">
        <p className="text-lg font-medium text-gray-500">Homepage content is not configured yet.</p>
        <p className="text-sm mt-2">
          In Admin → Content Manager, create a page with type <strong className="text-gray-600">home</strong> and add content blocks,
          or click <strong className="text-gray-600">Create default homepage</strong>.
        </p>
      </div>
    );
  }

  return <CmsBlockRenderer blocks={homePage.blocks} />;
}
