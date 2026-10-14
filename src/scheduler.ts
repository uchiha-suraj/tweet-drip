export const LIMITS = {
  maxPerDay: 15,
  minDays: 1,
  maxDays: 3,
  minInterval: 30, // hard floor, in minutes
  maxInterval: 240,
  maxChars: 280,
};

const MIN = 60_000;
const DAY_MIN = 24 * 60;

/** Returns an error message, or null when the plan is valid. */
export function validatePlan(count: number, days: number, intervalMin: number): string | null {
  if (days < LIMITS.minDays || days > LIMITS.maxDays) {
    return `Pick between ${LIMITS.minDays} and ${LIMITS.maxDays} days.`;
  }
  if (count < 1) return 'Add at least one tweet.';
  const max = LIMITS.maxPerDay * days;
  if (count > max) {
    return `That's too many! Max is ${max} tweets in ${days} day${days > 1 ? 's' : ''} (15/day).`;
  }
  if (intervalMin < LIMITS.minInterval) {
    return `Tweets must be at least ${LIMITS.minInterval} min apart.`;
  }
  const perDay = Math.ceil(count / days);
  if (perDay * intervalMin > DAY_MIN) {
    const fit = Math.floor(DAY_MIN / perDay);
    return `${perDay} tweets a day with ${intervalMin}-min gaps won't fit in 24h. Try ${fit} min or less.`;
  }
  return null;
}

/**
 * Random times for `count` tweets spread over `days` × 24h, starting a couple of
 * minutes from `from`. Any two consecutive tweets are at least `intervalMin` apart.
 *
 * Tweets are split evenly across the days (so no day exceeds 15). Inside each
 * day we pick n random offsets from the "slack" (window minus the mandatory
 * gaps), sort them, then add i × gap back. That gives uniformly random times
 * that can never violate the minimum gap.
 */
export function generateTimes(
  count: number,
  days: number,
  intervalMin: number,
  from: number = Date.now(),
): number[] {
  const start = Math.ceil(from / MIN) * MIN + 2 * MIN;
  const base = Math.floor(count / days);
  const extra = count % days;
  const times: number[] = [];
  let prevMin = -Infinity; // minutes since `start`

  for (let d = 0; d < days; d++) {
    const n = base + (d < extra ? 1 : 0);
    if (n === 0) continue;
    const winStart = Math.max(d * DAY_MIN, prevMin + intervalMin);
    const winEnd = (d + 1) * DAY_MIN;
    const slack = Math.max(0, winEnd - winStart - (n - 1) * intervalMin);
    const offsets = Array.from({ length: n }, () => Math.floor(Math.random() * (slack + 1))).sort(
      (a, b) => a - b,
    );
    offsets.forEach((o, i) => {
      const m = winStart + o + i * intervalMin;
      times.push(start + m * MIN);
      prevMin = m;
    });
  }
  return times;
}

export function averageGapLabel(count: number, days: number): string {
  if (count <= 1) return 'just one tweet';
  const mins = Math.round((days * DAY_MIN) / count);
  return `≈ 1 tweet every ${formatDuration(mins * MIN)}`;
}

export function formatDuration(ms: number, withSeconds = false): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (withSeconds) {
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  }
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function dayLabel(ts: number, now: number = Date.now()): string {
  const d = new Date(ts);
  const today = new Date(now);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(today)) / (DAY_MIN * MIN));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
