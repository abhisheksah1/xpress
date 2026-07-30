import { getZonedParts } from './deliveryCountdown.js';
import {
  DELIVERY_PREP_HOURS,
  DEFAULT_DELIVERY_TIMEZONE,
  getMinPreferredDeliveryDate,
  formatDateInputValue,
  isTimeSlotAvailable,
} from './deliveryScheduling.js';

/**
 * Resolve whether a service add-on is offered for a delivery location / date / time slot.
 *
 * Addon shape (settings.service_addons[]):
 * {
 *   availabilityScope: 'all' | 'selected',
 *   minPrepHours?: number,
 *   minDays?: number,
 *   locationRules?: [{
 *     locationId: string,
 *     available?: boolean,
 *     minPrepHours?: number,
 *     minDays?: number,
 *   }]
 * }
 */

function addCalendarDaysToParts({ year, month, day }, days) {
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + Number(days || 0));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function normalizeId(value) {
  if (value == null) return '';
  if (typeof value === 'object' && value._id != null) return String(value._id);
  return String(value);
}

export function getAddonMinDeliveryDate({
  nowMs = Date.now(),
  minPrepHours = null,
  minDays = null,
  timeZone = DEFAULT_DELIVERY_TIMEZONE,
} = {}) {
  const candidates = [];

  if (minPrepHours != null && minPrepHours !== '' && Number.isFinite(Number(minPrepHours))) {
    candidates.push(
      getMinPreferredDeliveryDate({
        nowMs,
        prepHours: Number(minPrepHours),
        timeZone,
      })
    );
  }

  if (minDays != null && minDays !== '' && Number.isFinite(Number(minDays))) {
    const today = getZonedParts(new Date(nowMs), timeZone);
    const shifted = addCalendarDaysToParts(today, Number(minDays));
    candidates.push(formatDateInputValue(shifted));
  }

  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (a > b ? a : b));
}

export function resolveServiceAddonAvailability(
  addon,
  {
    deliveryLocationId,
    preferredDeliveryDate,
    timeSlotId,
    timeSlots = [],
    nowMs = Date.now(),
    timeZone = DEFAULT_DELIVERY_TIMEZONE,
    locationMinPrepHours = DELIVERY_PREP_HOURS,
  } = {}
) {
  if (!addon || addon.enabled === false) {
    return { available: false, reason: 'disabled' };
  }

  if (!deliveryLocationId) {
    return { available: false, reason: 'no_location', minDeliveryDate: null };
  }

  const scope = addon.availabilityScope === 'selected' ? 'selected' : 'all';
  const rules = Array.isArray(addon.locationRules) ? addon.locationRules : [];
  const locationKey = normalizeId(deliveryLocationId);
  const rule = rules.find((r) => normalizeId(r.locationId) === locationKey);

  let available;
  if (scope === 'selected') {
    available = !!rule?.available;
  } else {
    // All locations: available unless a rule explicitly sets available: false
    available = rule ? rule.available !== false : true;
  }

  if (!available) {
    return { available: false, reason: 'location', minDeliveryDate: null };
  }

  const minPrepHours =
    rule?.minPrepHours != null && rule.minPrepHours !== ''
      ? Number(rule.minPrepHours)
      : addon.minPrepHours != null && addon.minPrepHours !== ''
        ? Number(addon.minPrepHours)
        : Number(locationMinPrepHours);

  const minDays =
    rule?.minDays != null && rule.minDays !== ''
      ? Number(rule.minDays)
      : addon.minDays != null && addon.minDays !== ''
        ? Number(addon.minDays)
        : null;

  const resolvedPrepHours = Number.isFinite(minPrepHours) ? minPrepHours : null;
  const resolvedMinDays = Number.isFinite(minDays) ? minDays : null;

  const minDeliveryDate = getAddonMinDeliveryDate({
    nowMs,
    minPrepHours: resolvedPrepHours,
    minDays: resolvedMinDays,
    timeZone,
  });

  const dateStr = preferredDeliveryDate ? String(preferredDeliveryDate).slice(0, 10) : '';

  if (dateStr && minDeliveryDate && dateStr < minDeliveryDate) {
    return {
      available: false,
      reason: 'prep_time',
      minDeliveryDate,
      minPrepHours: resolvedPrepHours,
      minDays: resolvedMinDays,
    };
  }

  // Selected time slot must be fulfillable under this add-on's prep hours
  if (dateStr && timeSlotId && resolvedPrepHours != null) {
    const slot = (timeSlots || []).find((s) => String(s.id) === String(timeSlotId));
    if (slot && !isTimeSlotAvailable(slot, dateStr, {
      nowMs,
      prepHours: resolvedPrepHours,
      timeZone,
    })) {
      return {
        available: false,
        reason: 'time_slot',
        minDeliveryDate,
        minPrepHours: resolvedPrepHours,
        minDays: resolvedMinDays,
      };
    }
  }

  return {
    available: true,
    minDeliveryDate,
    minPrepHours: resolvedPrepHours,
    minDays: resolvedMinDays,
  };
}

export function filterAvailableServiceAddons(addons = [], options = {}) {
  return (addons || []).filter((addon) => resolveServiceAddonAvailability(addon, options).available);
}
