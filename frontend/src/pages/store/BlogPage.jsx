import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import SeoHead from '../../components/store/SeoHead.jsx';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

export default function BlogPage() {
  const { settings } = useStore();
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    storeApi.getBlogs({ limit: 20 }).then((res) => setBlogs(res.data.data.blogs || res.data.data || []));
  }, []);

  return (
    <div className="w-full overflow-x-hidden">
      <SeoHead
        siteSettings={settings}
        fallbacks={{
          title: 'Blog | KoseliXpress',
          description: 'Gift ideas, delivery tips, and stories from KoseliXpress Nepal.',
          path: '/blog',
          schemaType: 'CollectionPage',
        }}
        jsonLdId="blog-list-json-ld"
      />
      <div className="cms-section">
        <h1 className="cms-title mb-6 sm:mb-8">Blog</h1>
        {blogs.length === 0 ? (
          <p className="text-gray-400 text-sm sm:text-base">No blog posts yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {blogs.map((blog) => (
              <Link
                key={blog._id}
                to={`/blog/${blog.slug}`}
                className="card hover:shadow-md transition-shadow p-0 overflow-hidden flex flex-col h-full"
              >
                {blog.featuredImage?.url && (
                  <img
                    src={resolveMediaUrl(blog.featuredImage.url)}
                    alt={blog.featuredImage.alt || blog.title}
                    className="w-full h-40 sm:h-44 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-3 sm:p-4 flex flex-col flex-1 min-w-0">
                  <h2 className="font-semibold text-sm sm:text-base line-clamp-2 leading-snug">{blog.title}</h2>
                  {blog.excerpt && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-2 line-clamp-3">{blog.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
