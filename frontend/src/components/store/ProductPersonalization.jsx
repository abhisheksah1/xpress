import { useState } from 'react';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import {
  FIELD_CONFIG,
  getActivePersonalizationFields,
  hasPersonalization,
  emptyPersonalization,
  validatePersonalization,
  personalizationKey,
  mergePersonalization,
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

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const { data } = await storeApi.uploadPersonalizationImage(file);
      const uploadedUrl = data?.data?.url || extractUploadUrl(data);
      if (!uploadedUrl) {
        throw new Error('Upload succeeded but no image URL was returned');
      }
      applyChange((prev) =>
        mergePersonalization(prev, {
          printImageUrl: uploadedUrl,
          printImageName: file.name,
        })
      );
      onImageUploaded?.({ printImageUrl: uploadedUrl, printImageName: file.name });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-white border border-rose-100 space-y-4">
      {fields.map(([flag, config]) => {
        if (config.kind === 'image') {
          return (
            <div key={flag} className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-800">
                {config.label}
                {!config.required && <span className="text-slate-400 font-normal"> (Optional)</span>}
              </label>
              {config.hint && <p className="text-xs text-slate-400">{config.hint}</p>}
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <label className="inline-flex items-center px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                  {uploading ? 'Uploading...' : 'Choose Image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      handleImageUpload(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
                {values.printImageName && (
                  <span className="text-xs text-slate-500 truncate max-w-[180px]">{values.printImageName}</span>
                )}
              </div>
              {values.printImageUrl && (
                <img
                  src={resolveMediaUrl(values.printImageUrl)}
                  alt="Your design preview"
                  className="mt-2 h-20 w-auto max-w-full object-contain border border-slate-200 rounded-lg bg-white p-1"
                />
              )}
            </div>
          );
        }

        const value = values[config.key] || '';
        return (
          <div key={flag} className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-800">
              {config.label}
              {!config.required && <span className="text-slate-400 font-normal"> (Optional)</span>}
            </label>
            {config.hint && <p className="text-xs text-slate-400 -mt-0.5">{config.hint}</p>}
            <input
              type="text"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-white"
              value={value}
              maxLength={config.maxLength}
              placeholder={config.placeholder}
              onChange={(e) => set(config.key, e.target.value.replace(/\n/g, ' '))}
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

  const parts = [];
  if (personalization.cakeMessage) {
    parts.push({ label: 'Cake message', value: personalization.cakeMessage });
  }
  if (personalization.giftMessage) {
    parts.push({ label: 'Gift message', value: personalization.giftMessage });
  }
  if (personalization.printImageUrl) {
    parts.push({
      label: 'Custom design',
      value: personalization.printImageName || 'Image attached',
      image: personalization.printImageUrl,
    });
  }

  if (!parts.length) return null;

  return (
    <div className={`text-xs text-gray-500 space-y-1.5 ${className}`}>
      {parts.map((part) => (
        <div key={part.label}>
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
