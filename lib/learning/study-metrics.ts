export type StudySessionRow = {
  session_start: string;
  session_end?: string | null;
  duration_minutes?: number | null;
  activity_type?: string | null;
};

type Interval = { start: number; end: number };

function toInterval(
  session: StudySessionRow,
  windowStart?: number,
  windowEnd: number = Date.now()
): Interval | null {
  const rawStart = new Date(session.session_start).getTime();
  const rawEnd = session.session_end
    ? new Date(session.session_end).getTime()
    : rawStart + Number(session.duration_minutes || 0) * 60_000;
  if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd) || rawEnd <= rawStart) return null;

  const start = Math.max(rawStart, windowStart ?? rawStart);
  const end = Math.min(rawEnd, windowEnd, rawStart + 12 * 60 * 60_000);
  return end > start ? { start, end } : null;
}

export function mergeStudyIntervals(
  sessions: StudySessionRow[],
  windowStart?: Date,
  windowEnd: Date = new Date()
): Interval[] {
  const intervals = sessions
    .map((session) => toInterval(session, windowStart?.getTime(), windowEnd.getTime()))
    .filter((interval): interval is Interval => interval !== null)
    .sort((a, b) => a.start - b.start);

  const merged: Interval[] = [];
  for (const interval of intervals) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.start > previous.end) {
      merged.push({ ...interval });
    } else {
      previous.end = Math.max(previous.end, interval.end);
    }
  }
  return merged;
}

export function intervalMinutes(intervals: Interval[]): number {
  return Math.round(intervals.reduce((sum, interval) => sum + interval.end - interval.start, 0) / 60_000);
}

export function localDateKey(value: string | number | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function calculateStudyStreak(activityDates: Array<string | Date>, timeZone: string): number {
  const activeDays = new Set(activityDates.map((date) => localDateKey(date, timeZone)));
  const todayKey = localDateKey(new Date(), timeZone);
  const cursor = new Date(`${todayKey}T12:00:00Z`);
  const yesterday = new Date(cursor);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  if (!activeDays.has(todayKey) && !activeDays.has(localDateKey(yesterday, timeZone))) return 0;
  if (!activeDays.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (activeDays.has(localDateKey(cursor, timeZone))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function calculateDateKeyStreak(dateKeys: string[], todayKey: string): number {
  const activeDays = new Set(dateKeys);
  const cursor = new Date(`${todayKey}T12:00:00Z`);
  const key = () => cursor.toISOString().slice(0, 10);

  if (!activeDays.has(key())) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!activeDays.has(key())) return 0;
  }

  let streak = 0;
  while (activeDays.has(key())) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function buildDailyStudyMinutes(
  sessions: StudySessionRow[],
  timeZone: string,
  days = 7
): Array<{ date: string; minutes: number; hours: number }> {
  const todayKey = localDateKey(new Date(), timeZone);
  const cursor = new Date(`${todayKey}T12:00:00Z`);
  const rows = Array.from({ length: days }, (_, index) => {
    const date = new Date(cursor);
    date.setUTCDate(date.getUTCDate() - index);
    return { date: localDateKey(date, timeZone), minutes: 0, hours: 0 };
  }).reverse();
  const byDate = new Map(rows.map((row) => [row.date, row]));

  for (const interval of mergeStudyIntervals(sessions)) {
    const key = localDateKey(interval.start, timeZone);
    const row = byDate.get(key);
    if (row) row.minutes += Math.round((interval.end - interval.start) / 60_000);
  }
  return rows.map((row) => ({ ...row, hours: Math.round((row.minutes / 60) * 10) / 10 }));
}
