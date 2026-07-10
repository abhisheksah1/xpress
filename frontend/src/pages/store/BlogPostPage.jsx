import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import SeoHead from '../../components/store/SeoHead.jsx';
import { mergeEntitySeo } from '../../utils/seoMeta.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { sanitizeCmsHtml } from '../../utils/cmsHtml.js';
import { isHtmlContent } from '../../utils/productHtml.js';

export default function BlogPostPage() {
  const { slug } = useParams();
  const { settings } = useStore();
  const [blog, setBlog] = useState(null);

  useEffect(() => {
    storeApi.getBlog(slug).then((res) => setBlog(res.data.data));
  }, [slug]);

  const contentHtml = useMemo(() => {
    if (!blog?.content) return '';
    if (isHtmlContent(blog.content)) return sanitizeCmsHtml(blog.content);
    return '';
  }, [blog?.content]);

  if (!blog) {
    return (
      <div className="cms-section text-center text-gray-400 py-16 sm:py-20">
        Loading...
      </div>
    );
  }

  const seo = mergeEntitySeo(blog);
  const image = blog.featuredImage?.url || seo.ogImage?.url;
  const plainDescription = blog.excerpt
    || (isHtmlContent(blog.content)
      ? blog.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : blog.content);

  return (
    <article className="w-full overflow-x-hidden">
      <SeoHead
        seo={{
          ...seo,
          ogImage: seo.ogImage?.url ? seo.ogImage : { url: image, alt: blog.title },
        }}
        siteSettings={settings}
        fallbacks={{
          title: blog.title,
          description: plainDescription,
          image,
          path: `/blog/${blog.slug}`,
          schemaType: 'BlogPosting',
        }}
        jsonLdContext={{
          title: blog.title,
          path: `/blog/${blog.slug}`,
          publishedAt: blog.publishedAt,
          updatedAt: blog.updatedAt,
          authorName: blog.author?.name,
          ogType: 'article',
        }}
        jsonLdId="blog-json-ld"
      />
      <div className="cms-section">
        <Link to="/blog" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1">
          &larr; Back to blog
        </Link>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3 sm:mt-4 mb-4 sm:mb-6 leading-tight">
          {blog.title}
        </h1>
        {blog.featuredImage?.url && (
          <img
            src={resolveMediaUrl(blog.featuredImage.url)}
            alt={blog.featuredImage.alt || blog.title}
            className="w-full max-w-full rounded-xl mb-6 sm:mb-8 object-cover aspect-[16/9] sm:aspect-[2/1]"
            loading="eager"
          />
        )}
        {contentHtml ? (
          <div className="cms-rich-text" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        ) : (
          <div className="cms-rich-text whitespace-pre-line">{blog.content}</div>
        )}
      </div>
    </article>
  );
}
