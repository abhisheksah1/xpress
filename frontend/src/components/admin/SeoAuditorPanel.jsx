import { useMemo } from 'react';
import { auditContentSeo } from '../../utils/seoAuditor.js';

function SeoGauge({ score, rating }) {
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : score >= 40 ? 'text-amber-500' : 'text-red-500';
  const ring = score >= 80 ? 'border-green-200' : score >= 60 ? 'border-yellow-200' : score >= 40 ? 'border-amber-200' : 'border-red-200';
  return (
    <div className={`flex flex-col items-center py-3 px-4 rounded-xl border bg-white ${ring}`}>
      <div className={`text-3xl sm:text-4xl font-bold tabular-nums ${color}`}>{score}%</div>
      <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">SEO Score</div>
      <div className={`text-xs font-medium mt-0.5 ${color}`}>{rating}</div>
    </div>
  );
}

function ScoreBar({ label, value, max = 20 }) {
  const pct = Math.round((value / max) * 100);
  const bar =
    pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SeoAuditorPanel({ seo = {}, context = {}, className = '' }) {
  const audit = useMemo(() => auditContentSeo(seo, context), [seo, context]);

  return (
    <div className={`rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wide">Real-Time SEO Auditor</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Updates as you edit meta fields and content · {audit.wordCount} words analysed
          </p>
        </div>
        <SeoGauge score={audit.score} rating={audit.rating} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <ScoreBar label="Meta" value={audit.breakdown.meta} />
        <ScoreBar label="Content" value={audit.breakdown.content} />
        <ScoreBar label="Title / keyword" value={audit.breakdown.title} />
        <ScoreBar label="Media" value={audit.breakdown.media} />
        <ScoreBar label="Links / technical" value={audit.breakdown.links} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Audit checklist ({audit.checks.length})
        </p>
        <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border border-emerald-100 bg-white p-3">
          {audit.checks.map((check, i) => (
            <div
              key={i}
              className={`text-xs flex items-start gap-1.5 ${check.ok ? 'text-green-700' : 'text-red-600'}`}
            >
              <span className="shrink-0 font-bold">{check.ok ? '✓' : '✗'}</span>
              <span>{check.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
