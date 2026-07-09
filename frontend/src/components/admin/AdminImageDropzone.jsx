import { useRef, useState } from 'react';
import ImageSizeGuide from '../ImageSizeGuide.jsx';
import { useImageCropUpload } from '../../hooks/useImageCropUpload.jsx';
import { isImageFile } from '../../utils/imageCrop.js';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';

export default function AdminImageDropzone({
  guideKey = 'cmsContent',
  multiple = false,
  disabled = false,
  uploading = false,
  onFilesSelected,
  title = 'Drag & drop images here',
  hint = 'or click to browse — images open in the crop tool before upload',
  className = '',
  showGuide = true,
  enableCrop = true,
  children,
}) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const crop = useImageCropUpload({ guideKey, enableCrop });

  const handleRawFiles = async (fileList) => {
    if (disabled || uploading || crop.isCropping) return;
    const imageFiles = [...(fileList || [])].filter(isImageFile);
    if (!imageFiles.length) return;

    const toProcess = multiple ? imageFiles : imageFiles.slice(0, 1);
    try {
      const prepared = await crop.processFiles(toProcess);
      if (prepared.length) await onFilesSelected(prepared);
    } catch {
      /* cancelled crop */
    }
  };

  const openPicker = () => {
    if (disabled || uploading || crop.isCropping) return;
    fileRef.current?.click();
  };

  return (
    <>
      {crop.modal}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          handleRawFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {showGuide && (
        <ImageSizeGuide guide={guideKey} variant="admin" className="rounded-lg border border-blue-100 mb-3" />
      )}

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleRawFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        } ${disabled || uploading ? 'opacity-60 pointer-events-none' : ''} ${className}`}
      >
        <div className="pointer-events-none">
          <p className="text-3xl mb-2" aria-hidden>🖼️</p>
          <p className="text-gray-700 font-medium">{title}</p>
          <p className="text-sm text-gray-400 mt-1">{hint}</p>
          <p className="text-xs text-primary-600 font-semibold mt-3">
            {uploading ? 'Uploading...' : crop.isCropping ? 'Cropping...' : 'Drop files or click to choose'}
          </p>
        </div>
        {children}
      </div>
    </>
  );
}
