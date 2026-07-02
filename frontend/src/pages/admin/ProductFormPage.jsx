import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { auditSeo, generateSeoFields, generateSkuPreview, slugify } from '../../utils/seoAuditor.js';

const BRANDS = ['Koseli Artisans', 'Koseli Premium', 'Local Partners', 'Imported Selection'];
const STATUS_OPTIONS = [
  { value: 'published', label: 'Published (Active Storefront)', isActive: true },
  { value: 'draft', label: 'Draft (Hidden)', isActive: false },
];

const PRESET_MEDIA = [
  { label: 'Rose Bouquet', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600' },
  { label: 'Fudge Cake', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600' },
  { label: 'Choc Hamper', url: 'https://images.unsplash.com/photo-1549007953-0f1807d40b1c?w=600' },
  { label: 'Fruit Basket', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600' },
];

const defaultForm = () => ({
  name: '',
  sku: generateSkuPreview(),
  slug: '',
  price: '',
  compareAtPrice: '',
  costPrice: '',
  stock: '10',
  lowStockThreshold: '3',
  categoryIds: [],
  brand: BRANDS[0],
  status: 'published',
  deliveryZoneIds: [],
  description: '',
  longDescription: '',
  additionalNote: '',
  imageUrlInput: '',
  personalizationFields: { customCakeMessage: false, giftMessage: true, imagePrint: false },
  allowBackorder: false,
  barcode: '',
  weight: '',
  productGroup: '',
  skuVariant: '',
  standardSize: '',
  isHamper: false,
  optionCategories: [],
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  focusKeyword: '',
  tags: '',
});

function FieldLabel({ children, hint }) {
  return (
    <label className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
      {children}
      {hint && <span className="block font-normal normal-case text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

function SeoGauge({ score, rating }) {
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
  return (
    <div className="flex flex-col items-center py-4">
      <div className={`text-4xl font-bold ${color}`}>{score}%</div>
      <div className="text-sm font-semibold text-gray-600 mt-1">SEO Score</div>
      <div className={`text-xs font-medium mt-1 ${color}`}>{rating}</div>
    </div>
  );
}

function ScoreBar({ label, value, max = 20 }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(defaultForm);
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setPersonalization = (key, val) =>
    setForm((f) => ({ ...f, personalizationFields: { ...f.personalizationFields, [key]: val } }));

  useEffect(() => {
    Promise.all([adminApi.getCategories(), adminApi.getDeliveryZones()]).then(([catRes, zoneRes]) => {
      setCategories(catRes.data.data);
      setDeliveryZones(zoneRes.data.data);
    });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    adminApi
      .getProduct(id)
      .then(({ data }) => {
        const p = data.data;
        const catIds = p.categories?.length
          ? p.categories.map((c) => c._id || c)
          : p.category
            ? [p.category._id || p.category]
            : [];
        setForm({
          name: p.name || '',
          sku: p.sku || '',
          slug: p.slug || '',
          price: p.price ?? '',
          compareAtPrice: p.compareAtPrice ?? '',
          costPrice: p.costPrice ?? '',
          stock: p.stock ?? '0',
          lowStockThreshold: p.lowStockThreshold ?? '5',
          categoryIds: catIds,
          brand: p.brand || BRANDS[0],
          status: p.isActive ? 'published' : 'draft',
          deliveryZoneIds: (p.deliveryZones || []).map((z) => z._id || z),
          description: p.description || '',
          longDescription: p.longDescription || '',
          additionalNote: p.additionalNote || '',
          imageUrlInput: '',
          personalizationFields: {
            customCakeMessage: p.personalizationFields?.customCakeMessage ?? false,
            giftMessage: p.personalizationFields?.giftMessage ?? true,
            imagePrint: p.personalizationFields?.imagePrint ?? false,
          },
          allowBackorder: p.allowBackorder ?? false,
          barcode: p.barcode || '',
          weight: p.weight ?? '',
          productGroup: p.productGroup || '',
          skuVariant: p.skuVariant || '',
          standardSize: p.standardSize || '',
          isHamper: p.isHamper ?? false,
          optionCategories: p.optionCategories || [],
          metaTitle: p.metaTitle || '',
          metaDescription: p.metaDescription || '',
          metaKeywords: (p.metaKeywords || []).join(', '),
          focusKeyword: p.focusKeyword || '',
          tags: (p.tags || []).join(', '),
        });
        setImages(
          (p.images || []).map((img, i) => ({
            ...img,
            sortOrder: img.sortOrder ?? i,
            isPrimary: img.isPrimary ?? i === 0,
          }))
        );
      })
      .catch(() => toast.error('Failed to load product'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const seoAudit = useMemo(() => auditSeo(form, images), [form, images]);

  const toggleCategory = (catId) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(catId)
        ? f.categoryIds.filter((c) => c !== catId)
        : [...f.categoryIds, catId],
    }));
  };

  const toggleZone = (zoneId) => {
    setForm((f) => ({
      ...f,
      deliveryZoneIds: f.deliveryZoneIds.includes(zoneId)
        ? f.deliveryZoneIds.filter((z) => z !== zoneId)
        : [...f.deliveryZoneIds, zoneId],
    }));
  };

  const addImagesFromUrls = async (urlString) => {
    const urls = urlString.split(',').map((u) => u.trim()).filter(Boolean);
    for (const url of urls) {
      try {
        const { data } = await adminApi.uploadImageUrl(url, form.name);
        setImages((prev) => [
          ...prev,
          {
            url: data.data.url,
            publicId: data.data.publicId,
            alt: form.name,
            isPrimary: prev.length === 0,
            sortOrder: prev.length,
          },
        ]);
      } catch {
        setImages((prev) => [
          ...prev,
          { url, alt: form.name, isPrimary: prev.length === 0, sortOrder: prev.length },
        ]);
      }
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    for (const file of files) {
      setUploading(true);
      try {
        const { data } = await adminApi.uploadImage(file);
        setImages((prev) => [
          ...prev,
          { url: data.data.url, publicId: data.data.publicId, alt: form.name, isPrimary: prev.length === 0, sortOrder: prev.length },
        ]);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
  };

  const handleFileSelect = async (e) => {
    const files = [...(e.target.files || [])];
    for (const file of files) {
      setUploading(true);
      try {
        const { data } = await adminApi.uploadImage(file);
        setImages((prev) => [
          ...prev,
          { url: data.data.url, publicId: data.data.publicId, alt: form.name, isPrimary: prev.length === 0, sortOrder: prev.length },
        ]);
      } catch {
        toast.error('Upload failed — try pasting an image URL instead');
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const setPrimaryImage = (index) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isPrimary: i === index, sortOrder: i === index ? 0 : img.sortOrder }))
    );
  };

  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  const addOptionCategory = () => {
    if (!newOptionName.trim()) return;
    setForm((f) => ({
      ...f,
      optionCategories: [...f.optionCategories, { name: newOptionName.trim(), options: [] }],
    }));
    setNewOptionName('');
  };

  const addOptionToCategory = (catIndex) => {
    setForm((f) => {
      const cats = [...f.optionCategories];
      cats[catIndex] = {
        ...cats[catIndex],
        options: [...cats[catIndex].options, { label: 'New Option', priceAdjustment: 0 }],
      };
      return { ...f, optionCategories: cats };
    });
  };

  const handleAiSeo = () => {
    const generated = generateSeoFields({
      ...form,
      metaKeywords: form.metaKeywords ? form.metaKeywords.split(',').map((k) => k.trim()) : [],
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
    });
    set('metaTitle', generated.metaTitle);
    set('metaDescription', generated.metaDescription);
    set('metaKeywords', generated.metaKeywords.join(', '));
    if (!form.focusKeyword && form.name) set('focusKeyword', form.name.split(' ')[0].toLowerCase());
    toast.success('SEO fields generated');
  };

  const buildPayload = () => {
    const statusOpt = STATUS_OPTIONS.find((s) => s.value === form.status) || STATUS_OPTIONS[0];
    const sortedImages = images.map((img, i) => ({ ...img, sortOrder: img.isPrimary ? 0 : i + 1 }));
    return {
      name: form.name,
      slug: form.slug || slugify(form.name),
      sku: form.sku || undefined,
      description: form.description || undefined,
      shortDescription: form.description?.slice(0, 200),
      longDescription: form.longDescription || undefined,
      additionalNote: form.additionalNote || undefined,
      category: form.categoryIds[0],
      categories: form.categoryIds,
      brand: form.brand,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
      deliveryZones: form.deliveryZoneIds,
      images: sortedImages,
      personalizationFields: form.personalizationFields,
      allowBackorder: form.allowBackorder,
      isHamper: form.isHamper,
      barcode: form.barcode || undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      productGroup: form.productGroup || undefined,
      skuVariant: form.skuVariant || undefined,
      standardSize: form.standardSize || undefined,
      optionCategories: form.optionCategories,
      isActive: statusOpt.isActive,
      isGiftWrappable: form.personalizationFields.giftMessage,
      giftMessageEnabled: form.personalizationFields.giftMessage,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      metaKeywords: form.metaKeywords ? form.metaKeywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
      focusKeyword: form.focusKeyword || undefined,
      tags: [
        ...(form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : []),
        ...(form.isHamper ? ['hamper'] : []),
      ],
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Product title is required');
    if (!form.categoryIds.length) return toast.error('Select at least one category');
    if (!form.price && form.price !== 0) return toast.error('Original price is required');

    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await adminApi.updateProduct(id, payload);
        toast.success('Catalog product updated');
      } else {
        await adminApi.createProduct(payload);
        toast.success('Catalog product created');
      }
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading product...</div>;
  }

  return (
    <div className="pb-24">
      <div className="mb-6">
        <Link to="/admin/products" className="text-sm text-primary-600 hover:underline">&larr; Back to Catalog Registry</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {isEdit ? 'Edit Catalog Product' : 'Create Brand-New Catalog Product'}
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="xl:col-span-2 space-y-6">
          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Basic Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FieldLabel>Product Title</FieldLabel>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => {
                    set('name', e.target.value);
                    if (!form.slug || !isEdit) set('slug', slugify(e.target.value));
                  }}
                  placeholder="e.g. Belgian Truffle Box"
                />
              </div>
              <div>
                <FieldLabel>Unique SKU</FieldLabel>
                <input className="input-field font-mono text-sm" value={form.sku} onChange={(e) => set('sku', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Slug Handle</FieldLabel>
                <input className="input-field font-mono text-sm" value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto-generated-from-title" />
              </div>
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Pricing &amp; Inventory</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <FieldLabel>Original Price (NPR Base)</FieldLabel>
                <input type="number" min="0" className="input-field" value={form.price} onChange={(e) => set('price', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Discount Price (NPR)</FieldLabel>
                <input type="number" min="0" className="input-field" value={form.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="Sale price" />
              </div>
              <div>
                <FieldLabel>Cost Price (NPR)</FieldLabel>
                <input type="number" min="0" className="input-field" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Remaining Stock</FieldLabel>
                <input type="number" min="0" className="input-field" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Low Stock Warning</FieldLabel>
                <input type="number" min="0" className="input-field" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Categorization &amp; Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <FieldLabel>Publish on Categories</FieldLabel>
                <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {categories.map((cat) => (
                    <label key={cat._id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.categoryIds.includes(cat._id)} onChange={() => toggleCategory(cat._id)} />
                      {cat.name}
                    </label>
                  ))}
                  {!categories.length && <p className="text-sm text-gray-400">No categories — create some in Catalog Registry</p>}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel>Brand Guild</FieldLabel>
                  <select className="input-field" value={form.brand} onChange={(e) => set('brand', e.target.value)}>
                    {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Catalog Registry Status</FieldLabel>
                  <select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Delivery Availability</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {deliveryZones.map((zone) => (
                <button
                  key={zone._id}
                  type="button"
                  onClick={() => toggleZone(zone._id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                    form.deliveryZoneIds.includes(zone._id)
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium block">{zone.name}</span>
                  <span className="text-xs text-gray-500">{zone.province}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Descriptions</h2>
            <div>
              <FieldLabel>Product Description</FieldLabel>
              <textarea className="input-field" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Product Long Description (SEO Rich Paragraphs)</FieldLabel>
              <textarea className="input-field" rows={5} value={form.longDescription} onChange={(e) => set('longDescription', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Additional Note</FieldLabel>
              <textarea className="input-field" rows={2} value={form.additionalNote} onChange={(e) => set('additionalNote', e.target.value)} placeholder="Shown on the customer product page" />
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Visual Digital Media Assets</h2>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
              }`}
            >
              <p className="text-gray-600 font-medium">Drag &amp; Drop images here</p>
              <p className="text-sm text-gray-400 mt-1">or</p>
              <label className="btn-secondary inline-block mt-3 cursor-pointer">
                {uploading ? 'Uploading...' : 'Browse Files'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} disabled={uploading} />
              </label>
            </div>

            <div>
              <FieldLabel>Current Active Image URL(s)</FieldLabel>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1 text-sm"
                  value={form.imageUrlInput}
                  onChange={(e) => set('imageUrlInput', e.target.value)}
                  placeholder="https://..., comma-separated for multiple"
                />
                <button
                  type="button"
                  className="btn-secondary whitespace-nowrap"
                  onClick={async () => {
                    await addImagesFromUrls(form.imageUrlInput);
                    set('imageUrlInput', '');
                    toast.success('Images added');
                  }}
                >
                  Add URLs
                </button>
              </div>
            </div>

            {images.length > 0 && (
              <div className="space-y-3">
                <FieldLabel>Active Media Assets</FieldLabel>
                {images.map((img, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                    <img src={img.url} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">{img.url}</p>
                    </div>
                    <select
                      className="input-field w-auto text-sm py-1"
                      value={img.isPrimary ? '0' : String(i + 1)}
                      onChange={() => setPrimaryImage(i)}
                    >
                      <option value="0">Set as 1st (Primary)</option>
                      {images.map((_, j) => (
                        <option key={j} value={String(j + 1)}>Order {j + 1}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeImage(i)} className="text-red-500 text-sm font-medium px-2">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <FieldLabel>Preset Media Library</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {PRESET_MEDIA.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => addImagesFromUrls(preset.url)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="card space-y-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Personalization &amp; Stock</h2>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.personalizationFields.customCakeMessage} onChange={(e) => setPersonalization('customCakeMessage', e.target.checked)} className="mt-0.5" />
              <span>Collect custom cake message from customer</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.personalizationFields.giftMessage} onChange={(e) => setPersonalization('giftMessage', e.target.checked)} className="mt-0.5" />
              <span>Collect gift message from customer</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.personalizationFields.imagePrint} onChange={(e) => setPersonalization('imagePrint', e.target.checked)} className="mt-0.5" />
              <span>Collect image for print/customization</span>
            </label>
            <label className="flex items-start gap-2 text-sm border-t border-gray-100 pt-3">
              <input type="checkbox" checked={form.allowBackorder} onChange={(e) => set('allowBackorder', e.target.checked)} className="mt-0.5" />
              <span>
                Allow ordering when out of stock
                <span className="block text-xs text-gray-400">Backorder override</span>
              </span>
            </label>
          </section>

          <section className="card space-y-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Custom Registry Specifications</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Barcode/UPC</FieldLabel>
                <input className="input-field text-sm" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Weight (g)</FieldLabel>
                <input type="number" className="input-field text-sm" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Product Group</FieldLabel>
                <input className="input-field text-sm" value={form.productGroup} onChange={(e) => set('productGroup', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Aesthetic SKU Variant</FieldLabel>
                <input className="input-field text-sm" value={form.skuVariant} onChange={(e) => set('skuVariant', e.target.value)} />
              </div>
              <div className="col-span-2">
                <FieldLabel>Standard Item Size</FieldLabel>
                <input className="input-field text-sm" value={form.standardSize} onChange={(e) => set('standardSize', e.target.value)} placeholder="e.g. Medium, 500g" />
              </div>
            </div>
          </section>

          <section className="card space-y-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Product Variables</h2>
            <div className="flex gap-2">
              <input
                className="input-field text-sm flex-1"
                placeholder="Option category e.g. Size"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
              />
              <button type="button" onClick={addOptionCategory} className="btn-secondary text-sm whitespace-nowrap">Add Category</button>
            </div>
            {form.optionCategories.map((cat, ci) => (
              <div key={ci} className="border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <button type="button" onClick={() => addOptionToCategory(ci)} className="text-xs text-primary-600">+ Option</button>
                </div>
                {cat.options.map((opt, oi) => (
                  <div key={oi} className="flex gap-2 mb-1">
                    <input
                      className="input-field text-sm flex-1 py-1"
                      value={opt.label}
                      onChange={(e) => {
                        const cats = [...form.optionCategories];
                        cats[ci].options[oi].label = e.target.value;
                        set('optionCategories', cats);
                      }}
                    />
                    <input
                      type="number"
                      className="input-field text-sm w-20 py-1"
                      value={opt.priceAdjustment}
                      onChange={(e) => {
                        const cats = [...form.optionCategories];
                        cats[ci].options[oi].priceAdjustment = Number(e.target.value);
                        set('optionCategories', cats);
                      }}
                      placeholder="+NPR"
                    />
                  </div>
                ))}
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm border-t border-gray-100 pt-3">
              <input type="checkbox" checked={form.isHamper} onChange={(e) => set('isHamper', e.target.checked)} />
              Is this a Gift Hamper (Combo)?
            </label>
          </section>

          <section className="card space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">SEO Optimization</h2>
              <button type="button" onClick={handleAiSeo} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                AI SEO Generate
              </button>
            </div>
            <div>
              <FieldLabel>Meta Search Title</FieldLabel>
              <input className="input-field text-sm" value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Meta Description Tag</FieldLabel>
              <textarea className="input-field text-sm" rows={2} value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Meta Keywords List</FieldLabel>
              <input className="input-field text-sm" value={form.metaKeywords} onChange={(e) => set('metaKeywords', e.target.value)} placeholder="comma-separated" />
            </div>
          </section>

          <section className="card">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Real-Time SEO Auditor</h2>
            <div>
              <FieldLabel>Target Focus Keyword</FieldLabel>
              <input className="input-field text-sm mb-4" value={form.focusKeyword} onChange={(e) => set('focusKeyword', e.target.value)} placeholder="e.g. belgian chocolate gift" />
            </div>
            <SeoGauge score={seoAudit.score} rating={seoAudit.rating} />
            <div className="mb-4">
              <ScoreBar label="Meta" value={seoAudit.breakdown.meta} />
              <ScoreBar label="Content" value={seoAudit.breakdown.content} />
              <ScoreBar label="Title" value={seoAudit.breakdown.title} />
              <ScoreBar label="Media" value={seoAudit.breakdown.media} />
              <ScoreBar label="Links" value={seoAudit.breakdown.links} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Audit Checklist ({seoAudit.checks.length} items)</p>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {seoAudit.checks.map((check, i) => (
                <div key={i} className={`text-xs flex items-start gap-1.5 ${check.ok ? 'text-green-700' : 'text-red-600'}`}>
                  <span>{check.ok ? '✓' : '✗'}</span>
                  <span>{check.text}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 px-8 py-4 flex justify-end gap-3 z-10">
        <button type="button" onClick={() => navigate('/admin/products')} className="btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary px-8">
          {saving ? 'Saving...' : 'Save Catalog'}
        </button>
      </div>
    </div>
  );
}
