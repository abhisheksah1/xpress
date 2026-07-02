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

  if (loading) return <div className="py-20 text-center text-gray-400">Loading...</div>;
  if (!page) return <div className="py-20 text-center text-gray-400">Page not found. <Link to="/" className="text-primary-600">Go home</Link></div>;

  return (
    <div>
      <div className="bg-gray-50 border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold">{page.title}</h1>
        </div>
      </div>
      <CmsBlockRenderer blocks={page.blocks} />
    </div>
  );
}
