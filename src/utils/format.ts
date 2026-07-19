const JAKARTA_TZ = 'Asia/Jakarta';

/** SQLite datetime('now') is UTC without zone: "YYYY-MM-DD HH:MM:SS". Treat as UTC. */
export function parseTimestamp(dateStr: string): Date {
  const sqliteUtc = dateStr.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?$/);
  if (sqliteUtc) {
    return new Date(`${sqliteUtc[1]}T${sqliteUtc[2]}Z`);
  }
  return new Date(dateStr);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = parseTimestamp(dateStr);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: JAKARTA_TZ,
  });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = parseTimestamp(dateStr);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const d = date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: JAKARTA_TZ,
  });
  const t = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: JAKARTA_TZ,
  });
  return `${d} ${t} WIB`;
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = parseTimestamp(dateStr);
  if (Number.isNaN(date.getTime())) return 'N/A';

  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;

  return formatDate(dateStr);
}

export function formatRate(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function orNa(value: string | null | undefined): string {
  if (!value || value.trim() === '') return 'N/A';
  return value;
}
