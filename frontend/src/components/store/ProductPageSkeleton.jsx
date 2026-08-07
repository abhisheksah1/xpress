/** Instant product-page shell so customers never stare at blank “Loading…” text. */
export default function ProductPageSkeleton({ title = 'Product' }) {
  return (
    <div className="bg-[#FCF9F9] min-h-screen" aria-busy="true" aria-label="Loading product">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-pulse">
        <div className="h-3 w-48 bg-rose-100/80 rounded mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-square rounded-2xl bg-rose-100/70 border border-rose-100" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-16 h-16 rounded-xl bg-rose-100/60" />
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {title}
            </h1>
            <div className="h-20 rounded-2xl bg-white border border-rose-100" />
            <div className="h-12 rounded-xl bg-rose-200/50" />
            <div className="h-12 rounded-xl bg-rose-100/80" />
            <div className="h-24 rounded-xl bg-white border border-rose-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
