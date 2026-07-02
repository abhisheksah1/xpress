import { Link } from 'react-router-dom';

function HeroBlock({ block }) {
  return (
    <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-24">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">{block.title}</h1>
        {block.content && (
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto whitespace-pre-line">{block.content}</p>
        )}
        {block.buttonText && block.buttonLink && (
          <Link
            to={block.buttonLink}
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            {block.buttonText}
          </Link>
        )}
      </div>
    </section>
  );
}

function TextBlock({ block }) {
  const features = block.settings?.features;
  if (block.settings?.layout === 'features' && features?.length) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        {block.title && <h2 className="text-2xl font-bold text-center mb-8">{block.title}</h2>}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((item) => (
            <div key={item.title} className="card text-center">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      {block.title && <h2 className="text-2xl font-bold mb-4">{block.title}</h2>}
      {block.content && <div className="prose text-gray-600 whitespace-pre-line">{block.content}</div>}
    </section>
  );
}

function CtaBlock({ block }) {
  return (
    <section className="bg-primary-50 py-12">
      <div className="max-w-4xl mx-auto px-4 text-center">
        {block.title && <h2 className="text-2xl font-bold mb-3">{block.title}</h2>}
        {block.content && <p className="text-gray-600 mb-6">{block.content}</p>}
        {block.buttonText && block.buttonLink && (
          <Link to={block.buttonLink} className="btn-primary">{block.buttonText}</Link>
        )}
      </div>
    </section>
  );
}

function FaqBlock({ block }) {
  const items = block.settings?.items || [];
  return (
    <section className="max-w-3xl mx-auto px-4 py-12">
      {block.title && <h2 className="text-2xl font-bold mb-6">{block.title}</h2>}
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="card">
            <h3 className="font-semibold mb-2">{item.q}</h3>
            <p className="text-gray-600 text-sm">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ImageBlock({ block }) {
  const src = block.image?.url || block.images?.[0]?.url;
  if (!src) return null;
  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <img src={src} alt={block.image?.alt || block.title || ''} className="w-full rounded-xl" />
    </section>
  );
}

function TestimonialBlock({ block }) {
  const items = block.settings?.items || [];
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      {block.title && <h2 className="text-2xl font-bold text-center mb-8">{block.title}</h2>}
      <div className="grid md:grid-cols-3 gap-6">
        {items.map((t, i) => (
          <div key={i} className="card">
            <p className="text-gray-600 text-sm italic mb-3">&ldquo;{t.quote}&rdquo;</p>
            <p className="font-medium text-sm">{t.author}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CmsBlockRenderer({ blocks = [] }) {
  const sorted = [...blocks].filter((b) => b.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <>
      {sorted.map((block) => {
        switch (block.type) {
          case 'hero': return <HeroBlock key={block._id} block={block} />;
          case 'text': return <TextBlock key={block._id} block={block} />;
          case 'cta': return <CtaBlock key={block._id} block={block} />;
          case 'faq': return <FaqBlock key={block._id} block={block} />;
          case 'image': return <ImageBlock key={block._id} block={block} />;
          case 'testimonial': return <TestimonialBlock key={block._id} block={block} />;
          default: return block.content ? <TextBlock key={block._id} block={block} /> : null;
        }
      })}
    </>
  );
}
