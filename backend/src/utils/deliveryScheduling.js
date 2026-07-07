/** Wall-clock parts for an IANA timezone. */
function getZonedParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function zonedTimeToUtc({ year, month, day, hour, minute, second = 0 }, timeZone) {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const p = getZonedParts(new Date(utcMs), timeZone);
    const desired = Date.UTC(year, month - 1, day, hour, minute, second);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    utcMs += desired - actual;
  }
  return utcMs;
}

export const DELIVERY_PREP_HOURS = 3;
export const DEFAULT_DELIVERY_TIMEZONE = 'Asia/Kathmandu';

function formatDateInputValue({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateInputValue(str) {
  if (!str) return null;
  if (str instanceof Date) {
    return {
      year: str.getUTCFullYear(),
      month: str.getUTCMonth() + 1,
      day: str.getUTCDate(),
    };
  }
  const raw = String(str).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
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

function getSlotStartMs(preferredDateStr, startTime, timeZone = DEFAULT_DELIVERY_TIMEZONE) {
  const dateParts = parseDateInputValue(preferredDateStr);
  if (!dateParts || !startTime) return null;
  const [h, m] = String(startTime).split(':').map((x) => Number(x));
  if (Number.isNaN(h)) return null;
  return zonedTimeToUtc({ ...dateParts, hour: h, minute: Number(m) || 0 }, timeZone);
}

function resolvePreferredDateForSlots(preferredDateStr, nowMs, prepHours, timeZone) {
  if (preferredDateStr) return String(preferredDateStr).slice(0, 10);
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

export function isPreferredDeliveryDateValid(
  preferredDateStr,
  { nowMs = Date.now(), prepHours = DELIVERY_PREP_HOURS, timeZone = DEFAULT_DELIVERY_TIMEZONE } = {}
) {
  if (!preferredDateStr || String(preferredDateStr).trim() === '') return true;
  return String(preferredDateStr).slice(0, 10) >= getMinPreferredDeliveryDate({ nowMs, prepHours, timeZone });
}

export function assertPreferredDeliverySelection({
  preferredDeliveryDate,
  timeSlotId,
  timeSlots = [],
  nowMs = Date.now(),
  prepHours = DELIVERY_PREP_HOURS,
  timeZone = DEFAULT_DELIVERY_TIMEZONE,
}) {
  if (preferredDeliveryDate && !isPreferredDeliveryDateValid(preferredDeliveryDate, { nowMs, prepHours, timeZone })) {
    throw new Error(`Preferred delivery date must be at least ${prepHours} hours from now.`);
  }

  if (timeSlotId) {
    const slot = (timeSlots || []).find((s) => String(s.id) === String(timeSlotId));
    if (!slot) {
      throw new Error('Invalid delivery time slot.');
    }
    if (!isTimeSlotAvailable(slot, preferredDeliveryDate, { nowMs, prepHours, timeZone })) {
      throw new Error(`Selected time slot requires at least ${prepHours} hours preparation time.`);
    }
  }
}
