/** Wall-clock parts for an IANA timezone. */
export function getZonedParts(date, timeZone) {
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

/** UTC ms for a wall-clock moment in `timeZone`. */
export function zonedTimeToUtc({ year, month, day, hour, minute, second = 0 }, timeZone) {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const p = getZonedParts(new Date(utcMs), timeZone);
    const desired = Date.UTC(year, month - 1, day, hour, minute, second);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    utcMs += desired - actual;
  }
  return utcMs;
}

function addCalendarDay(parts) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function formatCutoffTimeLabel(time, suffix = 'NST') {
  if (!time) return '';
  const [hRaw, mRaw] = String(time).split(':');
  const h = Number(hRaw);
  const m = Number(mRaw || 0);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}${suffix ? ` ${suffix}` : ''}`;
}

/** Auto-derive next-day headline from same-day copy (today → Tomorrow). */
export function deriveNextDayTitle(sameDayTitle) {
  const base = String(sameDayTitle || 'Need delivery today in Kathmandu Valley?').trim();
  if (/\btomorrow\b/i.test(base)) return base;
  if (/\btoday\b/i.test(base)) {
    return base.replace(/\btoday\b/gi, 'Tomorrow');
  }
  return 'Need delivery Tomorrow in Kathmandu Valley?';
}

export function getDeliveryCountdownCopy({ cfg = {}, block = {}, phase }) {
  const sameDayTitle = cfg.titleSameDay || block.title || 'Need delivery today in Kathmandu Valley?';
  const isSameDay = phase === 'same_day';

  return {
    mainTitle: isSameDay
      ? sameDayTitle
      : (cfg.titleNextDay?.trim() || deriveNextDayTitle(sameDayTitle)),
    countdownLabel: isSameDay
      ? (cfg.headingBefore || 'Order closing in...')
      : (cfg.headingAfter || 'Same-day delivery opens in...'),
    deliveryBadge: isSameDay ? 'Same-day delivery' : 'Next-day delivery',
  };
}

/**
 * Delivery countdown cycle:
 * - Midnight → cutoff: same-day window (count down to cutoff)
 * - Cutoff → midnight: next-day only (count down to midnight when same-day reopens)
 */
export function getDeliveryCountdownState({
  nowMs = Date.now(),
  cutoffTime = '17:00',
  timeZone = 'Asia/Kathmandu',
}) {
  const parts = getZonedParts(new Date(nowMs), timeZone);
  const [ch, cm] = String(cutoffTime).split(':').map((x) => Number(x));
  const cutoffH = Number.isNaN(ch) ? 17 : ch;
  const cutoffM = Number.isNaN(cm) ? 0 : cm;

  const nowTotalSec = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const cutoffTotalSec = cutoffH * 3600 + cutoffM * 60;
  const isSameDayWindow = nowTotalSec < cutoffTotalSec;

  let targetMs;
  if (isSameDayWindow) {
    targetMs = zonedTimeToUtc(
      { year: parts.year, month: parts.month, day: parts.day, hour: cutoffH, minute: cutoffM },
      timeZone
    );
  } else {
    const tomorrow = addCalendarDay(parts);
    targetMs = zonedTimeToUtc(
      { year: tomorrow.year, month: tomorrow.month, day: tomorrow.day, hour: 0, minute: 0 },
      timeZone
    );
  }

  const diff = Math.max(0, targetMs - nowMs);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    phase: isSameDayWindow ? 'same_day' : 'next_day',
    isSameDayWindow,
    targetMs,
    hours,
    mins,
    secs,
    cutoffLabel: formatCutoffTimeLabel(cutoffTime),
  };
}
