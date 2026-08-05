/** Admin guide: how to structure homepage content for Rank Math / Google. */
export default function HomepageSeoGuide({ className = '' }) {
  return (
    <div className={`rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-3 ${className}`}>
      <div>
        <h3 className="text-sm font-bold text-sky-900 uppercase tracking-wide">
          Homepage SEO guide
        </h3>
        <p className="text-xs text-sky-800/80 mt-1">
          Category and product pages get H1 / meta automatically. The homepage is built with blocks —
          follow this layout so Rank Math sees the same structure as Google.
        </p>
      </div>

      <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside">
        <li>
          <strong className="text-slate-900">Page title = your only H1 topic</strong>
          <p className="text-xs text-slate-600 mt-1 ml-5">
            In Page settings, set Title to a keyword phrase (e.g. <em>Send Gifts to Nepal</em>), not
            “Homepage”. The storefront uses this as the page H1 when there is no Hero title.
          </p>
        </li>
        <li>
          <strong className="text-slate-900">H1 — use exactly one</strong>
          <p className="text-xs text-slate-600 mt-1 ml-5">
            Either a <em>Hero</em> block with a title (that becomes H1), or leave Hero without a title
            so the Page title shows as H1. Do not put another H1 inside Text / rich content.
          </p>
        </li>
        <li>
          <strong className="text-slate-900">H2 — section titles</strong>
          <p className="text-xs text-slate-600 mt-1 ml-5">
            Titles on Product grid, Categories grid, Banner, CTA, FAQ, and Text blocks render as H2.
            Use clear section names (e.g. “Birthday gifts”, “Same-day delivery”).
          </p>
        </li>
        <li>
          <strong className="text-slate-900">Body content (150+ words)</strong>
          <p className="text-xs text-slate-600 mt-1 ml-5">
            Add at least one <em>Text</em> block with helpful copy about gifts/delivery in Nepal.
            Use H2/H3 inside the editor for subsections — not a second H1.
          </p>
        </li>
        <li>
          <strong className="text-slate-900">SEO meta panel</strong>
          <p className="text-xs text-slate-600 mt-1 ml-5">
            Meta title 50–60 characters · Meta description 120–160 · Focus keyword matching the H1
            topic · Schema WebPage · Upload an OG image.
          </p>
        </li>
      </ol>

      <div className="rounded-lg bg-white/80 border border-sky-100 px-3 py-2 text-xs text-slate-600">
        <p className="font-semibold text-slate-800 mb-1">Suggested block order</p>
        <p>
          Hero (optional H1) → Categories / Product grids (H2 titles) → Text block (body + H2s) → CTA
        </p>
      </div>
    </div>
  );
}
