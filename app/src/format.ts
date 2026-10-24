const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday", "Mon 12 Oct" */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export const timeOfDay = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const clock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/** "Saturday, 24 October" */
export function fullDate(d = new Date()): string {
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const rest = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return `${weekday}, ${rest}`;
}

/** "today", "2d ago", "3w ago" */
export function ago(iso: string): string {
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / DAY_MS);
  if (days <= 0) return 'today';
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}
