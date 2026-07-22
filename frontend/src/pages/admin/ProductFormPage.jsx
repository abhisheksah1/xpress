import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import DeliveryGroupRulesEditor from '../../components/admin/DeliveryGroupRulesEditor.jsx';
import ComboItemsEditor from '../../components/admin/ComboItemsEditor.jsx';
import AdminImageDropzone from '../../components/admin/AdminImageDropzone.jsx';
import { serializeComboItemsForApi, buildComboShortDescription } from '../../utils/comboItems.js';
import { auditSeo, generateSeoFields, generateSkuPreview, slugify } from '../../utils/seoAuditor.js';
import AdminDescriptionPreview from '../../components/admin/AdminDescriptionPreview.jsx';
import SeoMetaEditor from '../../components/admin/SeoMetaEditor.jsx';
import { emptySeoMeta, mergeEntitySeoForEditor } from '../../utils/seoMeta.js';
import {
  ADMIN_PERSONALIZATION_OPTIONS,
  defaultPersonalizationFields,
  normalizePersonalizationFields,
} from '../../utils/personalization.js';
import { htmlToPlainText } from '../../utils/productHtml.js';

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
  deliveryScope: 'inherit',
  deliveryGroupRules: [],
  description: '',
  shortDescriptionEnabled: false,
  longDescription: '',
  additionalNote: '',
  imageUrlInput: '',
  personalizationFields: defaultPersonalizationFields(),
  allowBackorder: false,
  barcode: '',
  weight: '',
  productGroup: '',
  skuVariant: '',
  standardSize: '',
  isHamper: false,
  comboItems: [],
  optionCategories: [],
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  focusKeyword: '',
  seo: emptySeoMeta({ schemaType: 'Product' }),
  tags: '',
});

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toOptionalNumber(value) {
  if (value === '' || value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function formatApiError(err, fallback = 'Failed to save product') {
  const data = err.response?.data;
  const validationErrors = data?.errors;
  if (Array.isArray(validationErrors) && validationErrors.length) {
    const detail = validationErrors
      .map((e) => (typeof e === 'string' ? e : `${e.field}: ${e.message}`))
      .join(' · ');
    return detail || data?.message || fallback;
  }
  return data?.message || fallback;
}

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
  const [comboStockPreview, setComboStockPreview] = useState(null);
  const [newOptionName, setNewOptionName] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setPersonalization = (key, patch) =>
    setForm((f) => {
      const current = f.personalizationFields[key] || { enabled: false, required: false };
      const next = typeof patch === 'boolean'
        ? { enabled: patch, required: patch ? current.required : false }
        : { ...current, ...patch };
      if (!next.enabled) next.required = false;
      return {
        ...f,
        personalizationFields: { ...f.personalizationFields, [key]: next },
      };
    });

  useEffect(() => {
    Promise.all([adminApi.getCategories(), adminApi.getDeliveryGroups()]).then(([catRes, zoneRes]) => {
      setCategories(catRes.data.data);
      setDeliveryZones(zoneRes.data.data);
    });
  }, []);

  useEffect(() => {
    if (!deliveryZones.length) return;
    setForm((f) => {
      const existing = new Map(f.deliveryGroupRules.map((r) => [String(r.group), r]));
      let changed = f.deliveryGroupRules.length !== deliveryZones.length;
      const merged = deliveryZones.map((g) => {
        const id = String(g._id);
        if (existing.has(id)) {
          const rule = existing.get(id);
          return {
            ...rule,
            group: id,
            estimatedDays: rule.estimatedDays || { min: '', max: '' },
          };
        }
        changed = true;
        return {
          group: id,
          available: false,
          sameDay: false,
          estimatedDays: { min: '', max: '' },
        };
      });
      return changed ? { ...f, deliveryGroupRules: merged } : f;
    });
  }, [deliveryZones]);

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
        const mappedComboItems = (p.comboItems || []).map((item, index) => ({
            product: item.product?._id || item.product,
            productData: item.product?._id ? item.product : undefined,
            quantity: item.quantity || 1,
            sortOrder: item.sortOrder ?? index,
          }));
        const autoDescription = p.isHamper ? buildComboShortDescription(mappedComboItems) : '';
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
          deliveryScope: p.deliveryScope || 'inherit',
          deliveryGroupRules: (p.deliveryGroupRules || []).map((r) => ({
            group: r.group?._id || r.group,
            available: r.available,
            sameDay: r.sameDay,
            estimatedDays: r.estimatedDays || { min: '', max: '' },
          })),
          description: autoDescription || p.description || '',
          shortDescriptionEnabled: p.isHamper
            ? Boolean(autoDescription || p.shortDescriptionEnabled)
            : p.shortDescriptionEnabled === true,
          longDescription: p.longDescription || '',
          additionalNote: p.additionalNote || '',
          imageUrlInput: '',
          personalizationFields: normalizePersonalizationFields(p.personalizationFields),
          allowBackorder: p.allowBackorder ?? false,
          barcode: p.barcode || '',
          weight: p.weight ?? '',
          productGroup: p.productGroup || '',
          skuVariant: p.skuVariant || '',
          standardSize: p.standardSize || '',
          isHamper: p.isHamper ?? false,
          comboItems: mappedComboItems,
          optionCategories: p.optionCategories || [],
          metaTitle: p.metaTitle || p.seo?.metaTitle || '',
          metaDescription: p.metaDescription || p.seo?.metaDescription || '',
          metaKeywords: (p.seo?.metaKeywords || p.metaKeywords || []).join(', '),
          focusKeyword: p.seo?.focusKeyword || p.focusKeyword || '',
          seo: mergeEntitySeoForEditor({
            ...p,
            seo: {
              ...(p.seo || {}),
              metaTitle: p.seo?.metaTitle || p.metaTitle,
              metaDescription: p.seo?.metaDescription || p.metaDescription,
              focusKeyword: p.seo?.focusKeyword || p.focusKeyword,
              metaKeywords: p.seo?.metaKeywords?.length ? p.seo.metaKeywords : p.metaKeywords,
              schemaType: p.seo?.schemaType || 'Product',
            },
          }),
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

  const handleComboItemsChange = (items) => {
    const autoDescription = buildComboShortDescription(items);
    setForm((f) => ({
      ...f,
      comboItems: items,
      ...(f.isHamper && autoDescription
        ? { description: autoDescription, shortDescriptionEnabled: true }
        : {}),
    }));
  };

  const toggleCategory = (catId) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(catId)
        ? f.categoryIds.filter((c) => c !== catId)
        : [...f.categoryIds, catId],
    }));
  };

  const buildDeliveryGroupRules = () =>
    form.deliveryGroupRules
      .filter((r) => {
        if (form.deliveryScope === 'selected') return !!r.available;
        const min = r.estimatedDays?.min;
        const max = r.estimatedDays?.max;
        return !!r.sameDay || (min !== '' && min != null) || (max !== '' && max != null);
      })
      .map((r) => ({
        group: String(r.group),
        available: form.deliveryScope === 'selected' ? !!r.available : true,
        sameDay: !!r.sameDay,
        estimatedDays: {
          min: r.estimatedDays?.min === '' || r.estimatedDays?.min == null ? undefined : Number(r.estimatedDays.min),
          max: r.estimatedDays?.max === '' || r.estimatedDays?.max == null ? undefined : Number(r.estimatedDays.max),
        },
      }));

  const addImagesFromUrls = async (urlString) => {
    const urls = urlString.split(',').map((u) => u.trim()).filter(Boolean);
    for (const url of urls) {
      try {
        const { data } = await adminApi.uploadImageUrl(url, form.name, {
          category: 'product',
          sourceContext: 'product',
          sourceLabel: form.name,
        });
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

  const uploadPreparedImages = async (files) => {
    setUploading(true);
    try {
      for (const file of files) {
        const { data } = await adminApi.uploadImage(file, {
          category: 'product',
          sourceContext: 'product',
          sourceLabel: form.name,
          alt: form.name,
        });
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
      }
      toast.success(files.length === 1 ? 'Image uploaded' : `${files.length} images uploaded`);
    } catch {
      toast.error('Upload failed — try pasting an image URL instead');
    } finally {
      setUploading(false);
    }
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
    const focusKeyword = form.focusKeyword || (form.name ? form.name.split(' ')[0].toLowerCase() : '');
    setForm((f) => ({
      ...f,
      metaTitle: generated.metaTitle,
      metaDescription: generated.metaDescription,
      metaKeywords: generated.metaKeywords.join(', '),
      focusKeyword,
      seo: {
        ...emptySeoMeta({ schemaType: 'Product' }),
        ...(f.seo || {}),
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        metaKeywords: generated.metaKeywords,
        focusKeyword,
        ogTitle: f.seo?.ogTitle || generated.metaTitle,
        ogDescription: f.seo?.ogDescription || generated.metaDescription,
        schemaType: 'Product',
      },
    }));
    toast.success('SEO fields generated');
  };

  const handleSeoChange = (seo) => {
    setForm((f) => ({
      ...f,
      seo,
      metaTitle: seo.metaTitle || '',
      metaDescription: seo.metaDescription || '',
      focusKeyword: seo.focusKeyword || '',
      metaKeywords: Array.isArray(seo.metaKeywords) ? seo.metaKeywords.join(', ') : '',
    }));
  };

  const buildPayload = () => {
    const statusOpt = STATUS_OPTIONS.find((s) => s.value === form.status) || STATUS_OPTIONS[0];
    const sortedImages = images.map((img, i) => ({ ...img, sortOrder: img.isPrimary ? 0 : i + 1 }));
    return {
      name: form.name,
      slug: form.slug || slugify(form.name),
      sku: form.sku || undefined,
      description: form.description || undefined,
      shortDescription: form.description?.slice(0, 200) || undefined,
      shortDescriptionEnabled: Boolean(form.shortDescriptionEnabled),
      longDescription: form.longDescription || undefined,
      additionalNote: form.additionalNote || undefined,
      category: form.categoryIds[0],
      categories: form.categoryIds,
      brand: form.brand,
      price: toNumber(form.price),
      compareAtPrice: toOptionalNumber(form.compareAtPrice),
      costPrice: toOptionalNumber(form.costPrice),
      stock: toNumber(form.stock),
      lowStockThreshold: toNumber(form.lowStockThreshold, 3),
      deliveryZones: form.deliveryScope === 'selected'
        ? form.deliveryGroupRules.filter((r) => r.available).map((r) => r.group)
        : form.deliveryZoneIds,
      deliveryScope: form.deliveryScope,
      deliveryGroupRules: buildDeliveryGroupRules(),
      images: sortedImages,
      personalizationFields: normalizePersonalizationFields(form.personalizationFields),
      allowBackorder: form.allowBackorder,
      isHamper: form.isHamper,
      comboItems: form.isHamper ? serializeComboItemsForApi(form.comboItems) : [],
      barcode: form.barcode || undefined,
      weight: toOptionalNumber(form.weight),
      productGroup: form.productGroup || undefined,
      skuVariant: form.skuVariant || undefined,
      standardSize: form.standardSize || undefined,
      optionCategories: (form.optionCategories || []).map((cat) => ({
        name: cat.name,
        options: (cat.options || []).map((opt) => ({
          label: opt.label,
          ...(toOptionalNumber(opt.priceAdjustment) !== undefined
            ? { priceAdjustment: toOptionalNumber(opt.priceAdjustment) }
            : {}),
        })),
      })),
      isActive: statusOpt.isActive,
      isGiftWrappable: form.personalizationFields.giftMessage?.enabled,
      giftMessageEnabled: form.personalizationFields.giftMessage?.enabled,
      metaTitle: form.seo?.metaTitle || form.metaTitle || undefined,
      metaDescription: form.seo?.metaDescription || form.metaDescription || undefined,
      metaKeywords: form.seo?.metaKeywords?.length
        ? form.seo.metaKeywords
        : form.metaKeywords
          ? form.metaKeywords.split(',').map((k) => k.trim()).filter(Boolean)
          : [],
      focusKeyword: form.seo?.focusKeyword || form.focusKeyword || undefined,
      seo: {
        ...emptySeoMeta({ schemaType: 'Product' }),
        ...(form.seo || {}),
        metaTitle: form.seo?.metaTitle || form.metaTitle || undefined,
        metaDescription: form.seo?.metaDescription || form.metaDescription || undefined,
        focusKeyword: form.seo?.focusKeyword || form.focusKeyword || undefined,
        metaKeywords: form.seo?.metaKeywords?.length
          ? form.seo.metaKeywords
          : form.metaKeywords
            ? form.metaKeywords.split(',').map((k) => k.trim()).filter(Boolean)
            : [],
        schemaType: form.seo?.schemaType || 'Product',
      },
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

    if (form.isHamper && !serializeComboItemsForApi(form.comboItems).length) {
      return toast.error('Add at least one product to this combo');
    }

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
      toast.error(formatApiError(err));
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
                <FieldLabel>
                  {form.isHamper ? 'Combo Stock (auto-calculated)' : 'Remaining Stock'}
                </FieldLabel>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={form.isHamper ? (comboStockPreview ?? form.stock) : form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                  readOnly={form.isHamper}
                  disabled={form.isHamper}
                />
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
            <p className="text-xs text-gray-500">
              Control which delivery groups can receive this product, same-day options, and custom delivery times.
              Choose <strong>Only selected groups</strong> to limit areas (e.g. Kathmandu only), or <strong>Deliver to all groups</strong> with per-group overrides below.
              <Link to="/admin/delivery" className="text-primary-600 ml-1">Manage delivery groups</Link>
            </p>
            {deliveryZones.length === 0 ? (
              <p className="text-sm text-amber-600">No delivery groups configured yet.</p>
            ) : (
              <DeliveryGroupRulesEditor
                groups={deliveryZones}
                scope={form.deliveryScope}
                onScopeChange={(v) => set('deliveryScope', v)}
                rules={form.deliveryGroupRules}
                onRulesChange={(rules) => set('deliveryGroupRules', rules)}
              />
            )}
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Descriptions</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              CSV import maps column <span className="font-mono">product_description</span> to long description. Add or edit short description, HTML, and notes here.
            </p>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <FieldLabel>Short description</FieldLabel>
                <label className="flex items-center gap-2 text-sm text-gray-700 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.shortDescriptionEnabled}
                    onChange={(e) => set('shortDescriptionEnabled', e.target.checked)}
                  />
                  Show on product page
                </label>
              </div>
              <textarea
                className="input-field text-sm leading-relaxed"
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Brief summary shown below the product title when enabled"
              />
              <AdminDescriptionPreview content={form.description} label="Short description preview" />
              <p className="text-xs text-gray-400 mt-1">
                {form.isHamper
                  ? 'Auto-filled from linked product short descriptions when combo contents change. Enable to show below the product title on the store.'
                  : 'CSV imports keep this hidden until you enable it here.'}
              </p>
            </div>
            <div>
              <FieldLabel>Product Long Description (SEO Rich Paragraphs)</FieldLabel>
              <textarea
                className="input-field text-sm leading-relaxed"
                rows={8}
                value={form.longDescription}
                onChange={(e) => set('longDescription', e.target.value)}
                placeholder="Full description — delivery info, links, etc. HTML from CSV is cleaned on import."
              />
              <AdminDescriptionPreview content={form.longDescription} label="Long description preview (customer view)" />
              {form.longDescription && htmlToPlainText(form.longDescription) !== form.longDescription.trim() && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-500 cursor-pointer">Show raw HTML source</summary>
                  <pre className="mt-2 text-[11px] text-slate-600 bg-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                    {form.longDescription}
                  </pre>
                </details>
              )}
            </div>
            <div>
              <FieldLabel>Additional Note</FieldLabel>
              <textarea className="input-field" rows={2} value={form.additionalNote} onChange={(e) => set('additionalNote', e.target.value)} placeholder="Shown on the customer product page" />
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Visual Digital Media Assets</h2>
            <AdminImageDropzone
              guideKey="product"
              multiple
              uploading={uploading}
              onFilesSelected={uploadPreparedImages}
              title="Drag & drop product images"
              hint="Each image opens in the crop tool — choose 1200×1200 or another preset"
            />

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
            <p className="text-xs text-gray-500">
              Show fields on the product page. Mark mandatory only when the customer must fill them before ordering.
            </p>
            {ADMIN_PERSONALIZATION_OPTIONS.map(({ key, label, description }) => {
              const field = form.personalizationFields[key] || { enabled: false, required: false };
              return (
                <div key={key} className="rounded-lg border border-gray-100 p-3 space-y-2">
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={(e) => setPersonalization(key, { enabled: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-gray-800">{label}</span>
                      <span className="block text-xs text-gray-400">{description}</span>
                    </span>
                  </label>
                  {field.enabled && (
                    <label className="flex items-center gap-2 text-xs text-gray-600 ml-6 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => setPersonalization(key, { required: e.target.checked })}
                      />
                      <span>
                        Mandatory
                        <span className="text-gray-400"> — customer cannot add to basket without this</span>
                      </span>
                    </label>
                  )}
                </div>
              );
            })}
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
              <input
                type="checkbox"
                checked={form.isHamper}
                onChange={(e) => {
                  const checked = e.target.checked;
                  set('isHamper', checked);
                  if (!checked) {
                    set('comboItems', []);
                  }
                }}
              />
              Is this a Gift Hamper / Combo Product?
            </label>

            {form.isHamper && (
              <ComboItemsEditor
                productId={id}
                comboItems={form.comboItems}
                images={images}
                onChange={handleComboItemsChange}
                onImagesChange={setImages}
                onStockPreview={setComboStockPreview}
              />
            )}
          </section>

          <section className="card space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">SEO Optimization</h2>
              <button type="button" onClick={handleAiSeo} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                AI SEO Generate
              </button>
            </div>
            <SeoMetaEditor
              value={form.seo || emptySeoMeta({ schemaType: 'Product' })}
              onChange={handleSeoChange}
              pageTitle={form.name}
              pageDescription={htmlToPlainText(form.description || form.longDescription || '')}
              canonicalPreview={form.slug ? `/shop/${form.slug}` : ''}
              defaultSchemaType="Product"
              onUploadImage={async (file) => {
                const { data } = await adminApi.uploadImage(file);
                return data.data;
              }}
            />
          </section>

          <section className="card">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Real-Time SEO Auditor</h2>
            <div>
              <FieldLabel>Target Focus Keyword</FieldLabel>
              <input
                className="input-field text-sm mb-4"
                value={form.focusKeyword}
                onChange={(e) => {
                  const focusKeyword = e.target.value;
                  setForm((f) => ({
                    ...f,
                    focusKeyword,
                    seo: { ...(f.seo || emptySeoMeta({ schemaType: 'Product' })), focusKeyword },
                  }));
                }}
                placeholder="e.g. belgian chocolate gift"
              />
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
