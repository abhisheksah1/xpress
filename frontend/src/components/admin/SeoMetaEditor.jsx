import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  SCHEMA_TYPES,
  TWITTER_CARD_TYPES,
  charCountHint,
  emptySeoMeta,
} from '../../utils/seoMeta.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import ImageSizeGuide from '../ImageSizeGuide.jsx';
import AdminImageDropzone from './AdminImageDropzone.jsx';
import SeoAuditorPanel from './SeoAuditorPanel.jsx';

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 text-left text-sm font-semibold text-gray-800"
      >
        {title}
        <span className="text-gray-400 text-xs">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

export default function SeoMetaEditor({
  value,
  onChange,
  pageTitle = '',
  pageDescription = '',
  canonicalPreview = '',
  defaultSchemaType = 'WebPage',
  onUploadImage,
  /** When set, shows Real-Time SEO Auditor (blog / page builder) */
  auditContext = null,
}) {
  const seo = { ...emptySeoMeta({ schemaType: defaultSchemaType }), ...(value || {}) };
  const geo = { ...emptySeoMeta().geo, ...(seo.geo || {}) };

  const patch = (partial) => onChange({ ...seo, ...partial });
  const patchGeo = (partial) => patch({ geo: { ...geo, ...partial } });

  const handleOgUpload = async (file) => {
    if (!file || !onUploadImage) return;
    try {
      const uploaded = await onUploadImage(file);
      patch({
        ogImage: {
          url: uploaded.url,
          publicId: uploaded.publicId,
          alt: uploaded.alt || pageTitle || seo.metaTitle,
        },
      });
      toast.success('OG image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed');
    }
  };

  const suggestFromPage = () => {
    patch({
      metaTitle: seo.metaTitle || `${pageTitle} | KoseliXpress`.slice(0, 60),
      metaDescription: seo.metaDescription || String(pageDescription || '').slice(0, 160),
      ogTitle: seo.ogTitle || pageTitle,
      ogDescription: seo.ogDescription || String(pageDescription || '').slice(0, 160),
      canonicalUrl: seo.canonicalUrl || canonicalPreview,
    });
    toast.success('SEO fields filled from page content');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">SEO & GEO</h3>
          <p className="text-xs text-gray-500 mt-0.5">Search engines, social sharing, structured data, and local GEO tags.</p>
        </div>
        {pageTitle && (
          <button type="button" onClick={suggestFromPage} className="btn-secondary text-xs">
            Auto-fill from content
          </button>
        )}
      </div>

      {auditContext && (
        <SeoAuditorPanel
          seo={seo}
          context={{
            ...auditContext,
            title: auditContext.title || pageTitle,
            canonicalPreview: auditContext.canonicalPreview || canonicalPreview,
            excerpt: auditContext.excerpt || pageDescription,
          }}
        />
      )}

      <Section title="Basic SEO">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Meta title</label>
          <input
            className="input-field text-sm"
            value={seo.metaTitle || ''}
            onChange={(e) => patch({ metaTitle: e.target.value })}
            placeholder={pageTitle || 'Page title for search results'}
          />
          <p className="text-xs text-gray-400 mt-1">{charCountHint(seo.metaTitle, 50, 60)}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Meta description</label>
          <textarea
            className="input-field text-sm"
            rows={3}
            value={seo.metaDescription || ''}
            onChange={(e) => patch({ metaDescription: e.target.value })}
            placeholder="Short summary for Google and social previews"
          />
          <p className="text-xs text-gray-400 mt-1">{charCountHint(seo.metaDescription, 120, 160)}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Focus keyword</label>
          <input
            className="input-field text-sm"
            value={seo.focusKeyword || ''}
            onChange={(e) => patch({ focusKeyword: e.target.value })}
            placeholder="Primary keyword phrase"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Meta keywords</label>
          <input
            className="input-field text-sm"
            value={(seo.metaKeywords || []).join(', ')}
            onChange={(e) =>
              patch({
                metaKeywords: e.target.value
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean),
              })
            }
            placeholder="gifts, flowers, Kathmandu (comma-separated)"
          />
        </div>
      </Section>

      <Section title="Open Graph & Twitter" defaultOpen={false}>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">OG title</label>
          <input className="input-field text-sm" value={seo.ogTitle || ''} onChange={(e) => patch({ ogTitle: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">OG description</label>
          <textarea className="input-field text-sm" rows={2} value={seo.ogDescription || ''} onChange={(e) => patch({ ogDescription: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">OG image</label>
          <ImageSizeGuide guide="og" variant="admin" className="rounded-lg border border-blue-100 mb-2" />
          {onUploadImage ? (
            <AdminImageDropzone
              guideKey="og"
              multiple={false}
              onFilesSelected={async (files) => handleOgUpload(files[0])}
              title="Drag & drop OG image"
              hint="Crop to 1200×630 before upload"
              className="p-4"
              showGuide={false}
            />
          ) : null}
          <input
            className="input-field text-sm flex-1 min-w-[200px] mt-3"
            placeholder="Or paste image URL"
            value={seo.ogImage?.url || ''}
            onChange={(e) => patch({ ogImage: { ...seo.ogImage, url: e.target.value } })}
          />
          {seo.ogImage?.url && (
            <img src={resolveMediaUrl(seo.ogImage.url)} alt="" className="mt-2 h-20 object-cover rounded border" />
          )}
          <input
            className="input-field text-sm mt-2"
            placeholder="OG image alt text"
            value={seo.ogImage?.alt || ''}
            onChange={(e) => patch({ ogImage: { ...seo.ogImage, url: seo.ogImage?.url || '', alt: e.target.value } })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Twitter card</label>
          <select className="input-field text-sm" value={seo.twitterCard || 'summary_large_image'} onChange={(e) => patch({ twitterCard: e.target.value })}>
            {TWITTER_CARD_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Technical SEO" defaultOpen={false}>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Canonical URL</label>
          <input
            className="input-field text-sm font-mono"
            value={seo.canonicalUrl || ''}
            onChange={(e) => patch({ canonicalUrl: e.target.value })}
            placeholder={canonicalPreview || '/p/your-page'}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={seo.robotsIndex !== false} onChange={(e) => patch({ robotsIndex: e.target.checked })} />
            Allow indexing
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={seo.robotsFollow !== false} onChange={(e) => patch({ robotsFollow: e.target.checked })} />
            Allow following links
          </label>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Schema.org type</label>
          <select className="input-field text-sm" value={seo.schemaType || defaultSchemaType} onChange={(e) => patch({ schemaType: e.target.value })}>
            {SCHEMA_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Custom JSON-LD (optional)</label>
          <textarea
            className="input-field text-sm font-mono"
            rows={4}
            value={seo.schemaJson || ''}
            onChange={(e) => patch({ schemaJson: e.target.value })}
            placeholder='{"@context":"https://schema.org","@type":"WebPage",...}'
          />
        </div>
      </Section>

      <Section title="GEO / Local SEO" defaultOpen={false}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Placename</label>
            <input className="input-field text-sm" value={geo.placename || ''} onChange={(e) => patchGeo({ placename: e.target.value })} placeholder="Kathmandu" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Region</label>
            <input className="input-field text-sm" value={geo.region || ''} onChange={(e) => patchGeo({ region: e.target.value })} placeholder="Bagmati" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Country</label>
            <input className="input-field text-sm" value={geo.country || ''} onChange={(e) => patchGeo({ country: e.target.value })} placeholder="Nepal" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Latitude</label>
            <input className="input-field text-sm" value={geo.latitude || ''} onChange={(e) => patchGeo({ latitude: e.target.value })} placeholder="27.7172" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Longitude</label>
            <input className="input-field text-sm" value={geo.longitude || ''} onChange={(e) => patchGeo({ longitude: e.target.value })} placeholder="85.3240" />
          </div>
        </div>
      </Section>
    </div>
  );
}

export { emptySeoMeta };
