import config from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

const MAX_STORED = 8;
const FETCH_LIMIT = 5;

const normalizeReview = (review) => ({
  id: `${review.author_name || 'anon'}-${review.time || Date.now()}`,
  authorName: review.author_name || 'Google user',
  authorPhoto: review.profile_photo_url || '',
  rating: Number(review.rating) || 5,
  text: review.text || '',
  relativeTime: review.relative_time_description || '',
  publishedAt: review.time ? new Date(review.time * 1000).toISOString() : null,
  source: 'google',
});

export const fetchGooglePlaceReviews = async (placeId) => {
  const apiKey = config.google?.placesApiKey;
  if (!apiKey) {
    throw new ApiError(
      503,
      'Google Places API key is not configured. Add GOOGLE_PLACES_API_KEY to your backend .env file.'
    );
  }
  if (!placeId?.trim()) {
    throw new ApiError(400, 'Google Place ID is required');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId.trim());
  url.searchParams.set('fields', 'reviews,rating,user_ratings_total,url,name');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new ApiError(502, 'Could not reach Google Places API');
  }

  const payload = await response.json();
  if (payload.status !== 'OK') {
    throw new ApiError(400, payload.error_message || `Google Places error: ${payload.status}`);
  }

  const reviews = (payload.result?.reviews || [])
    .slice(0, FETCH_LIMIT)
    .map(normalizeReview);

  return {
    reviews,
    rating: payload.result?.rating ?? null,
    totalReviews: payload.result?.user_ratings_total ?? null,
    placeName: payload.result?.name || '',
    placeUrl: payload.result?.url || '',
    fetchedAt: new Date().toISOString(),
    fetchLimit: FETCH_LIMIT,
    maxStored: MAX_STORED,
  };
};
