import { useCallback, useEffect, useRef, useState } from 'react';
import ImageCropModal from '../components/admin/ImageCropModal.jsx';
import { isImageFile } from '../utils/imageCrop.js';

export function useImageCropUpload({ guideKey = 'cmsContent', enableCrop = true } = {}) {
  const [session, setSession] = useState(null);
  const resolveRef = useRef(null);
  const rejectRef = useRef(null);

  const cleanupPreview = useCallback((previewUrl) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, []);

  useEffect(() => () => {
    if (session?.previewUrl) URL.revokeObjectURL(session.previewUrl);
  }, [session?.previewUrl]);

  const processFiles = useCallback((fileList) => {
    const files = [...(fileList || [])].filter(isImageFile);
    if (!files.length) return Promise.resolve([]);

    if (!enableCrop) return Promise.resolve(files);

    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
      const previewUrl = URL.createObjectURL(files[0]);
      setSession({
        files,
        index: 0,
        results: [],
        previewUrl,
      });
    });
  }, [enableCrop]);

  const cancel = useCallback(() => {
    if (session?.previewUrl) cleanupPreview(session.previewUrl);
    rejectRef.current?.(new Error('Crop cancelled'));
    resolveRef.current = null;
    rejectRef.current = null;
    setSession(null);
  }, [cleanupPreview, session]);

  const advance = useCallback((croppedFile) => {
    if (!session) return;

    const results = [...session.results, croppedFile];
    const nextIndex = session.index + 1;

    cleanupPreview(session.previewUrl);

    if (nextIndex >= session.files.length) {
      resolveRef.current?.(results);
      resolveRef.current = null;
      rejectRef.current = null;
      setSession(null);
      return;
    }

    const nextPreview = URL.createObjectURL(session.files[nextIndex]);
    setSession({
      files: session.files,
      index: nextIndex,
      results,
      previewUrl: nextPreview,
    });
  }, [cleanupPreview, session]);

  const modal = session ? (
    <ImageCropModal
      open
      imageSrc={session.previewUrl}
      fileName={session.files[session.index]?.name}
      guideKey={guideKey}
      queueLabel={
        session.files.length > 1
          ? `Image ${session.index + 1} of ${session.files.length}`
          : undefined
      }
      onConfirm={(file) => advance(file)}
      onCancel={cancel}
    />
  ) : null;

  return {
    processFiles,
    modal,
    isCropping: !!session,
    cancel,
  };
}
