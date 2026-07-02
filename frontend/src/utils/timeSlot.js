const parseTime = (time) => {
  if (!time) return null;
  const [hStr, mStr] = String(time).trim().split(':');
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (Number.isNaN(h)) return null;
  return { h, m };
};

const to12h = ({ h, m }, { minutes = false } = {}) => {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  if (minutes && m) return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  return `${hour12} ${period}`;
};

/** Compact range: "9 AM–12 PM" or "2–5 PM" when same period */
export const formatTimeSlotRange = (start, end) => {
  const s = parseTime(start);
  const e = parseTime(end);
  if (!s && !e) return '';
  if (!s) return to12h(e, { minutes: !!e?.m });
  if (!e) return to12h(s, { minutes: !!s?.m });

  const sPeriod = s.h >= 12 ? 'PM' : 'AM';
  const ePeriod = e.h >= 12 ? 'PM' : 'AM';
  const sHour = s.h % 12 || 12;
  const eHour = e.h % 12 || 12;

  if (sPeriod === ePeriod) {
    return `${sHour}–${eHour} ${ePeriod}`;
  }
  return `${to12h(s)}–${to12h(e)}`;
};

const labelHasTime = (label) => /\d{1,2}\s*(:\d{2})?\s*(am|pm)/i.test(label || '');

/**
 * Short option label, e.g. "Early Morning · 9–12 PM · Rs. 500"
 */
export const formatTimeSlotOption = (slot, feeFormatter) => {
  const name = (slot?.label || 'Time slot').trim();
  const range = !labelHasTime(name) ? formatTimeSlotRange(slot?.start, slot?.end) : '';
  const fee = Number(slot?.fee || 0);

  const parts = [name];
  if (range) parts.push(range);
  if (fee > 0) {
    parts.push(feeFormatter ? feeFormatter(fee) : `Rs. ${fee.toLocaleString('en-NP')}`);
  }

  return parts.join(' · ');
};

export const formatTimeSlotSummary = (slot, feeFormatter) => {
  if (!slot) return '';
  return formatTimeSlotOption(slot, feeFormatter);
};
