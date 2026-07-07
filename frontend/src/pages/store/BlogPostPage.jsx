import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import SeoHead from '../../components/store/SeoHead.jsx';
import { mergeEntitySeo } from '../../utils/seoMeta.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

export default function BlogPostPage() {
  const { slug } = useParams();
  const { settings } = useStore();
  const [blog, setBlog] = useState(null);

  useEffect(() => {
    storeApi.getBlog(slug).then((res) => setBlog(res.data.data));
  }, [slug]);

  if (!blog) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  const seo = mergeEntitySeo(blog);
  const image = blog.featuredImage?.url || seo.ogImage?.url;

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <SeoHead
        seo={{
          ...seo,
          ogImage: seo.ogImage?.url ? seo.ogImage : { url: image, alt: blog.title },
        }}
        siteSettings={settings}
        fallbacks={{
          title: blog.title,
          description: blog.excerpt || blog.content,
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
      <Link to="/blog" className="text-sm text-primary-600 hover:underline">&larr; Back to blog</Link>
      <h1 className="text-3xl font-bold mt-4 mb-6">{blog.title}</h1>
      {blog.featuredImage?.url && (
        <img src={resolveMediaUrl(blog.featuredImage.url)} alt={blog.featuredImage.alt || blog.title} className="w-full rounded-xl mb-8" />
      )}
      <div className="prose text-gray-700 whitespace-pre-line">{blog.content}</div>
    </article>
  );
}
