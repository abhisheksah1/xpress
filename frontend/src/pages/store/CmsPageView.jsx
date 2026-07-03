import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import CmsBlockRenderer from '../../components/store/CmsBlockRenderer.jsx';

export default function CmsPageView({ pageType }) {
  const { slug: routeSlug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = pageType
      ? storeApi.getPageByType(pageType)
      : storeApi.getPage(routeSlug);

    load
      .then((res) => setPage(res.data.data))
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [pageType, routeSlug]);

  useEffect(() => {
    if (!page) return;
    const title = page.metaTitle || page.title;
    if (title) document.title = title;

    const desc = page.metaDescription;
    if (desc) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', desc);
    }
  }, [page]);

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>;
  if (!page) return <div className="py-20 text-center text-gray-400">Page not found. <Link to="/" className="text-primary-600">Go home</Link></div>;

  return (
    <div className="cms-page">
      <div className="bg-gray-50 border-b border-gray-100 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{page.title}</h1>
        </div>
      </div>
      <CmsBlockRenderer blocks={page.blocks} />
    </div>
  );
}
