const DEFAULT_COLORS = {
  h1: '#e11d48',
  h2: '#0f172a',
  h3: '#0f172a',
  p: '#334155',
};

/** Build ordered text sections from settings.sections, or migrate legacy title/content fields. */
export function buildLegacyTextSections(block = {}) {
  const cfg = block.settings || {};
  if (Array.isArray(cfg.sections) && cfg.sections.length) return cfg.sections;

  const sections = [];
  const level = cfg.headingLevel || 'h1';
  if (block.title?.trim()) {
    sections.push({
      id: 'legacy-title',
      type: level,
      text: block.title.trim(),
      color: cfg.titleColor || DEFAULT_COLORS[level] || '#e11d48',
      underline: !!cfg.titleUnderline,
    });
  }
  if (cfg.subtitle?.trim()) {
    sections.push({
      id: 'legacy-subtitle',
      type: 'h2',
      text: cfg.subtitle.trim(),
      color: cfg.subtitleColor || DEFAULT_COLORS.h2,
      underline: false,
    });
  }
  if (block.content?.trim()) {
    block.content
      .split(/\n\s*\n+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .forEach((chunk, i) => {
        sections.push({
          id: `legacy-p-${i}`,
          type: 'p',
          text: chunk,
          color: cfg.contentColor || DEFAULT_COLORS.p,
        });
      });
  }
  return sections;
}

export { DEFAULT_COLORS };
