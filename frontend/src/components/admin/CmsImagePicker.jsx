import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import ImageSizeGuide from '../ImageSizeGuide.jsx';
import { useImageCropUpload } from '../../hooks/useImageCropUpload.jsx';
import { isImageFile } from '../../utils/imageCrop.js';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';

const parseUrlInput = (input) =>
  input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

async function resolveUploadedUrl(url, alt = '') {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const { data } = await adminApi.uploadImageUrl(trimmed, alt);
    return data.data?.url || trimmed;
  } catch {
    return trimmed;
  }
}

async function uploadFiles(imageFiles) {
  if (imageFiles.length === 1) {
    const { data } = await adminApi.uploadImage(imageFiles[0]);
    return [data.data?.url].filter(Boolean);
  }
  const { data } = await adminApi.uploadImages(imageFiles);
  const images = data.data?.images || [];
  return images.map((img) => img.url).filter(Boolean);
}

export default function CmsImagePicker({
  mode = 'single',
  guideKey,
  images = [],
  onChange,
  label = 'Images',
  alt = '',
  enableCrop = true,
}) {
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const resolvedGuideKey = guideKey || (mode === 'slides' ? 'cmsSlide' : 'cmsContent');
  const crop = useImageCropUpload({ guideKey: resolvedGuideKey, enableCrop });

  const slides = Array.isArray(images) ? images.filter((img) => img?.url) : [];

  const applyChange = (updater) => {
    if (typeof updater === 'function') {
      const current = Array.isArray(images) ? images.filter((img) => img?.url) : [];
      const next = updater(current);
      onChange(mode === 'single' ? next.slice(0, 1) : next);
      return;
    }
    onChange(mode === 'single' ? updater.slice(0, 1) : updater);
  };

  const appendUrls = (newUrls) => {
    const entries = newUrls.map((url) => ({ url, alt: alt || '' }));
    if (!entries.length) return;
    applyChange((current) => [...current, ...entries]);
  };

  const addFromUrl = async () => {
    const urls = mode === 'slides' ? parseUrlInput(urlInput) : [urlInput.trim()].filter(Boolean);
    if (!urls.length) return;

    setUploading(true);
    try {
      const resolved = [];
      for (const url of urls) {
        const stored = await resolveUploadedUrl(url, alt);
        if (stored) resolved.push(stored);
      }
      if (resolved.length) {
        appendUrls(resolved);
        setUrlInput('');
        toast.success(
          mode === 'single'
            ? 'Image added'
            : resolved.length === 1
              ? 'Slide added'
              : `${resolved.length} slides added`
        );
      }
    } catch {
      toast.error('Could not add image from URL');
    } finally {
      setUploading(false);
    }
  };

  const uploadPreparedFiles = async (preparedFiles) => {
    setUploading(true);
    try {
      const urls = await uploadFiles(mode === 'single' ? preparedFiles.slice(0, 1) : preparedFiles);
      if (urls.length) {
        appendUrls(urls);
        toast.success(
          urls.length === 1 ? 'Image uploaded' : `${urls.length} slides uploaded`
        );
      } else {
        toast.error('Upload completed but no image URLs were returned');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addFromFiles = async (fileList) => {
    const imageFiles = [...(fileList || [])].filter(isImageFile);
    if (!imageFiles.length) {
      toast.error('Please choose JPEG, PNG, WebP, or GIF image files');
      return;
    }

    const toProcess = mode === 'single' ? imageFiles.slice(0, 1) : imageFiles;
    try {
      const prepared = await crop.processFiles(toProcess);
      if (prepared.length) await uploadPreparedFiles(prepared);
    } catch {
      /* crop cancelled */
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    await addFromFiles(e.dataTransfer.files);
  };

  const removeAt = (index) => {
    applyChange((current) => current.filter((_, i) => i !== index));
  };

  const openFilePicker = () => {
    if (uploading || crop.isCropping) return;
    fileRef.current?.click();
  };

  const listTitle = mode === 'slides' ? 'Slider carousel slides list' : 'Image';
  const busy = uploading || crop.isCropping;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
      {crop.modal}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple={mode === 'slides'}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          addFromFiles(e.target.files);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-700">{listTitle}</span>
        <span className="text-xs text-slate-500">
          {mode === 'slides'
            ? 'Drag images here — each file is cropped to slide size before upload'
            : 'Drag an image here or browse — crop to recommended size before upload'}
        </span>
      </div>

      <ImageSizeGuide guide={resolvedGuideKey} variant="admin" />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={openFilePicker}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFilePicker();
          }
        }}
        className={`p-3 min-h-[120px] transition-colors cursor-pointer ${
          dragOver ? 'bg-primary-50 ring-2 ring-inset ring-primary-200' : 'hover:bg-white/80'
        } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {slides.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-2xl mb-2" aria-hidden>🖼️</p>
            <p className="text-sm text-slate-500 font-medium">
              Drop {mode === 'slides' ? 'slide images' : 'an image'} here or click to browse
            </p>
            <p className="text-xs text-slate-400 mt-1">Crop tool opens automatically with size presets</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mode === 'slides' && (
              <p className="text-xs font-medium text-slate-600">{slides.length} slide{slides.length === 1 ? '' : 's'} added</p>
            )}
            <div className="flex gap-2 flex-wrap">
              {slides.map((img, idx) => (
                <div key={`${img.url}-${idx}`} className="relative group">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                    <img
                      src={resolveMediaUrl(img.url)}
                      alt={img.alt || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = ''; }}
                    />
                  </div>
                  {mode === 'slides' && (
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/60 text-white px-1 rounded">
                      {idx + 1}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAt(idx);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 pt-1">Drop or click to add more</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 p-3 border-t border-slate-200 bg-white">
        <input
          className="input-field flex-1 text-sm"
          placeholder={
            mode === 'slides'
              ? 'Paste image URL(s) — comma or new line — then press Enter...'
              : 'Paste image URL and press Enter...'
          }
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addFromUrl();
            }
          }}
          disabled={busy}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openFilePicker();
          }}
          disabled={busy}
          className="btn-secondary text-sm whitespace-nowrap inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <span aria-hidden>✂️</span>
          {busy ? (crop.isCropping ? 'Cropping...' : 'Uploading...') : (mode === 'slides' ? 'Upload & crop slides' : 'Upload & crop')}
        </button>
      </div>

      {label && mode === 'single' && slides.length > 0 && (
        <p className="px-3 pb-2 text-[10px] text-slate-400 truncate">{label}: {slides[0].url}</p>
      )}
    </div>
  );
}
