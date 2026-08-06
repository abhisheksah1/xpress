import { VisitStat, VisitVisitorDay } from '../models/index.js';

const NEPAL_TZ = 'Asia/Kathmandu';

/** Calendar date YYYY-MM-DD in Nepal time. */
export function nepalDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: NEPAL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Shift a YYYY-MM-DD calendar key by N days (pure date math). */
function shiftDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Record one storefront page view. Unique visitors counted once per Nepal calendar day.
 */
export async function recordPageView({ visitorId, path = '/' } = {}) {
  const vid = String(visitorId || '').trim().slice(0, 64);
  if (!vid || !UUID_RE.test(vid)) {
    return { ok: false, reason: 'invalid_visitor' };
  }

  const date = nepalDateKey();
  const safePath = String(path || '/').slice(0, 200);

  // Ignore admin / API noise if somehow sent
  if (safePath.startsWith('/admin') || safePath.startsWith('/api')) {
    return { ok: false, reason: 'skipped_path' };
  }

  await VisitStat.updateOne(
    { date },
    { $inc: { pageViews: 1 }, $setOnInsert: { uniqueVisitors: 0 } },
    { upsert: true }
  );

  try {
    await VisitVisitorDay.create({ date, visitorId: vid });
    await VisitStat.updateOne({ date }, { $inc: { uniqueVisitors: 1 } });
  } catch (err) {
    // Duplicate key = already counted today
    if (err?.code !== 11000) throw err;
  }

  return { ok: true, date };
}

export async function getVisitStatsForDashboard() {
  const today = nepalDateKey();
  const yesterday = shiftDateKey(today, -1);
  const keys = [];
  for (let i = 0; i < 7; i += 1) keys.push(shiftDateKey(today, -i));

  const rows = await VisitStat.find({ date: { $in: keys } }).lean();
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));

  const todayRow = byDate[today] || { pageViews: 0, uniqueVisitors: 0 };
  const yesterdayRow = byDate[yesterday] || { pageViews: 0, uniqueVisitors: 0 };

  let last7PageViews = 0;
  let last7Visitors = 0;
  const last7Days = keys.map((date) => {
    const row = byDate[date] || { pageViews: 0, uniqueVisitors: 0 };
    last7PageViews += row.pageViews || 0;
    last7Visitors += row.uniqueVisitors || 0;
    return {
      date,
      pageViews: row.pageViews || 0,
      uniqueVisitors: row.uniqueVisitors || 0,
    };
  });

  return {
    today: {
      date: today,
      pageViews: todayRow.pageViews || 0,
      uniqueVisitors: todayRow.uniqueVisitors || 0,
    },
    yesterday: {
      date: yesterday,
      pageViews: yesterdayRow.pageViews || 0,
      uniqueVisitors: yesterdayRow.uniqueVisitors || 0,
    },
    last7Days,
    last7Totals: {
      pageViews: last7PageViews,
      uniqueVisitors: last7Visitors,
    },
    timezone: NEPAL_TZ,
  };
}
