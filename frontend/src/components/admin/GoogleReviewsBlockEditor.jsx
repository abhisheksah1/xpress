import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

const MAX_REVIEWS = 8;

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
      ))}
    </div>
  );
}

export default function GoogleReviewsBlockEditor({ settings = {}, onChange }) {
  const [fetching, setFetching] = useState(false);
  const reviews = settings.reviews || [];

  const set = (key, value) => onChange(key, value);

  const updateReviews = (next) => set('reviews', next.slice(0, MAX_REVIEWS));

  const handleFetch = async () => {
    if (!settings.placeId?.trim()) {
      toast.error('Enter your Google Place ID first');
      return;
    }
    setFetching(true);
    try {
      const { data } = await adminApi.fetchGoogleReviews(settings.placeId.trim());
      const payload = data.data;
      const manual = reviews.filter((r) => r.source !== 'google');
      const merged = [...(payload.reviews || []), ...manual].slice(0, MAX_REVIEWS);

      set('reviews', merged);
      if (payload.rating != null) set('rating', payload.rating);
      if (payload.totalReviews != null) set('totalReviews', payload.totalReviews);
      if (payload.placeName) set('placeName', payload.placeName);
      if (payload.placeUrl) set('placeUrl', payload.placeUrl);
      set('lastFetchedAt', payload.fetchedAt);

      toast.success(`Fetched ${payload.reviews?.length || 0} latest reviews from Google`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch Google reviews');
    } finally {
      setFetching(false);
    }
  };

  const addManualReview = () => {
    if (reviews.length >= MAX_REVIEWS) {
      toast.error(`Maximum ${MAX_REVIEWS} reviews allowed`);
      return;
    }
    updateReviews([
      ...reviews,
      {
        id: `manual-${Date.now()}`,
        authorName: '',
        authorPhoto: '',
        rating: 5,
        text: '',
        relativeTime: 'Recently',
        source: 'manual',
      },
    ]);
  };

  const updateReview = (index, patch) => {
    updateReviews(reviews.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeReview = (index) => {
    updateReviews(reviews.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <p className="text-xs text-blue-900">
        Reviews are stored on your site (no Google iframe). Click <strong>Get latest reviews</strong> to pull the 5 newest
        from Google Places API — up to {MAX_REVIEWS} total including manual entries. Requires <code className="bg-white/80 px-1 rounded">GOOGLE_PLACES_API_KEY</code> in backend .env.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Google Place ID</label>
          <input
            className="input-field"
            placeholder="ChIJ..."
            value={settings.placeId || ''}
            onChange={(e) => set('placeId', e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Find it in Google Maps → your business → Share → copy the Place ID from the URL or use Google Place ID finder.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Slider interval (ms)</label>
          <input
            type="number"
            min="3000"
            className="input-field"
            value={settings.intervalMs || 6000}
            onChange={(e) => set('intervalMs', Number(e.target.value) || 6000)}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleFetch}
            disabled={fetching}
            className="btn-primary w-full"
          >
            {fetching ? 'Fetching…' : 'Get latest reviews'}
          </button>
        </div>
      </div>

      {(settings.rating != null || settings.totalReviews != null) && (
        <p className="text-sm text-gray-600">
          {settings.placeName && <span className="font-semibold">{settings.placeName}</span>}
          {settings.rating != null && <span> · {settings.rating}★</span>}
          {settings.totalReviews != null && <span> · {settings.totalReviews} total on Google</span>}
          {settings.lastFetchedAt && (
            <span className="block text-xs text-gray-400 mt-0.5">
              Last updated: {new Date(settings.lastFetchedAt).toLocaleString()}
            </span>
          )}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase text-gray-500">
            Stored reviews ({reviews.length}/{MAX_REVIEWS})
          </p>
          <button type="button" onClick={addManualReview} className="text-xs text-primary-600 font-semibold hover:underline">
            + Add manual review
          </button>
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg bg-white/60">
            No reviews yet. Click &quot;Get latest reviews&quot; or add manually.
          </p>
        ) : (
          reviews.map((review, index) => (
            <div key={review.id || index} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {review.authorPhoto ? (
                    <img src={review.authorPhoto} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{review.authorName || 'Reviewer'}</p>
                    <Stars rating={review.rating || 5} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeReview(index)}
                  className="text-xs text-red-500 hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>
              {review.source === 'manual' ? (
                <>
                  <input
                    className="input-field text-sm"
                    placeholder="Reviewer name"
                    value={review.authorName || ''}
                    onChange={(e) => updateReview(index, { authorName: e.target.value })}
                  />
                  <select
                    className="input-field text-sm"
                    value={review.rating || 5}
                    onChange={(e) => updateReview(index, { rating: Number(e.target.value) })}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n} stars</option>
                    ))}
                  </select>
                  <textarea
                    className="input-field text-sm"
                    rows={3}
                    placeholder="Review text"
                    value={review.text || ''}
                    onChange={(e) => updateReview(index, { text: e.target.value })}
                  />
                </>
              ) : (
                <p className="text-sm text-gray-600 line-clamp-3">{review.text || '—'}</p>
              )}
              {review.relativeTime && (
                <p className="text-xs text-gray-400">{review.relativeTime}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
