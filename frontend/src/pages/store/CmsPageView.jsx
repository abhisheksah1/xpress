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
    return (
      <div className="cms-page animate-pulse" aria-busy="true" aria-label="Loading page">
        <div className="cms-section space-y-4 py-8">
          <div className="h-8 w-64 max-w-full rounded bg-gray-100" />
          <div className="h-4 w-full max-w-xl rounded bg-gray-100" />
          <div className="h-4 w-3/4 max-w-lg rounded bg-gray-100" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
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
      <header className="border-b border-slate-200/80 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 md:py-5">
          <h1 className="text-center md:text-left text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-snug text-balance max-w-4xl md:max-w-none mx-auto md:mx-0">
            {page.title}
          </h1>
        </div>
      </header>
      <CmsBlockRenderer blocks={page.blocks} hasPageH1 />
    </div>
  );
}
