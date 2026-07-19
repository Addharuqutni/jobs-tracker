import type { ApplicationStatus, JobSource } from '../types';

export const SOURCES: JobSource[] = ['jobstreet', 'linkedin', 'kalibrr', 'glints', 'dealls'];

export const SOURCE_LABELS: Record<JobSource, string> = {
  jobstreet: 'JobStreet',
  linkedin: 'LinkedIn',
  kalibrr: 'Kalibrr',
  glints: 'Glints',
  dealls: 'Dealls',
};

export const SOURCE_BADGE_CLASSES: Record<JobSource, string> = {
  jobstreet: 'bg-blue-500/10 text-blue-700',
  linkedin: 'bg-blue-500/10 text-blue-700',
  kalibrr: 'bg-purple-500/10 text-purple-600',
  glints: 'bg-amber-500/10 text-amber-500',
  dealls: 'bg-red-500/10 text-red-600',
};

export const SOURCE_DOT_CLASSES: Record<JobSource, string> = {
  jobstreet: 'bg-blue-400',
  linkedin: 'bg-blue-600',
  kalibrr: 'bg-purple-400',
  glints: 'bg-amber-500',
  dealls: 'bg-red-500',
};

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'interview',
  'rejected',
  'offered',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interview: 'Interview',
  rejected: 'Rejected',
  offered: 'Offered',
};

export const STATUS_COLORS: Record<
  ApplicationStatus,
  { badge: string; column: string; dot: string }
> = {
  wishlist: {
    badge: 'bg-blue-500/10 text-blue-700',
    column: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  applied: {
    badge: 'bg-amber-500/10 text-amber-500',
    column: 'border-amber-500/40',
    dot: 'bg-amber-500',
  },
  interview: {
    badge: 'bg-green-500/10 text-green-500',
    column: 'border-green-500/30',
    dot: 'bg-green-500',
  },
  offered: {
    badge: 'bg-green-500/10 text-green-500',
    column: 'border-green-500/40',
    dot: 'bg-green-500',
  },
  rejected: {
    badge: 'bg-red-500/10 text-red-600',
    column: 'border-red-500/30',
    dot: 'bg-red-500',
  },
};

export const KANBAN_COLUMN_ORDER: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'interview',
  'offered',
  'rejected',
];

const API_BASE_URL =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ??
  'http://localhost:3001/api';

export { API_BASE_URL };
