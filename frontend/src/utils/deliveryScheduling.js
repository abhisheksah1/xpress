import { getZonedParts, zonedTimeToUtc } from './deliveryCountdown.js';

export const DELIVERY_PREP_HOURS = 3;
export const DEFAULT_DELIVERY_TIMEZONE = 'Asia/Kathmandu';

export function formatDateInputValue({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDateInputValue(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

export function getEarliestDeliveryMs(nowMs = Date.now(), prepHours = DELIVERY_PREP_HOURS) {
  return nowMs + prepHours * 60 * 60 * 1000;
}

export function getMinPreferredDeliveryDate({
  nowMs = Date.now(),
  prepHours = DELIVERY_PREP_HOURS,
  timeZone = DEFAULT_DELIVERY_TIMEZONE,
} = {}) {
  const parts = getZonedParts(new Date(getEarliestDeliveryMs(nowMs, prepHours)), timeZone);
  return formatDateInputValue(parts);
}

export function getSlotStartMs(preferredDateStr, startTime, timeZone = DEFAULT_DELIVERY_TIMEZONE) {
  const dateParts = parseDateInputValue(preferredDateStr);
  if (!dateParts || !startTime) return null;
  const [h, m] = String(startTime).split(':').map((x) => Number(x));
  if (Number.isNaN(h)) return null;
  return zonedTimeToUtc({ ...dateParts, hour: h, minute: Number(m) || 0 }, timeZone);
}

function resolvePreferredDateForSlots(preferredDateStr, nowMs, prepHours, timeZone) {
  if (preferredDateStr) return preferredDateStr;
  return getMinPreferredDeliveryDate({ nowMs, prepHours, timeZone });
}

export function isTimeSlotAvailable(
  slot,
  preferredDateStr,
  { nowMs = Date.now(), prepHours = DELIVERY_PREP_HOURS, timeZone = DEFAULT_DELIVERY_TIMEZONE } = {}
) {
  const dateStr = resolvePreferredDateForSlots(preferredDateStr, nowMs, prepHours, timeZone);
  const slotStartMs = getSlotStartMs(dateStr, slot?.start, timeZone);
  if (slotStartMs == null) return true;
  return slotStartMs >= getEarliestDeliveryMs(nowMs, prepHours);
}

export function filterAvailableTimeSlots(slots, preferredDateStr, options = {}) {
  return (slots || []).filter((slot) => isTimeSlotAvailable(slot, preferredDateStr, options));
}

export function isPreferredDeliveryDateValid(
  preferredDateStr,
  { nowMs = Date.now(), prepHours = DELIVERY_PREP_HOURS, timeZone = DEFAULT_DELIVERY_TIMEZONE } = {}
) {
  if (!preferredDateStr) return true;
  return preferredDateStr >= getMinPreferredDeliveryDate({ nowMs, prepHours, timeZone });
}

export function validatePreferredDeliverySelection({
  preferredDeliveryDate,
  timeSlotId,
  timeSlots = [],
  nowMs = Date.now(),
  prepHours = DELIVERY_PREP_HOURS,
  timeZone = DEFAULT_DELIVERY_TIMEZONE,
} = {}) {
  const errors = [];

  if (preferredDeliveryDate && !isPreferredDeliveryDateValid(preferredDeliveryDate, { nowMs, prepHours, timeZone })) {
    errors.push(`Preferred delivery date must be at least ${prepHours} hours from now.`);
  }

  if (timeSlotId) {
    const slot = timeSlots.find((s) => String(s.id) === String(timeSlotId));
    if (!slot) {
      errors.push('Invalid delivery time slot.');
    } else if (!isTimeSlotAvailable(slot, preferredDeliveryDate, { nowMs, prepHours, timeZone })) {
      errors.push(`Selected time slot requires at least ${prepHours} hours preparation time.`);
    }
  }

  return errors;
}
