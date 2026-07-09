import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImageBlob, pickOutputMime, toCroppedFile } from '../../utils/imageCrop.js';
import { getCropPresets } from '../../utils/imageSizeGuides.js';

export default function ImageCropModal({
  open,
  imageSrc,
  fileName = 'image.jpg',
  guideKey = 'cmsContent',
  queueLabel,
  onConfirm,
  onCancel,
}) {
  const presets = useMemo(() => getCropPresets(guideKey), [guideKey]);
  const [presetId, setPresetId] = useState(presets[0]?.id);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const activePreset = presets.find((p) => p.id === presetId) || presets[0];

  useEffect(() => {
    if (!open) return;
    setPresetId(presets[0]?.id);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [open, imageSrc, presets]);

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const mimeType = pickOutputMime({ name: fileName }, guideKey);
      const outputWidth = activePreset?.width || undefined;
      const outputHeight = activePreset?.height || undefined;
      const blob = await getCroppedImageBlob(
        imageSrc,
        croppedAreaPixels,
        outputWidth,
        outputHeight,
        mimeType
      );
      const file = toCroppedFile(blob, fileName, mimeType);
      await onConfirm(file, activePreset);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Crop image</h3>
            {queueLabel && <p className="text-xs text-gray-500 mt-0.5">{queueLabel}</p>}
          </div>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">
            ×
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Output size</label>
          <select
            className="input-field text-sm"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
                {preset.width && preset.height ? ` — ${preset.width}×${preset.height}px` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="relative bg-slate-900 h-[min(52vh,420px)]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={activePreset?.aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-rose-500"
          />
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} className="btn-primary" disabled={saving || !croppedAreaPixels}>
            {saving ? 'Processing...' : 'Crop & use image'}
          </button>
        </div>
      </div>
    </div>
  );
}
