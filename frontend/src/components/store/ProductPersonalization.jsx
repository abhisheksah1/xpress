import { useState } from 'react';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import {
  getActivePersonalizationFields,
  hasPersonalization,
  emptyPersonalization,
  validatePersonalization,
  personalizationKey,
  mergePersonalization,
  normalizePersonalizationValues,
} from '../../utils/personalization.js';

export { hasPersonalization, emptyPersonalization, validatePersonalization, personalizationKey };

function extractUploadUrl(data) {
  const payload = data?.data ?? data;
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  return payload.url || payload.image?.url || '';
}

export default function ProductPersonalization({ personalizationFields, values, onChange, onImageUploaded }) {
  const [uploading, setUploading] = useState(false);
  const fields = getActivePersonalizationFields(personalizationFields);
  const normalized = normalizePersonalizationValues(values || {});

  if (!fields.length) return null;

  const applyChange = (updater) => {
    if (typeof onChange !== 'function') return;
    if (typeof updater === 'function') {
      onChange((prev) => updater(prev && typeof prev === 'object' ? prev : {}));
      return;
    }
    onChange(updater);
  };

  const set = (key, val) => {
    applyChange((prev) => mergePersonalization(prev, { [key]: val }));
  };

  const syncImages = (printImages) => {
    const next = mergePersonalization({}, {
      ...normalized,
      printImages,
      printImageUrl: printImages[0]?.url || '',
      printImageName: printImages[0]?.name || '',
    });
    applyChange(next);
    onImageUploaded?.({
      printImages,
      printImageUrl: printImages[0]?.url || '',
      printImageName: printImages[0]?.name || '',
    });
  };

  const handleImageUpload = async (file, maxImages) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    if (normalized.printImages.length >= maxImages) {
      toast.error(`You can upload up to ${maxImages} image${maxImages === 1 ? '' : 's'}`);
      return;
    }

    setUploading(true);
    try {
      const { data } = await storeApi.uploadPersonalizationImage(file);
      const uploadedUrl = data?.data?.url || extractUploadUrl(data);
      if (!uploadedUrl) {
        throw new Error('Upload succeeded but no image URL was returned');
      }
      const printImages = [
        ...normalized.printImages,
        { url: uploadedUrl, name: file.name },
      ].slice(0, maxImages);
      syncImages(printImages);
      toast.success(maxImages > 1 ? `Image ${printImages.length}/${maxImages} uploaded` : 'Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const printImages = normalized.printImages.filter((_, i) => i !== index);
    syncImages(printImages);
  };

  return (
    <div className="w-full max-w-none min-w-0 p-4 rounded-xl bg-white border border-rose-100 space-y-4">
      {fields.map(([flag, config]) => {
        if (config.kind === 'image') {
          const maxImages = config.maxImages || 1;
          const count = normalized.printImages.length;
          const canAddMore = count < maxImages;
          return (
            <div key={flag} className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-800">
                {config.label}
                {!config.required && <span className="text-slate-400 font-normal"> (Optional)</span>}
              </label>
              <p className="text-xs text-slate-400">
                {config.hint}
                {maxImages > 1 ? ` · up to ${maxImages} images` : ''}
                {count > 0 ? ` · ${count}/${maxImages} added` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                {canAddMore && (
                  <label className="inline-flex items-center px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                    {uploading ? 'Uploading...' : count ? 'Add another image' : 'Choose Image'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        handleImageUpload(e.target.files?.[0], maxImages);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
              {normalized.printImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {normalized.printImages.map((img, index) => (
                    <div key={`${img.url}-${index}`} className="relative">
                      <img
                        src={resolveMediaUrl(img.url)}
                        alt={img.name || `Design ${index + 1}`}
                        className="h-20 w-auto max-w-[9rem] object-contain border border-slate-200 rounded-lg bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] leading-none"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        ×
                      </button>
                      {img.name && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[9rem] mt-0.5">{img.name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        const value = normalized[config.key] || '';
        const InputTag = config.kind === 'textarea' ? 'textarea' : 'input';
        return (
          <div key={flag} className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-800">
              {config.label}
              {!config.required && <span className="text-slate-400 font-normal"> (Optional)</span>}
            </label>
            {config.hint && <p className="text-xs text-slate-400 -mt-0.5">{config.hint}</p>}
            <InputTag
              type={config.kind === 'textarea' ? undefined : 'text'}
              rows={config.kind === 'textarea' ? 3 : undefined}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white resize-y"
              value={value}
              maxLength={config.maxLength}
              placeholder={config.placeholder}
              onChange={(e) => set(config.key, e.target.value.replace(/\n/g, config.kind === 'textarea' ? '\n' : ' '))}
            />
            {config.maxLength && (
              <p className="text-xs text-slate-400 text-right">
                {value.length}/{config.maxLength}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PersonalizationSummary({ personalization, className = '' }) {
  if (!personalization) return null;
  const normalized = normalizePersonalizationValues(personalization);

  const parts = [];
  if (normalized.cakeMessage) {
    parts.push({ label: 'Cake message', value: normalized.cakeMessage });
  }
  if (normalized.giftMessage) {
    parts.push({ label: 'Text on gift', value: normalized.giftMessage });
  }
  if (normalized.printImages.length) {
    normalized.printImages.forEach((img, index) => {
      parts.push({
        label: normalized.printImages.length > 1 ? `Custom design ${index + 1}` : 'Custom design',
        value: img.name || 'Image attached',
        image: img.url,
      });
    });
  }

  if (!parts.length) return null;

  return (
    <div className={`text-xs text-gray-500 space-y-1.5 ${className}`}>
      {parts.map((part) => (
        <div key={`${part.label}-${part.image || part.value}`}>
          <span className="font-medium text-gray-600">{part.label}: </span>
          {part.image ? (
            <a href={resolveMediaUrl(part.image)} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
              {part.value}
            </a>
          ) : (
            <span className="italic">&ldquo;{part.value}&rdquo;</span>
          )}
        </div>
      ))}
    </div>
  );
}
