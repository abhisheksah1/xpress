/**
 * Build a compact page list with ellipses, e.g. [1, '…', 4, 5, 6, '…', 20]
 */
export function getVisiblePages(current, total, { siblingCount = 1, boundaryCount = 1 } = {}) {
  const page = Math.min(Math.max(1, Number(current) || 1), Math.max(1, total));
  const pages = Math.max(1, Number(total) || 1);
  if (pages <= 1) return [1];

  const range = (start, end) => {
    const out = [];
    for (let i = start; i <= end; i += 1) out.push(i);
    return out;
  };

  const totalNumbers = siblingCount * 2 + boundaryCount * 2 + 3;
  if (pages <= totalNumbers) return range(1, pages);

  const leftSibling = Math.max(page - siblingCount, boundaryCount + 2);
  const rightSibling = Math.min(page + siblingCount, pages - boundaryCount - 1);

  const showLeftEllipsis = leftSibling > boundaryCount + 2;
  const showRightEllipsis = rightSibling < pages - boundaryCount - 1;

  const leftBoundary = range(1, boundaryCount);
  const rightBoundary = range(pages - boundaryCount + 1, pages);

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = siblingCount * 2 + boundaryCount + 2;
    return [...range(1, leftItemCount), '…', ...rightBoundary];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = siblingCount * 2 + boundaryCount + 2;
    return [...leftBoundary, '…', ...range(pages - rightItemCount + 1, pages)];
  }
  return [...leftBoundary, '…', ...range(leftSibling, rightSibling), '…', ...rightBoundary];
}

/**
 * Responsive pagination: Prev/Next + numbered pages with ellipsis.
 * Works on admin tables and storefront product grids.
 */
export default function Pagination({
  page = 1,
  pages = 1,
  total,
  limit,
  onPageChange,
  className = '',
  showSummary = true,
  itemLabel = 'items',
}) {
  const current = Math.min(Math.max(1, Number(page) || 1), Math.max(1, pages));
  const totalPages = Math.max(1, Number(pages) || 1);
  if (totalPages <= 1) return null;

  const desktopPages = getVisiblePages(current, totalPages, { siblingCount: 1, boundaryCount: 1 });
  const mobilePages = getVisiblePages(current, totalPages, { siblingCount: 0, boundaryCount: 1 });

  const rangeStart = limit && total != null ? (current - 1) * limit + 1 : null;
  const rangeEnd = limit && total != null ? Math.min(current * limit, total) : null;

  const go = (next) => {
    if (next < 1 || next > totalPages || next === current) return;
    onPageChange?.(next);
  };

  const btnBase =
    'inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2.5 rounded-lg text-sm font-semibold transition-colors touch-manipulation select-none';
  const btnIdle = 'bg-white border border-gray-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100';
  const btnActive = 'bg-primary-600 border border-primary-600 text-white shadow-sm';
  const btnDisabled = 'opacity-40 pointer-events-none';

  const renderPageButtons = (items, visibilityClass) => (
    <div className={`items-center gap-1 ${visibilityClass}`}>
      {items.map((item, idx) =>
        item === '…' ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex items-center justify-center min-w-[2rem] h-10 px-1 text-slate-400 text-sm"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => go(item)}
            aria-label={`Page ${item}`}
            aria-current={item === current ? 'page' : undefined}
            className={`${btnBase} ${item === current ? btnActive : btnIdle}`}
          >
            {item}
          </button>
        )
      )}
    </div>
  );

  return (
    <nav
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}
      aria-label="Pagination"
    >
      {showSummary && total != null ? (
        <p className="text-sm text-slate-500 text-center sm:text-left order-2 sm:order-1">
          {rangeStart != null && rangeEnd != null ? (
            <>
              Showing <span className="font-medium text-slate-700">{rangeStart}–{rangeEnd}</span>
              {' '}of <span className="font-medium text-slate-700">{total}</span> {itemLabel}
            </>
          ) : (
            <>
              <span className="font-medium text-slate-700">{total}</span> {itemLabel} · Page {current} of {totalPages}
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-slate-500 text-center sm:text-left order-2 sm:order-1">
          Page {current} of {totalPages}
        </p>
      )}

      <div className="flex items-center justify-center gap-1.5 order-1 sm:order-2 flex-wrap">
        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={current <= 1}
          aria-label="Previous page"
          className={`${btnBase} gap-1 px-3 ${btnIdle} ${current <= 1 ? btnDisabled : ''}`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {renderPageButtons(mobilePages, 'flex sm:hidden')}
        {renderPageButtons(desktopPages, 'hidden sm:flex')}

        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={current >= totalPages}
          aria-label="Next page"
          className={`${btnBase} gap-1 px-3 ${btnIdle} ${current >= totalPages ? btnDisabled : ''}`}
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
