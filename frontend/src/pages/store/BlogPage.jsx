import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import SeoHead from '../../components/store/SeoHead.jsx';

export default function BlogPage() {
  const { settings } = useStore();
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    storeApi.getBlogs({ limit: 20 }).then((res) => setBlogs(res.data.data.blogs || res.data.data || []));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
      <h1 className="text-2xl font-bold mb-8">Blog</h1>
      {blogs.length === 0 ? (
        <p className="text-gray-400">No blog posts yet.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <Link key={blog._id} to={`/blog/${blog.slug}`} className="card hover:shadow-md transition-shadow p-0 overflow-hidden">
              {blog.featuredImage?.url && (
                <img src={blog.featuredImage.url} alt="" className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <h2 className="font-semibold line-clamp-2">{blog.title}</h2>
                {blog.excerpt && <p className="text-sm text-gray-500 mt-2 line-clamp-3">{blog.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
