import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import CmsBlockRenderer from '../../components/store/CmsBlockRenderer.jsx';
import SeoHead from '../../components/store/SeoHead.jsx';
import { mergeEntitySeo } from '../../utils/seoMeta.js';
import { storeUrlForPage } from '../../components/admin/CmsPageFormModal.jsx';

export default function CmsPageView({ pageType }) {
  const { slug: routeSlug } = useParams();
  const { settings } = useStore();
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

  if (loading) {
    return <div className="cms-section text-center text-gray-400 py-16 sm:py-20">Loading...</div>;
  }
  if (!page) {
    return (
      <div className="cms-section text-center text-gray-400 py-16 sm:py-20">
        Page not found. <Link to="/" className="text-primary-600">Go home</Link>
      </div>
    );
  }

  const seo = mergeEntitySeo(page);
  const path = storeUrlForPage(page);

  return (
    <div className="cms-page w-full overflow-x-hidden">
      <SeoHead
        seo={seo}
        siteSettings={settings}
        fallbacks={{
          title: page.title,
          description: page.blocks?.find((b) => b.content)?.content || '',
          path,
          schemaType:
            page.pageType === 'faq'
              ? 'FAQPage'
              : page.pageType === 'about'
                ? 'AboutPage'
                : page.pageType === 'contact'
                  ? 'ContactPage'
                  : 'WebPage',
        }}
        jsonLdContext={{ title: page.title, path }}
      />
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="cms-section !py-6 sm:!py-8 md:!py-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">{page.title}</h1>
        </div>
      </div>
      <CmsBlockRenderer blocks={page.blocks} />
    </div>
  );
}
