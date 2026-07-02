import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storeApi } from '../../api/store.js';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);

  useEffect(() => {
    storeApi.getBlog(slug).then((res) => setBlog(res.data.data));
  }, [slug]);

  if (!blog) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <Link to="/blog" className="text-sm text-primary-600 hover:underline">&larr; Back to blog</Link>
      <h1 className="text-3xl font-bold mt-4 mb-6">{blog.title}</h1>
      {blog.featuredImage?.url && (
        <img src={blog.featuredImage.url} alt="" className="w-full rounded-xl mb-8" />
      )}
      <div className="prose text-gray-700 whitespace-pre-line">{blog.content}</div>
    </article>
  );
}
