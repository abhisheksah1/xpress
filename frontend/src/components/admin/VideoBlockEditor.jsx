import { useMemo } from 'react';
import { resolveVideoEmbed } from '../../utils/videoEmbed.js';

export default function VideoBlockEditor({ title, url, onTitleChange, onUrlChange }) {
  const embed = useMemo(() => resolveVideoEmbed(url), [url]);

  return (
    <div className="space-y-4 rounded-xl border border-violet-100 bg-violet-50/30 p-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-100 text-violet-800">
          Video
        </span>
        <span className="font-semibold text-gray-800">Video embed</span>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Section title (optional)</label>
        <input
          className="input-field"
          placeholder="Watch our story"
          value={title || ''}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Video URL</label>
        <input
          className="input-field"
          placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
          value={url || ''}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1.5">
          Paste a <strong>YouTube</strong> or <strong>Vimeo</strong> link (watch or share URL works).
          Direct <strong>.mp4</strong> file URLs are also supported.
        </p>
      </div>

      {url && !embed && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Could not parse this URL. Check the link and try again.
        </p>
      )}

      {embed && (
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Preview</p>
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-black aspect-video max-w-2xl">
            {embed.type === 'file' ? (
              <video src={embed.src} controls className="w-full h-full" title={title || 'Video preview'} />
            ) : (
              <iframe
                src={embed.src}
                title={title || 'Video preview'}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 truncate">Embed: {embed.src}</p>
        </div>
      )}
    </div>
  );
}
